// POST /api/lieux-create — Créer un lieu (admin)
const db = require('./_db/index');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (req.headers['x-api-key'] !== process.env.API_SECRET_KEY) return res.status(401).json({ error: 'Unauthorized' });

  const { nom, latitude, longitude, rayon_metres, adresse_complete, description, cree_par } = req.body;

  if (!nom || latitude === undefined || longitude === undefined || !rayon_metres || !cree_par) {
    return res.status(400).json({ success: false, error: 'Champs obligatoires manquants : nom, latitude, longitude, rayon_metres, cree_par' });
  }
  if (rayon_metres < 50 || rayon_metres > 5000) {
    return res.status(400).json({ success: false, error: 'rayon_metres doit être entre 50 et 5000' });
  }

  try {
    const lieu = await db.createLieu({ nom, latitude, longitude, rayon_metres, adresse_complete, description, cree_par });
    res.status(201).json({ success: true, lieu });
  } catch (err) {
    console.error('POST /api/lieux-create:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};
