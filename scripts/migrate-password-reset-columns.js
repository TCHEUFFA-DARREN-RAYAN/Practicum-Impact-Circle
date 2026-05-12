/**
 * Adds Users.resetPasswordToken and Users.resetPasswordExpires if missing.
 * Uses the same .env and SSL settings as the app (works with Aiven, local MySQL, etc.).
 *
 *   node scripts/migrate-password-reset-columns.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { sequelize, User } = require('../src/models/index');

async function columnExists(tableName, columnName) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = :tableName
       AND COLUMN_NAME = :columnName`,
    { replacements: { tableName, columnName } }
  );
  return Number(rows[0].c) > 0;
}

async function main() {
  const raw = User.getTableName();
  const tableName = typeof raw === 'string' ? raw : raw.tableName;
  const qid = sequelize.getQueryInterface().queryGenerator.quoteIdentifier.bind(
    sequelize.getQueryInterface().queryGenerator
  );
  const qTable = qid(tableName);

  await sequelize.authenticate();
  console.log('Connected. Migrating table:', tableName);

  if (!(await columnExists(tableName, 'resetPasswordToken'))) {
    await sequelize.query(`ALTER TABLE ${qTable} ADD COLUMN resetPasswordToken VARCHAR(255) NULL`);
    console.log('  + resetPasswordToken');
  } else {
    console.log('  (resetPasswordToken already exists)');
  }

  if (!(await columnExists(tableName, 'resetPasswordExpires'))) {
    await sequelize.query(`ALTER TABLE ${qTable} ADD COLUMN resetPasswordExpires DATETIME NULL`);
    console.log('  + resetPasswordExpires');
  } else {
    console.log('  (resetPasswordExpires already exists)');
  }

  await sequelize.close();
  console.log('Migration finished. Restart the app; the schema warning should be gone.');
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
