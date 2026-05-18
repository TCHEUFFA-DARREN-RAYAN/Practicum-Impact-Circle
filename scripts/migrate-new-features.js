/**
 * Migration script to add new tables and columns for:
 * - QR Attendance tracking
 * - Organization roles
 * - Volunteer profile extra fields (gender, country, backgroundCheckStatus)
 *
 * Run: node scripts/migrate-new-features.js
 */
require('dotenv').config();
const { sequelize } = require('../src/config/db');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database.');

    // Add new columns to VolunteerProfiles
    const vpCols = [
      "ALTER TABLE VolunteerProfiles ADD COLUMN IF NOT EXISTS gender VARCHAR(30) DEFAULT NULL",
      "ALTER TABLE VolunteerProfiles ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT NULL",
      "ALTER TABLE VolunteerProfiles ADD COLUMN IF NOT EXISTS backgroundCheckStatus ENUM('not_submitted','pending','approved','expired') DEFAULT 'not_submitted'",
      "ALTER TABLE VolunteerProfiles ADD COLUMN IF NOT EXISTS backgroundCheckExpiry DATE DEFAULT NULL",
      "ALTER TABLE VolunteerProfiles ADD COLUMN IF NOT EXISTS backgroundCheckReminded DATETIME DEFAULT NULL",
    ];

    for (const sql of vpCols) {
      try {
        await sequelize.query(sql);
        console.log('  OK:', sql.substring(0, 60) + '...');
      } catch (e) {
        if (e.message.includes('Duplicate column')) console.log('  SKIP (exists):', sql.substring(0, 50));
        else console.warn('  WARN:', e.message);
      }
    }

    // Create Attendances table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS Attendances (
        id INT AUTO_INCREMENT PRIMARY KEY,
        gigId INT NOT NULL,
        volunteerId INT NOT NULL,
        checkInAt DATETIME NOT NULL,
        checkOutAt DATETIME DEFAULT NULL,
        hoursWorked FLOAT DEFAULT NULL,
        autoCheckedOut TINYINT(1) DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_att_gig (gigId),
        INDEX idx_att_vol (volunteerId)
      )
    `);
    console.log('  OK: Attendances table');

    // Create GigQrCodes table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS GigQrCodes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        gigId INT NOT NULL UNIQUE,
        token VARCHAR(64) NOT NULL UNIQUE,
        isActive TINYINT(1) DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_qr_token (token)
      )
    `);
    console.log('  OK: GigQrCodes table');

    // Create OrgRoles table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS OrgRoles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        orgId INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        permissions JSON DEFAULT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_orgrole_org (orgId)
      )
    `);
    console.log('  OK: OrgRoles table');

    // Create OrgMembers table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS OrgMembers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        orgId INT NOT NULL,
        userId INT DEFAULT NULL,
        roleId INT DEFAULT NULL,
        inviteEmail VARCHAR(191) DEFAULT NULL,
        status ENUM('active','invited','removed') DEFAULT 'invited',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_orgmem_org (orgId),
        INDEX idx_orgmem_user (userId)
      )
    `);
    console.log('  OK: OrgMembers table');

    console.log('\nMigration complete!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
