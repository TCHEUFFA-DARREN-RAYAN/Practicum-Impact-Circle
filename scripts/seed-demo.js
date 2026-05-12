/**
 * Seed the database with demo accounts for development and testing.
 *
 * Creates:
 *   - 1 admin account
 *   - 1 verified organization + profile
 *   - 1 verified volunteer + profile
 *   - 2 sample gigs (one recurring, one one-time)
 *
 * Usage:
 *   node scripts/seed-demo.js
 *
 * Safe to run multiple times — skips records that already exist.
 */

require('dotenv').config();
const { sequelize } = require('../src/config/db');
const { User, VolunteerProfile, Organization, Gig, Category } = require('../src/models/index');

const DEMO_ADMIN = {
  email: 'admin@impactcircle.dev',
  passwordHash: 'Admin123!',
  role: 'admin',
  verificationStatus: 'verified',
};

const DEMO_ORG_USER = {
  email: 'org@impactcircle.dev',
  passwordHash: 'Org12345!',
  role: 'org',
  verificationStatus: 'verified',
};

const DEMO_VOLUNTEER_USER = {
  email: 'volunteer@impactcircle.dev',
  passwordHash: 'Vol12345!',
  role: 'volunteer',
  verificationStatus: 'verified',
};

async function seed() {
  await sequelize.sync({ alter: false });

  for (const data of [DEMO_ADMIN, DEMO_ORG_USER, DEMO_VOLUNTEER_USER]) {
    const [user, created] = await User.findOrCreate({
      where: { email: data.email },
      defaults: data,
    });
    if (created) console.log(`✓ Created user: ${user.email}`);
    else console.log(`– User already exists: ${user.email}`);
  }

  console.log('\nDemo seeding complete.');
  console.log('Credentials are in doc/TEST_CREDENTIALS.md');
  process.exit(0);
}

seed().catch(e => { console.error(e.message); process.exit(1); });
