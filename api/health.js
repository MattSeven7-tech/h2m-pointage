// GET /api/health — Diagnostic temporaire (supprimer après debug)
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  const key = process.env.API_SECRET_KEY;
  res.status(200).json({
    ok: true,
    apiKey: {
      configured: !!key,
      length: key ? key.length : 0,
      preview: key ? key.substring(0, 4) + '...' : 'NOT_SET',
    },
    airtable: {
      hasApiKey: !!process.env.AIRTABLE_API_KEY,
      apiKeyPreview: process.env.AIRTABLE_API_KEY ? process.env.AIRTABLE_API_KEY.substring(0, 6) + '...' : 'NOT_SET',
      hasBaseId: !!process.env.AIRTABLE_BASE_ID,
      baseIdPreview: process.env.AIRTABLE_BASE_ID ? process.env.AIRTABLE_BASE_ID.substring(0, 6) + '...' : 'NOT_SET',
      tableLieux: process.env.AIRTABLE_TABLE_LIEUX || 'NOT_SET',
      tablePointages: process.env.AIRTABLE_TABLE_POINTAGES || 'NOT_SET',
      tableEmployes: process.env.AIRTABLE_TABLE_EMPLOYES || 'NOT_SET',
    },
  });
};
