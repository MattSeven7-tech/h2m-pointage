// GET /api/health — Diagnostic temporaire
const db = require('./_db/index');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  const key = process.env.API_SECRET_KEY;

  let airtableTest = 'not_tested';
  let airtableError = null;
  try {
    const employes = await db.getEmployes();
    airtableTest = 'ok';
    airtableTest = 'ok_count_' + employes.length;
  } catch (err) {
    airtableTest = 'error';
    airtableError = err.message || String(err);
  }

  res.status(200).json({
    ok: true,
    apiKey: {
      configured: !!key,
      length: key ? key.length : 0,
    },
    airtable: {
      hasApiKey: !!process.env.AIRTABLE_API_KEY,
      hasBaseId: !!process.env.AIRTABLE_BASE_ID,
      tableLieux: process.env.AIRTABLE_TABLE_LIEUX || 'NOT_SET',
      tableEmployes: process.env.AIRTABLE_TABLE_EMPLOYES || 'NOT_SET',
      test: airtableTest,
      error: airtableError,
    },
  });
};
