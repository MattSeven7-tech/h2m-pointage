// /public/admin.js — Logique page admin

let lieux = [];
let employes = [];
let editMode = false;

document.addEventListener('DOMContentLoaded', async () => {
  initOnglets();
  await chargerLieux();
  await chargerEmployes();
  initFormLieu();
  initFiltresHistorique();
  setDatesFiltresDefaut();
});

// ── Onglets ──────────────────────────────────────────────
function initOnglets() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.hidden = true);
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).hidden = false;
    });
  });
}

// ── Lieux ────────────────────────────────────────────────
async function chargerLieux() {
  try {
    const data = await apiFetch('/api/lieux');
    lieux = data.lieux;
    renderLieux();
  } catch (err) {
    document.getElementById('lieux-list').innerHTML = '<p class="error-msg">Erreur chargement des lieux.</p>';
  }
}

function renderLieux() {
  const container = document.getElementById('lieux-list');
  if (!lieux.length) {
    container.innerHTML = '<p class="empty-msg">Aucun lieu configuré. Créez le premier lieu.</p>';
    return;
  }
  container.innerHTML = lieux.map(l => {
    const statut = l.actif ? '<span class="badge badge-active">Actif</span>' : '<span class="badge badge-inactive">Inactif</span>';
    const gmapUrl = 'https://www.google.com/maps?q=' + l.latitude + ',' + l.longitude;
    return '<div class="lieu-item" data-id="' + l.id + '">' +
      '<div class="lieu-item-header">' +
        '<strong>' + escHtml(l.nom) + '</strong>' + statut +
      '</div>' +
      '<div class="lieu-item-details">' +
        '<span>' + escHtml(l.adresse || 'Adresse non renseignée') + '</span>' +
        '<span>Rayon : ' + l.rayon_metres + 'm</span>' +
        '<a href="' + gmapUrl + '" target="_blank" class="link-gmap">Vérifier sur Google Maps ↗</a>' +
      '</div>' +
      '<div class="lieu-item-actions">' +
        '<button onclick="editLieu(' + JSON.stringify(l.id) + ')" class="btn btn-secondary btn-xs">Modifier</button>' +
        (l.actif
          ? '<button onclick="desactiverLieu(' + JSON.stringify(l.id) + ')" class="btn btn-danger btn-xs">Désactiver</button>'
          : '<button onclick="reactiverLieu(' + JSON.stringify(l.id) + ')" class="btn btn-ghost btn-xs">Réactiver</button>') +
      '</div>' +
    '</div>';
  }).join('');
}

function initFormLieu() {
  document.getElementById('btn-nouveau-lieu').addEventListener('click', () => {
    editMode = false;
    document.getElementById('lieu-edit-id').value = '';
    document.getElementById('form-lieu-title').textContent = 'Nouveau lieu';
    ['nom', 'adresse', 'lat', 'lon', 'rayon', 'desc'].forEach(k => {
      const el = document.getElementById('lieu-' + k + '-input');
      if (el) el.value = k === 'rayon' ? '150' : '';
    });
    document.getElementById('gmap-link').hidden = true;
    document.getElementById('form-lieu-error').hidden = true;
    document.getElementById('form-lieu').hidden = false;
    document.getElementById('form-lieu').scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('btn-cancel-lieu').addEventListener('click', () => {
    document.getElementById('form-lieu').hidden = true;
  });

  document.getElementById('btn-gps-lieu').addEventListener('click', () => {
    if (!navigator.geolocation) { alert('GPS non disponible'); return; }
    const btn = document.getElementById('btn-gps-lieu');
    btn.textContent = 'Localisation...'; btn.disabled = true;
    navigator.geolocation.getCurrentPosition((pos) => {
      document.getElementById('lieu-lat-input').value = pos.coords.latitude.toFixed(6);
      document.getElementById('lieu-lon-input').value = pos.coords.longitude.toFixed(6);
      btn.textContent = '📍 Ma position GPS'; btn.disabled = false;
      updateGmapLink();
    }, () => {
      btn.textContent = '📍 Ma position GPS'; btn.disabled = false;
      alert('Impossible d obtenir la position GPS.');
    });
  });

  document.getElementById('lieu-lat-input').addEventListener('input', updateGmapLink);
  document.getElementById('lieu-lon-input').addEventListener('input', updateGmapLink);

  document.getElementById('btn-save-lieu').addEventListener('click', saveLieu);
}

function updateGmapLink() {
  const lat = document.getElementById('lieu-lat-input').value;
  const lon = document.getElementById('lieu-lon-input').value;
  const el = document.getElementById('gmap-link');
  if (lat && lon) {
    el.innerHTML = '<a href="https://www.google.com/maps?q=' + lat + ',' + lon + '" target="_blank" class="link-gmap">Vérifier sur Google Maps ↗</a>';
    el.hidden = false;
  } else {
    el.hidden = true;
  }
}

function editLieu(id) {
  const lieu = lieux.find(l => l.id === id);
  if (!lieu) return;
  editMode = true;
  document.getElementById('lieu-edit-id').value = id;
  document.getElementById('form-lieu-title').textContent = 'Modifier le lieu';
  document.getElementById('lieu-nom-input').value = lieu.nom;
  document.getElementById('lieu-adresse-input').value = lieu.adresse || '';
  document.getElementById('lieu-lat-input').value = lieu.latitude;
  document.getElementById('lieu-lon-input').value = lieu.longitude;
  document.getElementById('lieu-rayon-input').value = lieu.rayon_metres;
  document.getElementById('lieu-desc-input').value = lieu.description || '';
  document.getElementById('form-lieu-error').hidden = true;
  document.getElementById('form-lieu').hidden = false;
  updateGmapLink();
  document.getElementById('form-lieu').scrollIntoView({ behavior: 'smooth' });
}

async function saveLieu() {
  const errorEl = document.getElementById('form-lieu-error');
  errorEl.hidden = true;
  const nom = document.getElementById('lieu-nom-input').value.trim();
  const lat = parseFloat(document.getElementById('lieu-lat-input').value);
  const lon = parseFloat(document.getElementById('lieu-lon-input').value);
  const rayon = parseInt(document.getElementById('lieu-rayon-input').value);
  const adresse = document.getElementById('lieu-adresse-input').value.trim();
  const desc = document.getElementById('lieu-desc-input').value.trim();

  if (!nom || isNaN(lat) || isNaN(lon) || isNaN(rayon)) {
    errorEl.textContent = 'Remplissez tous les champs obligatoires (*)';
    errorEl.hidden = false; return;
  }
  if (rayon < 50 || rayon > 5000) {
    errorEl.textContent = 'Le rayon doit être entre 50 et 5000 mètres';
    errorEl.hidden = false; return;
  }

  const btn = document.getElementById('btn-save-lieu');
  btn.disabled = true; btn.textContent = 'Enregistrement...';

  try {
    if (editMode) {
      const id = document.getElementById('lieu-edit-id').value;
      await apiFetch('/api/lieux-update', {
        method: 'PATCH',
        body: JSON.stringify({ id, nom, latitude: lat, longitude: lon, rayon_metres: rayon, adresse_complete: adresse, description: desc }),
      });
    } else {
      const employe = store.get('employe') || { email: 'admin@h2mexpress.fr' };
      await apiFetch('/api/lieux-create', {
        method: 'POST',
        body: JSON.stringify({ nom, latitude: lat, longitude: lon, rayon_metres: rayon, adresse_complete: adresse, description: desc, cree_par: employe.email }),
      });
    }
    document.getElementById('form-lieu').hidden = true;
    await chargerLieux();
  } catch (err) {
    errorEl.textContent = 'Erreur : ' + err.message;
    errorEl.hidden = false;
  }
  btn.disabled = false; btn.textContent = 'Enregistrer';
}

async function desactiverLieu(id) {
  if (!confirm('Désactiver ce lieu ? Les employés ne pourront plus pointer ici.')) return;
  try {
    await apiFetch('/api/lieux-delete', { method: 'DELETE', body: JSON.stringify({ id }) });
    await chargerLieux();
  } catch (err) { alert('Erreur : ' + err.message); }
}

async function reactiverLieu(id) {
  try {
    await apiFetch('/api/lieux-update', { method: 'PATCH', body: JSON.stringify({ id, actif: true }) });
    await chargerLieux();
  } catch (err) { alert('Erreur : ' + err.message); }
}

// ── Employés ─────────────────────────────────────────────
async function chargerEmployes() {
  try {
    const data = await apiFetch('/api/employes');
    employes = data.employes;
    const select = document.getElementById('filter-employe');
    employes.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.email;
      opt.textContent = (e.prenom + ' ' + e.nom).trim();
      select.appendChild(opt);
    });
  } catch (err) {}
}

// ── Historique ───────────────────────────────────────────
function setDatesFiltresDefaut() {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  document.getElementById('filter-date-debut').value = weekAgo;
  document.getElementById('filter-date-fin').value = today;
}

function initFiltresHistorique() {
  document.getElementById('btn-filtrer').addEventListener('click', chargerHistorique);
}

async function chargerHistorique() {
  const dateDebut = document.getElementById('filter-date-debut').value;
  const dateFin = document.getElementById('filter-date-fin').value;
  const email = document.getElementById('filter-employe').value;
  const statut = document.getElementById('filter-statut').value;

  if (!dateDebut || !dateFin) { alert('Sélectionnez une période'); return; }

  const tableEl = document.getElementById('historique-table');
  tableEl.innerHTML = '<div class="loading">Chargement...</div>';

  const params = new URLSearchParams({ date_debut: dateDebut, date_fin: dateFin + 'T23:59:59Z', ...(email && { employe_email: email }), ...(statut && { statut }) });

  try {
    const data = await apiFetch('/api/pointages-list?' + params.toString());

    document.getElementById('compteurs').hidden = false;
    document.getElementById('cpt-total').textContent = data.total;
    document.getElementById('cpt-valides').textContent = data.valides;
    document.getElementById('cpt-refuses').textContent = data.refuses;

    if (!data.pointages.length) {
      tableEl.innerHTML = '<p class="empty-msg">Aucun pointage pour cette période.</p>';
      return;
    }

    const rows = data.pointages.map(p => {
      const statutClass = p.statut_validation === 'Validé' ? 'badge-active' : 'badge-inactive';
      return '<tr>' +
        '<td>' + escHtml(p.employe_nom || p.employe_email) + '</td>' +
        '<td>' + escHtml(p.lieu_nom || '') + '</td>' +
        '<td>' + escHtml(p.type) + '</td>' +
        '<td>' + formatDateTime(p.timestamp) + '</td>' +
        '<td>' + (p.distance_metres !== null ? p.distance_metres + 'm' : '—') + '</td>' +
        '<td><span class="badge ' + statutClass + '">' + escHtml(p.statut_validation) + '</span></td>' +
        '<td>' + (p.gps_accuracy ? '±' + p.gps_accuracy + 'm' : '—') + '</td>' +
      '</tr>';
    }).join('');

    tableEl.innerHTML = '<table class="pointages-table">' +
      '<thead><tr><th>Employé</th><th>Lieu</th><th>Type</th><th>Horodatage</th><th>Distance</th><th>Statut</th><th>Précision GPS</th></tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
      '</table>';
  } catch (err) {
    tableEl.innerHTML = '<p class="error-msg">Erreur : ' + err.message + '</p>';
  }
}

// ── Utils ────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
