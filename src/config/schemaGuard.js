/**
 * Catches drift between Sequelize models and the real MySQL schema, and
 * auto-applies safe ALTER TABLE ADD COLUMN statements for known nullable columns.
 */

const TABLE_MIGRATIONS = [
  {
    name: 'Conversations',
    ddl: `CREATE TABLE IF NOT EXISTS \`Conversations\` (
      \`id\` INT PRIMARY KEY AUTO_INCREMENT,
      \`user1Id\` INT NOT NULL,
      \`user2Id\` INT NOT NULL,
      \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  },
  {
    name: 'ChatMessages',
    ddl: `CREATE TABLE IF NOT EXISTS \`ChatMessages\` (
      \`id\` INT PRIMARY KEY AUTO_INCREMENT,
      \`conversationId\` INT NOT NULL,
      \`senderId\` INT NOT NULL,
      \`body\` TEXT NOT NULL,
      \`isRead\` TINYINT(1) NOT NULL DEFAULT 0,
      \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  },
];

const COLUMN_MIGRATIONS = [
  {
    table: 'Users',
    column: 'resetPasswordToken',
    ddl: 'ALTER TABLE `Users` ADD COLUMN `resetPasswordToken` VARCHAR(255) NULL',
  },
  {
    table: 'Users',
    column: 'resetPasswordExpires',
    ddl: 'ALTER TABLE `Users` ADD COLUMN `resetPasswordExpires` DATETIME NULL',
  },
  {
    table: 'Users',
    column: 'avatarUrl',
    ddl: 'ALTER TABLE `Users` ADD COLUMN `avatarUrl` VARCHAR(255) NULL',
  },
  {
    table: 'VolunteerProfiles',
    column: 'resumeUrl',
    ddl: 'ALTER TABLE `VolunteerProfiles` ADD COLUMN `resumeUrl` VARCHAR(255) NULL',
  },
  {
    table: 'VolunteerProfiles',
    column: 'bio',
    ddl: 'ALTER TABLE `VolunteerProfiles` ADD COLUMN `bio` TEXT NULL',
  },
];

async function assertUserResetColumns(sequelize) {
  for (const { name, ddl } of TABLE_MIGRATIONS) {
    try {
      await sequelize.query(ddl);
      console.log(`  Schema: ensured table ${name}`);
    } catch (e) {
      console.warn(`  Schema: could not ensure table ${name}: ${e.message}`);
    }
  }
  const tableGroups = {};
  COLUMN_MIGRATIONS.forEach(m => {
    if (!tableGroups[m.table]) tableGroups[m.table] = [];
    tableGroups[m.table].push(m.column);
  });

  const allColumns = COLUMN_MIGRATIONS.map(m => `'${m.column}'`).join(', ');
  const allTables = Object.keys(tableGroups).map(t => `'${t}'`).join(', ');

  const [rows] = await sequelize.query(
    `SELECT TABLE_NAME AS tbl, COLUMN_NAME AS col FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME IN (${allTables})
       AND COLUMN_NAME IN (${allColumns})`
  );

  const found = new Set((rows || []).map(r => `${r.tbl}:${r.col}`.toLowerCase()));

  for (const { table, column, ddl } of COLUMN_MIGRATIONS) {
    const key = `${table}:${column}`.toLowerCase();
    if (!found.has(key)) {
      try {
        await sequelize.query(ddl);
        console.log(`  Schema: added column ${table}.${column}`);
      } catch (e) {
        if (!e.message.includes('Duplicate column')) {
          console.warn(`  Schema: could not add ${table}.${column}: ${e.message}`);
        }
      }
    }
  }
}

module.exports = { assertUserResetColumns };
