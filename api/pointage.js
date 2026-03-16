// POST /api/pointage — Enregistrer un pointage (avec vérification geofencing)
const db = require('./_db/index');

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (req.headers['x-api-key'] !== process.env.API_SECRET_KEY) return res.status(401).json({ error: 'Unauthorized' });

  const { employe_email, employe_nom, type, latitude, longitude, accuracy, lieu_id, commentaire } = req.body;

  // 1. Valider champs obligatoires
  if (!employe_email || !employe_nom || !type || latitude === undefined || longitude === undefined || accuracy === undefined || !lieu_id) {
    return res.status(400).json({ success: false, error: 'Champs obligatoires manquants' });
  }
  if (!['Entrée', 'Sortie'].includes(type)) {
    return res.status(400).json({ success: false, error: 'type doit être "Entrée" ou "Sortie"' });
  }

  try {
    // 2. Récupérer le lieu
    const lieu = await db.getLieuById(lieu_id);
    if (!lieu) {
      return res.status(404).json({ success: false, error: 'Lieu introuvable' });
    }

    // 3. Calculer la distance
    const distance = Math.round(haversineDistance(latitude, longitude, lieu.latitude, lieu.longitude));

    const timestamp = new Date().toISOString();
    let statut_validation;
    let message;

    // 4. Vérifier la précision GPS
    if (accuracy > 200) {
      statut_validation = 'Refusé_GPS_imprécis';
      message = `GPS trop imprécis (précision : ${Math.round(accuracy)}m). Déplacez-vous en extérieur et réessayez.`;
    }
    // 5. Vérifier la zone
    else if (distance > lieu.rayon_metres) {
      statut_validation = 'Refusé_hors_zone';
      message = `Vous êtes à ${distance}m du lieu. Distance max autorisée : ${lieu.rayon_metres}m.`;
    }
    // 6. Pointage validé
    else {
      statut_validation = 'Validé';
      const heure = new Date(timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
      message = `Pointage ${type} enregistré à ${heure} — ${lieu.nom}`;
    }

    // 7. Enregistrer dans la DB — TOUJOURS, quel que soit le statut
    const source = req.headers['user-agent']?.includes('Mobile') ? 'PWA_mobile' : 'Web_desktop';
    await db.createPointage({
      employe_email,
      employe_nom,
      lieu_id,
      type,
      timestamp,
      latitude,
      longitude,
      distance_metres: distance,
      gps_accuracy: Math.round(accuracy),
      statut_validation,
      source,
      commentaire: commentaire?.slice(0, 120) || '',
    });

    // 8. Retourner la réponse
    if (statut_validation === 'Validé') {
      return res.status(200).json({ success: true, statut: statut_validation, distance_metres: distance, message, timestamp });
    } else if (statut_validation === 'Refusé_hors_zone') {
      return res.status(200).json({ success: false, statut: statut_validation, distance_metres: distance, rayon_metres: lieu.rayon_metres, message });
    } else {
      return res.status(200).json({ success: false, statut: statut_validation, accuracy: Math.round(accuracy), message });
    }

  } catch (err) {
    console.error('POST /api/pointage:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};
