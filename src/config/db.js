const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

const dbPassword = process.env.DB_PASS || process.env.DB_PASSWORD || '';
const sslEnabled = String(process.env.DB_SSL_ENABLED || 'false').toLowerCase() === 'true';
const sslCaPath = process.env.DB_SSL_CA_PATH;
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
    await sequelize.sync({ alter: true });
    console.log('  Tables synced');
  } catch (err) {
    console.error('  MySQL connection failed:', err.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
