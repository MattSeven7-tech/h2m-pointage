// /api/_db/index.js
// Point d'entrée unique pour toutes les opérations DB.
// Les fonctions /api/*.js appellent UNIQUEMENT ce module.

const airtable = require('./airtable');
// const supabase = require('./supabase'); // À décommenter pour MyDispatch

const DB = process.env.DB_PROVIDER || 'airtable';
const db = DB === 'supabase' ? null : airtable;

module.exports = {
  // Lieux
  getLieux:          ()        => db.getLieux(),
  getLieuById:       (id)      => db.getLieuById(id),
  createLieu:        (data)    => db.createLieu(data),
  updateLieu:        (id, d)   => db.updateLieu(id, d),
  deleteLieu:        (id)      => db.deleteLieu(id),

  // Pointages
  createPointage:    (data)    => db.createPointage(data),
  getPointages:      (filters) => db.getPointages(filters),

  // Employés
  getEmployes:       ()        => db.getEmployes(),
  getEmployeByEmail: (email)   => db.getEmployeByEmail(email),
};
