require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

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
const messageRoutes = require('./src/routes/messages');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.NODE_ENV === 'production' ? process.env.CLIENT_URL : '*' }));
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
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
app.use('/api/messages', messageRoutes);

app.use('/api', auditLog);

/** Legacy role-picker removed; keep bookmarks working */
app.get('/register', (req, res) => {
  res.redirect(302, '/register-volunteer');
});

const pages = [
  // ── Public pages (no login required) ──
  ['/', 'index.html'],
  ['/about', 'pages/about.html'],
  ['/how-it-works', 'pages/how-it-works.html'],
  ['/volunteers', 'pages/volunteers.html'],
  ['/organizations', 'pages/organizations.html'],
  ['/categories', 'pages/categories.html'],
  ['/upcoming-shifts', 'pages/upcoming-shifts.html'],
  ['/contact', 'pages/contact.html'],
  ['/faq', 'pages/faq.html'],
  ['/privacy-policy', 'pages/privacy-policy.html'],
  ['/terms', 'pages/terms.html'],
  ['/accessibility', 'pages/accessibility.html'],
  ['/login', 'pages/login.html'],
  ['/forgot-password', 'pages/forgot-password.html'],
  ['/reset-password', 'pages/reset-password.html'],
  ['/register-volunteer', 'pages/register-volunteer.html'],
  ['/register-org', 'pages/register-org.html'],

  // ── Volunteer dashboard (logged in) ──
  ['/volunteer-dashboard', 'pages/volunteer-dashboard.html'],
  ['/volunteer-profile', 'pages/volunteer-profile.html'],
  ['/volunteer/settings', 'pages/volunteer-settings.html'],
  ['/volunteer/applications', 'pages/volunteer-applications.html'],
  ['/volunteer/matches', 'pages/gig-list.html'],
  ['/volunteer/schedule', 'pages/volunteer-schedule.html'],
  ['/volunteer/impact', 'pages/volunteer-impact.html'],
  ['/messages', 'pages/messages.html'],

  // ── Organization dashboard (logged in) ──
  ['/org-dashboard', 'pages/org-dashboard.html'],
  ['/org-gig-create', 'pages/org-gig-create.html'],
  ['/org/analytics', 'pages/org-analytics.html'],
  ['/org/application/:id', 'pages/org-application-detail.html'],
  ['/org/volunteers', 'pages/org-volunteers.html'],
  ['/org/settings', 'pages/org-settings.html'],
  ['/org/schedule', 'pages/org-schedule.html'],
  ['/org/opportunities', 'pages/org-opportunities.html'],
  ['/org/applications', 'pages/org-applications.html'],

  // ── Opportunity detail ──
  ['/gigs', 'pages/gig-list.html'],
  ['/gigs/:id', 'pages/gig-detail.html'],

  // ── Admin panel ──
  ['/admin', 'pages/admin-dashboard.html'],
  ['/admin/users', 'pages/admin-users.html'],
  ['/admin/organizations', 'pages/admin-organizations.html'],
  ['/admin/opportunities', 'pages/admin-opportunities.html'],
  ['/admin/events', 'pages/admin-events.html'],
  ['/admin/verify', 'pages/admin-verify.html'],
  ['/admin/categories', 'pages/admin-categories.html'],
  ['/admin/analytics', 'pages/admin-analytics.html'],
  ['/admin/announcements', 'pages/admin-announcements.html'],
  ['/admin/settings', 'pages/admin-settings.html'],
  ['/admin/calendar', 'pages/admin-calendar.html'],
  ['/admin/gigs/:id/applicants', 'pages/admin-gig-applicants.html'],
];

pages.forEach(([route, file]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', file));
  });
});

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found.' });
  }
  res.status(404).sendFile(path.join(__dirname, 'public', 'pages', '404.html'));
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
  if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
      console.log(`\n  ImpactCircle running → http://localhost:${PORT}`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}\n`);
      require('./src/services/autoApproval').start();
    });
  }
}

startServer();

module.exports = app;
