// GET /api/health — Diagnostic temporaire (supprimer après debug)
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  const key = process.env.API_SECRET_KEY;
  res.status(200).json({
    ok: true,
    keyConfigured: !!key,
    keyLength: key ? key.length : 0,
    keyPreview: key ? key.substring(0, 4) + '...' : 'NOT_SET',
  });
};
