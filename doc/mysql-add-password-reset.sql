-- Password-reset columns on Users (Sequelize model expects these).
-- Idempotent: safe to run multiple times.
--
-- Option A — uses .env + SSL (best for Aiven / cloud MySQL):
--   npm run migrate:password-reset
--
-- Option B — mysql CLI:
--   mysql -u root -p impactcircle < doc/mysql-add-password-reset.sql

SET @db = DATABASE();

-- resetPasswordToken
SET @exist := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'resetPasswordToken'
);
SET @sqlstmt := IF(@exist > 0, 'SELECT 1', 'ALTER TABLE Users ADD COLUMN resetPasswordToken VARCHAR(255) NULL');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- resetPasswordExpires
SET @exist := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'resetPasswordExpires'
);
SET @sqlstmt := IF(@exist > 0, 'SELECT 1', 'ALTER TABLE Users ADD COLUMN resetPasswordExpires DATETIME NULL');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
