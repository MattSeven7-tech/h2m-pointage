// PATCH /api/lieux-update — Modifier un lieu (admin) — PATCH partiel
const db = require('./_db/index');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });
  if (req.headers['x-api-key'] !== process.env.API_SECRET_KEY) return res.status(401).json({ error: 'Unauthorized' });

  const { id, ...updates } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'Champ id obligatoire' });
  if (updates.rayon_metres !== undefined && (updates.rayon_metres < 50 || updates.rayon_metres > 5000)) {
    return res.status(400).json({ success: false, error: 'rayon_metres doit être entre 50 et 5000' });
  }

  try {
    const lieu = await db.updateLieu(id, updates);
    res.status(200).json({ success: true, lieu });
  } catch (err) {
    console.error('PATCH /api/lieux-update:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};
