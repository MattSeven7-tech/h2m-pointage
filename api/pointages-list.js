// GET /api/pointages-list — Historique des pointages (admin)
const db = require('./_db/index');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (req.headers['x-api-key'] !== process.env.API_SECRET_KEY) return res.status(401).json({ error: 'Unauthorized' });

  const { date_debut, date_fin, employe_email, statut, limit } = req.query;

  if (!date_debut || !date_fin) {
    return res.status(400).json({ success: false, error: 'date_debut et date_fin sont obligatoires' });
  }

  const limitVal = Math.min(parseInt(limit) || 100, 500);

  try {
    const pointages = await db.getPointages({ date_debut, date_fin, employe_email, statut, limit: limitVal });
    const total = pointages.length;
    const valides = pointages.filter(p => p.statut_validation === 'Validé').length;
    const refuses = total - valides;

    res.status(200).json({ success: true, pointages, total, valides, refuses });
  } catch (err) {
    console.error('GET /api/pointages-list:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};
