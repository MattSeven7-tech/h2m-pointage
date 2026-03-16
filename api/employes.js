// GET /api/employes — Liste des employés actifs
const db = require('./_db/index');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (req.headers['x-api-key'] !== process.env.API_SECRET_KEY) {
    return res.status(401).json({
      error: 'Unauthorized',
      debug: {
        receivedLength: (req.headers['x-api-key'] || '').length,
        expectedLength: (process.env.API_SECRET_KEY || '').length,
        receivedPreview: req.headers['x-api-key'] ? req.headers['x-api-key'].substring(0, 4) + '...' : 'none',
      }
    });
  }

  try {
    const employes = await db.getEmployes();
    res.status(200).json({ success: true, employes });
  } catch (err) {
    console.error('GET /api/employes:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};
