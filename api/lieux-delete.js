// DELETE /api/lieux-delete — Soft delete d'un lieu (admin)
const db = require('./_db/index');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });
  if (req.headers['x-api-key'] !== process.env.API_SECRET_KEY) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'Champ id obligatoire' });

  try {
    const lieu = await db.deleteLieu(id);
    res.status(200).json({ success: true, lieu, message: 'Lieu désactivé' });
  } catch (err) {
    console.error('DELETE /api/lieux-delete:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};
