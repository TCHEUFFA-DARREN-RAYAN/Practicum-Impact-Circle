require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const { connectDB } = require('./src/config/db');
require('./src/models/index');
const errorHandler = require('./src/middleware/errorHandler');
const auditLog = require('./src/middleware/auditLog');
const { requireAuth } = require('./src/middleware/auth');

const authRoutes = require('./src/routes/auth');
const volunteerRoutes = require('./src/routes/volunteers');
const orgRoutes = require('./src/routes/organizations');
const gigRoutes = require('./src/routes/gigs');
const taskRoutes = require('./src/routes/tasks');
const rewardRoutes = require('./src/routes/rewards');
const notificationRoutes = require('./src/routes/notifications');
const adminRoutes = require('./src/routes/admin');
const csrRoutes = require('./src/routes/csr');
const publicRoutes = require('./src/routes/public');
const uploadRoutes = require('./src/routes/uploads');

const app = express();

connectDB();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.NODE_ENV === 'production' ? process.env.CLIENT_URL : '*' }));
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, message: 'Too many attempts, try again in 15 minutes.' } });

app.use(globalLimiter);

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/orgs', orgRoutes);
app.use('/api/gigs', gigRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/csr', csrRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/uploads', uploadRoutes);

app.use('/api', auditLog);

const pages = [
  ['/', 'index.html'],
  ['/login', 'pages/login.html'],
  ['/register', 'pages/register.html'],
  ['/register-volunteer', 'pages/register-volunteer.html'],
  ['/register-org', 'pages/register-org.html'],
  ['/register-csr', 'pages/register-csr.html'],
  ['/volunteer-profile', 'pages/volunteer-profile.html'],
  ['/volunteer-dashboard', 'pages/volunteer-dashboard.html'],
  ['/gigs', 'pages/gig-list.html'],
  ['/gigs/:id', 'pages/gig-detail.html'],
  ['/rewards', 'pages/rewards.html'],
  ['/org-dashboard', 'pages/org-dashboard.html'],
  ['/org-gig-create', 'pages/org-gig-create.html'],
  ['/admin', 'pages/admin-dashboard.html'],
  ['/admin/verify', 'pages/admin-verify.html'],
  ['/admin/categories', 'pages/admin-categories.html'],
  ['/admin/rewards', 'pages/admin-rewards.html'],
  ['/admin/disputes', 'pages/admin-disputes.html'],
  ['/admin/audit', 'pages/admin-audit.html'],
  ['/admin/analytics', 'pages/admin-analytics.html'],
  ['/csr-dashboard', 'pages/csr-dashboard.html'],
];

pages.forEach(([route, file]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', file));
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n  ImpactCircle running → http://localhost:${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}\n`);
    require('./src/services/autoApproval').start();
  });
}

module.exports = app;
