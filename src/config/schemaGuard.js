/**
 * Catches drift between Sequelize models and the real MySQL schema early.
 *
 * Example: User model defines resetPasswordToken / resetPasswordExpires but the
 * DB was never migrated → every User.findOne (including POST /api/auth/login)
 * fails with: Unknown column 'resetPasswordToken' in 'field list'
 */
const USERS_TABLE = 'Users';
const REQUIRED_USER_COLUMNS = ['resetPasswordToken', 'resetPasswordExpires'];

async function assertUserResetColumns(sequelize) {
  const [rows] = await sequelize.query(
    `SELECT COLUMN_NAME AS name FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = :table
       AND COLUMN_NAME IN ('resetPasswordToken', 'resetPasswordExpires')`,
    { replacements: { table: USERS_TABLE } }
  );
  const found = new Set(rows.map((r) => String(r.name).toLowerCase()));
  const missing = REQUIRED_USER_COLUMNS.filter((c) => !found.has(c.toLowerCase()));
  if (missing.length === 0) return;

  const msg = [
    '',
    '  ═══════════════════════════════════════════════════════════════════',
    '  SCHEMA MISMATCH: `' + USERS_TABLE + '` is missing column(s): ' + missing.join(', '),
    '  Login and other user queries will fail until you migrate the database.',
    '',
    '  Fix (pick one):',
    '    npm run migrate:password-reset',
    '    mysql -u <DB_USER> -p <DB_NAME> < doc/mysql-add-password-reset.sql',
    '',
    '  Or paste the SQL from doc/mysql-add-password-reset.sql into your MySQL client.',
    '  ═══════════════════════════════════════════════════════════════════',
    '',
  ].join('\n');

  console.error(msg);
}

module.exports = { assertUserResetColumns };
