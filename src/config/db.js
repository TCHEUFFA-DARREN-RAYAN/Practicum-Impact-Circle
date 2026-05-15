const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
const { assertUserResetColumns } = require('./schemaGuard');

const dbPassword = process.env.DB_PASS || process.env.DB_PASSWORD || '';
const sslEnabled = String(process.env.DB_SSL_ENABLED || 'false').toLowerCase() === 'true';
const sslCaPath = process.env.DB_SSL_CA_PATH;
const syncAlterEnabled = String(process.env.DB_SYNC_ALTER || 'false').toLowerCase() === 'true';
const forceSyncAlter = String(process.env.FORCE_DB_SYNC_ALTER || 'false').toLowerCase() === 'true';
const isLocalDbHost = ['localhost', '127.0.0.1'].includes((process.env.DB_HOST || '').toLowerCase());
const isDevEnv = (process.env.NODE_ENV || 'development') === 'development';
const dialectOptions = sslEnabled
  ? {
      ssl: {
        require: true,
        rejectUnauthorized: true,
        ...(sslCaPath ? { ca: fs.readFileSync(path.resolve(process.cwd(), sslCaPath), 'utf8') } : {}),
      },
    }
  : undefined;

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  dbPassword,
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    dialectOptions,
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
    define: { timestamps: true, underscored: false },
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('  MySQL connected');
    try {
      await assertUserResetColumns(sequelize);
    } catch (e) {
      console.warn('  Schema guard skipped:', e.message);
    }
    if (syncAlterEnabled && (forceSyncAlter || (isDevEnv && isLocalDbHost))) {
      await sequelize.sync();
      console.log('  Tables synced (create if not exists)');
    } else if (syncAlterEnabled && !forceSyncAlter) {
      console.log('  Schema sync blocked for safety (set FORCE_DB_SYNC_ALTER=true to override)');
    } else {
      console.log('  Schema sync skipped (set DB_SYNC_ALTER=true to enable)');
    }
  } catch (err) {
    console.error('  MySQL connection failed:', err.message);
    const parent = err.parent || err.original;
    const errno = parent?.errno;
    const code = parent?.code;
    if (code === 'ECONNREFUSED' || String(err.message || '').includes('ECONNREFUSED')) {
      console.error('  Hint: MySQL is not accepting connections on this host/port. Start MySQL (Windows: Services), or run `docker compose up -d` from the project root.');
    } else if (errno === 1045 || /Access denied for user/i.test(err.message || '')) {
      console.error('  Hint: Wrong DB_USER or DB_PASS. If the password has # ! or spaces, wrap the whole value in double quotes in .env, e.g. DB_PASS="your!pass".');
    } else if (errno === 1049 || /Unknown database/i.test(err.message || '')) {
      console.error(`  Hint: Create the database first, e.g. CREATE DATABASE ${process.env.DB_NAME || 'impactcircle'} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    } else if (errno === 2003 || /Can't connect to MySQL/i.test(err.message || '')) {
      console.error('  Hint: Check DB_HOST and DB_PORT. Remote hosts often need DB_SSL_ENABLED=true and a CA path (see doc/DEPLOYMENT.md).');
    }
    throw err;
  }
};

module.exports = { sequelize, connectDB };
