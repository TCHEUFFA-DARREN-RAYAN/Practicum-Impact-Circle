/**
 * Run this script once after adding new model columns to sync the database schema.
 *
 * Usage:
 *   node scripts/sync-db.js
 *
 * It uses Sequelize's { alter: true } which adds/modifies columns without
 * dropping existing data.
 */

require('dotenv').config();
const { sequelize } = require('../src/config/db');
require('../src/models/index');

(async () => {
  try {
    console.log('Syncing database schema (alter: true)…');
    await sequelize.sync({ alter: true });
    console.log('✓ Database schema is up to date.');
    process.exit(0);
  } catch (err) {
    console.error('✗ DB sync failed:', err.message);
    process.exit(1);
  }
})();
