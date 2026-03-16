// /public/app.js — Logique page employé

const ACCURACY_LIMIT = 200;
const GPS_TIMEOUT_MS = 10000;
const BTN_COOLDOWN_MS = 5000;

let lieux = [];
let lieuActif = null;
let positionActuelle = null;
let deferredInstallPrompt = null;
let submitting = false;

document.addEventListener('DOMContentLoaded', async () => {
  if (!navigator.onLine) {
    document.getElementById('offline-notice').hidden = false;
    return;
  }
  const employe = store.get('employe');
  if (!employe) { afficherModalEmail(); } else { demarrerApp(employe); }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    document.getElementById('pwa-banner').hidden = false;
  });
  document.getElementById('btn-install')?.addEventListener('click', installerPWA);
  document.getElementById('btn-close-banner')?.addEventListener('click', () => {
    document.getElementById('pwa-banner').hidden = true;
  });
});

function afficherModalEmail() {
  document.getElementById('modal-email').hidden = false;
  document.getElementById('app').hidden = true;
  document.getElementById('btn-valider-email').addEventListener('click', validerEmail);
  document.getElementById('input-email').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') validerEmail();
  });
}

async function validerEmail() {
  const email = document.getElementById('input-email').value.trim().toLowerCase();
  const errorEl = document.getElementById('email-error');
  errorEl.hidden = true;
  if (!email || !email.includes('@')) {
    errorEl.textContent = 'Adresse email invalide';
    errorEl.hidden = false;
    return;
  }
  const btn = document.getElementById('btn-valider-email');
  btn.disabled = true;
  btn.textContent = 'Vérification...';
  try {
    const data = await apiFetch('/api/employes');
    const emp = data.employes.find(e => e.email.toLowerCase() === email);
    if (!emp) {
      errorEl.textContent = 'Email non reconnu. Contactez votre responsable.';
      errorEl.hidden = false;
      btn.disabled = false;
      btn.textContent = 'Valider';
      return;
    }
    store.set('employe', emp);
    document.getElementById('modal-email').hidden = true;
    demarrerApp(emp);
  } catch (err) {
    errorEl.textContent = 'Erreur de connexion. Réessayez.';
    errorEl.hidden = false;
    btn.disabled = false;
    btn.textContent = 'Valider';
  }
}

async function demarrerApp(employe) {
  document.getElementById('app').hidden = false;
  document.getElementById('employe-prenom').textContent = employe.prenom || employe.nom;
  demarrerHorloge();
  afficherDernierPointage();
  try {
    const data = await apiFetch('/api/lieux');
    lieux = data.lieux;
    if (!lieux.length) {
      setLieuInfo('Aucun lieu disponible', 'Contactez votre responsable', false);
      return;
    }
  } catch (err) {
    setLieuInfo('Service indisponible', 'Réessayez dans 30 secondes', false);
    return;
  }
  demarrerGPS();
  document.getElementById('btn-entree').addEventListener('click', () => pointer('Entrée'));
  document.getElementById('btn-sortie').addEventListener('click', () => pointer('Sortie'));
  document.getElementById('input-commentaire').addEventListener('input', (e) => {
    document.getElementById('char-left').textContent = 120 - e.target.value.length;
  });
}

function demarrerHorloge() {
  const el = document.getElementById('horloge');
  const maj = () => { el.textContent = formatTime(new Date()); };
  maj(); setInterval(maj, 1000);
}

function demarrerGPS() {
  if (!navigator.geolocation) { setGPSStatus('error', 'GPS non disponible sur cet appareil'); return; }
  let timeoutHandle = setTimeout(() => {
    setGPSStatus('error', 'GPS trop lent. Déplacez-vous en extérieur et réessayez.');
  }, GPS_TIMEOUT_MS);
  const options = { enableHighAccuracy: true, timeout: GPS_TIMEOUT_MS, maximumAge: 5000 };
  navigator.geolocation.watchPosition(
    (position) => {
      clearTimeout(timeoutHandle);
      positionActuelle = position.coords;
      mettreAJourZone(position.coords);
    },
    (err) => {
      clearTimeout(timeoutHandle);
      let msg = 'Erreur GPS';
      if (err.code === 1) msg = 'GPS refusé. Autorisez la localisation dans les réglages.';
      else if (err.code === 2) msg = 'GPS indisponible. Déplacez-vous en extérieur.';
      else if (err.code === 3) msg = 'GPS trop lent. Réessayez en extérieur.';
      setGPSStatus('error', msg);
    }, options
  );
}

function mettreAJourZone(coords) {
  const { latitude, longitude, accuracy } = coords;
  if (accuracy > ACCURACY_LIMIT) {
    setGPSStatus('warning', 'GPS imprécis (±' + Math.round(accuracy) + 'm)');
    setGPSAccuracy('Précision insuffisante : ' + Math.round(accuracy) + 'm — Déplacez-vous en extérieur');
    setZone(false, 'GPS imprécis', 'Précision insuffisante pour pointer');
    activerBoutons(false);
    return;
  }
  setGPSStatus('ok', 'Position détectée ✅');
  setGPSAccuracy('Précision : ±' + Math.round(accuracy) + 'm');

  let plusProche = null, distMin = Infinity;
  for (const lieu of lieux) {
    const dist = haversineDistance(latitude, longitude, lieu.latitude, lieu.longitude);
    if (dist < distMin) { distMin = dist; plusProche = lieu; }
  }
  lieuActif = plusProche;
  const distArrondie = Math.round(distMin);
  const dansZone = distMin <= plusProche.rayon_metres;
  setLieuInfo(plusProche.nom, plusProche.adresse, dansZone);

  const distEl = document.getElementById('distance-info');
  distEl.hidden = false;
  if (dansZone) {
    distEl.className = 'distance-info dist-ok';
    distEl.textContent = 'Dans la zone ✅ — ' + distArrondie + 'm du centre (rayon ' + plusProche.rayon_metres + 'm)';
  } else {
    distEl.className = 'distance-info dist-nok';
    distEl.textContent = 'Hors zone ❌ — ' + distArrondie + 'm du lieu (rayon autorisé : ' + plusProche.rayon_metres + 'm)';
  }
  activerBoutons(dansZone);
}

async function pointer(type) {
  if (submitting || !positionActuelle || !lieuActif) return;
  submitting = true;
  activerBoutons(false);
  const employe = store.get('employe');
  const commentaire = document.getElementById('input-commentaire').value.trim();
  try {
    const data = await apiFetch('/api/pointage', {
      method: 'POST',
      body: JSON.stringify({
        employe_email: employe.email,
        employe_nom:   (employe.prenom + ' ' + employe.nom).trim(),
        type, latitude: positionActuelle.latitude, longitude: positionActuelle.longitude,
        accuracy: positionActuelle.accuracy, lieu_id: lieuActif.id, commentaire,
      }),
    });
    afficherResultat(data);
    if (data.success) {
      store.set('dernier_pointage', { type, heure: formatTime(new Date()), lieu: lieuActif.nom });
      afficherDernierPointage();
      document.getElementById('input-commentaire').value = '';
      document.getElementById('char-left').textContent = '120';
    }
  } catch (err) {
    afficherResultat({ success: false, message: 'Service indisponible, réessayez dans 30 secondes.' });
  }
  setTimeout(() => { submitting = false; if (positionActuelle) mettreAJourZone(positionActuelle); }, BTN_COOLDOWN_MS);
}

function setGPSStatus(state, label) {
  const classes = { ok: 'dot-ok', warning: 'dot-warning', error: 'dot-error' };
  document.getElementById('gps-icon').className = 'gps-dot ' + (classes[state] || 'dot-waiting');
  document.getElementById('gps-label').textContent = label;
}
function setGPSAccuracy(text) { const el = document.getElementById('gps-accuracy'); el.textContent = text; el.hidden = false; }
function setLieuInfo(nom, adresse, dansZone) {
  document.getElementById('lieu-nom').textContent = nom;
  document.getElementById('lieu-adresse').textContent = adresse || '';
  document.getElementById('zone-dot').className = 'zone-dot ' + (dansZone ? 'dot-ok' : 'dot-nok');
}
function setZone(dansZone, nom, adresse) { setLieuInfo(nom, adresse, dansZone); document.getElementById('distance-info').hidden = true; }
function activerBoutons(actif) {
  document.getElementById('btn-entree').disabled = !actif;
  document.getElementById('btn-sortie').disabled = !actif;
}
function afficherResultat(data) {
  const el = document.getElementById('msg-result');
  el.hidden = false;
  el.className = 'msg-result ' + (data.success ? 'msg-ok' : 'msg-nok');
  el.textContent = data.message || (data.success ? 'Pointage enregistré' : 'Pointage refusé');
  setTimeout(() => { el.hidden = true; }, 8000);
}
function afficherDernierPointage() {
  const dp = store.get('dernier_pointage');
  const el = document.getElementById('dernier-pointage');
  if (dp) {
    el.textContent = 'Dernier pointage : ' + dp.type + ' à ' + dp.heure + ' — ' + dp.lieu;
    el.hidden = false;
  }
}
async function installerPWA() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  if (outcome === 'accepted') { document.getElementById('pwa-banner').hidden = true; deferredInstallPrompt = null; }
}
