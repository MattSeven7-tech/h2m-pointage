// /api/_db/airtable.js
// Implémentation Airtable pour H2M Express

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID          = process.env.AIRTABLE_BASE_ID;
const T_LIEUX          = process.env.AIRTABLE_TABLE_LIEUX;
const T_POINTAGES      = process.env.AIRTABLE_TABLE_POINTAGES;
const T_EMPLOYES       = process.env.AIRTABLE_TABLE_EMPLOYES;

const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}`;

const headers = {
  'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
  'Content-Type': 'application/json',
};

function mapLieu(record) {
  return {
    id:           record.id,
    nom:          record.fields.Nom,
    description:  record.fields.Description || '',
    latitude:     record.fields.Latitude,
    longitude:    record.fields.Longitude,
    rayon_metres: record.fields.Rayon_metres,
    adresse:      record.fields.Adresse_complete || '',
    actif:        record.fields.Actif || false,
    cree_par:     record.fields.Cree_par || '',
  };
}

function mapPointage(record) {
  return {
    id:                record.id,
    employe_email:     record.fields.Employe_email,
    employe_nom:       record.fields.Employe_nom,
    lieu_id:           record.fields.Lieu ? record.fields.Lieu[0] : null,
    lieu_nom:          record.fields.Lieu_nom ? record.fields.Lieu_nom[0] : '',
    type:              record.fields.Type,
    timestamp:         record.fields.Timestamp,
    distance_metres:   record.fields.Distance_metres,
    gps_accuracy:      record.fields.GPS_accuracy,
    statut_validation: record.fields.Statut_validation,
    source:            record.fields.Source || 'PWA_mobile',
    commentaire:       record.fields.Commentaire || '',
  };
}

async function getLieux() {
  const filter = encodeURIComponent('{Actif}=1');
  const res = await fetch(`${BASE_URL}/${T_LIEUX}?filterByFormula=${filter}`, { headers });
  if (!res.ok) throw new Error(`Airtable getLieux: ${res.status}`);
  const data = await res.json();
  return data.records.map(mapLieu);
}

async function getLieuById(id) {
  const res = await fetch(`${BASE_URL}/${T_LIEUX}/${id}`, { headers });
  if (!res.ok) throw new Error(`Airtable getLieuById: ${res.status}`);
  const data = await res.json();
  return mapLieu(data);
}

async function createLieu(lieu) {
  const res = await fetch(`${BASE_URL}/${T_LIEUX}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      fields: {
        Nom:              lieu.nom,
        Description:      lieu.description || '',
        Latitude:         lieu.latitude,
        Longitude:        lieu.longitude,
        Rayon_metres:     lieu.rayon_metres,
        Adresse_complete: lieu.adresse_complete || '',
        Actif:            true,
        Cree_par:         lieu.cree_par,
      },
    }),
  });
  if (!res.ok) throw new Error(`Airtable createLieu: ${res.status}`);
  const data = await res.json();
  return mapLieu(data);
}

async function updateLieu(id, updates) {
  const fields = {};
  if (updates.nom              !== undefined) fields.Nom              = updates.nom;
  if (updates.latitude         !== undefined) fields.Latitude         = updates.latitude;
  if (updates.longitude        !== undefined) fields.Longitude        = updates.longitude;
  if (updates.rayon_metres     !== undefined) fields.Rayon_metres     = updates.rayon_metres;
  if (updates.actif            !== undefined) fields.Actif            = updates.actif;
  if (updates.adresse_complete !== undefined) fields.Adresse_complete = updates.adresse_complete;
  if (updates.description      !== undefined) fields.Description      = updates.description;

  const res = await fetch(`${BASE_URL}/${T_LIEUX}/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`Airtable updateLieu: ${res.status}`);
  const data = await res.json();
  return mapLieu(data);
}

async function deleteLieu(id) {
  return updateLieu(id, { actif: false });
}

async function createPointage(p) {
  const res = await fetch(`${BASE_URL}/${T_POINTAGES}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      fields: {
        Employe_email:     p.employe_email,
        Employe_nom:       p.employe_nom,
        Lieu:              [p.lieu_id],
        Type:              p.type,
        Timestamp:         p.timestamp,
        Latitude_employe:  p.latitude,
        Longitude_employe: p.longitude,
        Distance_metres:   p.distance_metres,
        GPS_accuracy:      p.gps_accuracy,
        Statut_validation: p.statut_validation,
        Source:            p.source || 'PWA_mobile',
        Commentaire:       p.commentaire || '',
      },
    }),
  });
  if (!res.ok) throw new Error(`Airtable createPointage: ${res.status}`);
  const data = await res.json();
  return mapPointage(data);
}

async function getPointages(filters = {}) {
  const conditions = [];
  if (filters.employe_email) conditions.push(`{Employe_email}="${filters.employe_email}"`);
  if (filters.statut)        conditions.push(`{Statut_validation}="${filters.statut}"`);
  if (filters.date_debut)    conditions.push(`IS_AFTER({Timestamp},"${filters.date_debut}")`);
  if (filters.date_fin)      conditions.push(`IS_BEFORE({Timestamp},"${filters.date_fin}")`);

  const formula = conditions.length > 1
    ? `AND(${conditions.join(',')})`
    : conditions[0] || '';

  const params = new URLSearchParams({
    ...(formula && { filterByFormula: formula }),
    sort: JSON.stringify([{ field: 'Timestamp', direction: 'desc' }]),
    maxRecords: String(filters.limit || 100),
  });

  const res = await fetch(`${BASE_URL}/${T_POINTAGES}?${params}`, { headers });
  if (!res.ok) throw new Error(`Airtable getPointages: ${res.status}`);
  const data = await res.json();
  return data.records.map(mapPointage);
}

async function getEmployes() {
  const filter = encodeURIComponent('{Actif}=1');
  const res = await fetch(`${BASE_URL}/${T_EMPLOYES}?filterByFormula=${filter}`, { headers });
  if (!res.ok) throw new Error(`Airtable getEmployes: ${res.status}`);
  const data = await res.json();
  return data.records.map(r => ({
    id:     r.id,
    email:  r.fields.Email,
    nom:    r.fields.Nom,
    prenom: r.fields.Prenom,
    role:   r.fields.Role,
  }));
}

async function getEmployeByEmail(email) {
  const filter = encodeURIComponent(`{Email}="${email}"`);
  const res = await fetch(`${BASE_URL}/${T_EMPLOYES}?filterByFormula=${filter}`, { headers });
  if (!res.ok) throw new Error(`Airtable getEmployeByEmail: ${res.status}`);
  const data = await res.json();
  if (!data.records.length) return null;
  const r = data.records[0];
  return { id: r.id, email: r.fields.Email, nom: r.fields.Nom, prenom: r.fields.Prenom, role: r.fields.Role };
}

module.exports = {
  getLieux, getLieuById, createLieu, updateLieu, deleteLieu,
  createPointage, getPointages,
  getEmployes, getEmployeByEmail,
};
