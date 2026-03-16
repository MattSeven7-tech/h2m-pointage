// GET /api/lieux — Liste des lieux de pointage actifs
const db = require('./_db/index');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (req.headers['x-api-key'] !== process.env.API_SECRET_KEY) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const lieux = await db.getLieux();
    res.status(200).json({ success: true, lieux });
  } catch (err) {
    console.error('GET /api/lieux:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};
