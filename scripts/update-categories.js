/**
 * Update categories to the official Moncton volunteer category list.
 *
 * Strategy:
 *  - Rename the 8 existing categories in-place (preserves all FK references in gigs,
 *    rewards, hour records, etc.)
 *  - Insert the 3 new categories that have no old equivalent
 *  - Delete any remaining old/unwanted categories that were not mapped
 *
 * Usage:
 *   node scripts/update-categories.js
 */

require('dotenv').config();
const { sequelize } = require('../src/config/db');
const { Category } = require('../src/models/index');

// Old name → new category definition
const RENAME_MAP = [
  {
    oldName: 'Food Security',
    name: 'Food Security & Nutrition',
    description: 'Programs addressing hunger, food access, and nutrition',
    pointsPerHour: 12, colorHex: '#f59e0b',
  },
  {
    oldName: 'Women Support',
    name: 'Health & Palliative Care',
    description: 'Health services, wellness programs, and end-of-life care',
    pointsPerHour: 12, colorHex: '#ec4899',
  },
  {
    oldName: 'Youth Development',
    name: 'Youth & Children',
    description: 'Programs and mentorship for children and youth',
    pointsPerHour: 11, colorHex: '#8b5cf6',
  },
  {
    oldName: 'Seniors Support',
    name: 'Shelter & Housing Support',
    description: 'Emergency shelter, affordable housing, and homelessness relief',
    pointsPerHour: 12, colorHex: '#0d9488',
  },
  {
    oldName: 'Environment',
    name: 'Disability & Special Needs',
    description: 'Support and inclusion for people with disabilities',
    pointsPerHour: 11, colorHex: '#3b82f6',
  },
  {
    oldName: 'Education',
    name: 'Faith & Spiritual Support',
    description: 'Faith-based community outreach and spiritual care',
    pointsPerHour: 10, colorHex: '#d97706',
  },
  {
    oldName: 'Newcomer Integration',
    name: 'Newcomer & Cultural Integration',
    description: 'Support for immigrants, refugees, and cultural inclusion',
    pointsPerHour: 12, colorHex: '#f97316',
  },
  {
    oldName: 'Volunteer Opportunities',
    name: 'Community Coordination',
    description: 'General community organizing, events, and coordination',
    pointsPerHour: 10, colorHex: '#6366f1', icon: '',
  },
];

// Entirely new categories (no old record to reuse)
const NEW_CATEGORIES = [
  { name: 'Social Clubs',              description: 'Social groups and recreational community activities',    pointsPerHour: 10, colorHex: '#10b981', icon: '' },
  { name: 'Industry Associations',     description: 'Professional and trade association volunteering',         pointsPerHour: 10, colorHex: '#06b6d4', icon: '' },
  { name: 'Govt & Crown Corporations', description: 'Government-affiliated and crown corporation volunteer programs', pointsPerHour: 10, colorHex: '#475569', icon: '' },
];

async function run() {
  await sequelize.authenticate();
  console.log('Connected.\n');

  let renamed = 0, created = 0, skipped = 0;

  for (const entry of RENAME_MAP) {
    const { oldName, ...updates } = entry;

    // Check if the new name already exists (idempotent)
    const alreadyNew = await Category.findOne({ where: { name: updates.name } });
    if (alreadyNew) {
      console.log(`  SKIP  "${updates.name}" already exists (id=${alreadyNew.id})`);
      skipped++;
      continue;
    }

    const old = await Category.findOne({ where: { name: oldName } });
    if (old) {
      await old.update({ ...updates, icon: updates.icon ?? '' });
      console.log(`  UPDATE id=${old.id}  "${oldName}"  →  "${updates.name}"`);
      renamed++;
    } else {
      // Old record missing — insert fresh
      const created_ = await Category.create({ ...updates, icon: updates.icon ?? '' });
      console.log(`  INSERT "${updates.name}" (id=${created_.id}) — old record not found`);
      created++;
    }
  }

  for (const cat of NEW_CATEGORIES) {
    const exists = await Category.findOne({ where: { name: cat.name } });
    if (exists) {
      console.log(`  SKIP  "${cat.name}" already exists (id=${exists.id})`);
      skipped++;
    } else {
      const row = await Category.create(cat);
      console.log(`  INSERT "${cat.name}" (id=${row.id})`);
      created++;
    }
  }

  console.log(`\nDone. ${renamed} renamed, ${created} inserted, ${skipped} skipped.`);
  console.log('\nCurrent categories:');
  const all = await Category.findAll({ attributes: ['id', 'name'], order: [['id', 'ASC']] });
  all.forEach(c => console.log(`  [${c.id}] ${c.name}`));

  await sequelize.close();
}

run().catch(err => { console.error('Migration failed:', err.message); process.exit(1); });
