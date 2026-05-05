const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
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
