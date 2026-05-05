require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { sequelize } = require('../config/db');
require('../models/index');

const { User, VolunteerProfile, Organization, CsrPartner, Category, Gig, Reward, VolunteerCategoryHours } = require('../models/index');

const CATEGORIES = [
  { name: 'Food Security',          description: 'Programs addressing hunger and food access',          pointsPerHour: 12, colorHex: '#f59e0b', icon: '' },
  { name: 'Women Support',          description: 'Services empowering women and girls',                 pointsPerHour: 11, colorHex: '#ec4899', icon: '' },
  { name: 'Youth Development',      description: 'Programs for children and youth',                     pointsPerHour: 11, colorHex: '#8b5cf6', icon: '' },
  { name: 'Seniors Support',        description: 'Assistance for elderly community members',            pointsPerHour: 12, colorHex: '#06b6d4', icon: '' },
  { name: 'Environment',            description: 'Environmental stewardship and sustainability',        pointsPerHour: 10, colorHex: '#10b981', icon: '' },
  { name: 'Education',              description: 'Literacy, skill-building, and learning programs',     pointsPerHour: 11, colorHex: '#3b82f6', icon: '' },
  { name: 'Newcomer Integration',   description: 'Support for immigrants and refugees',                 pointsPerHour: 12, colorHex: '#f97316', icon: '' },
  { name: 'Volunteer Opportunities',description: 'General platform-driven volunteer coordination',      pointsPerHour: 10, colorHex: '#6366f1', icon: '⭐' },
];

const seed = async () => {
  try {
    await sequelize.authenticate();
    console.log(' Connected to MySQL');

    await sequelize.sync({ alter: true });
    console.log(' Tables synced');

    // Categories
    const catMap = {};
    for (const cat of CATEGORIES) {
      const [record] = await Category.upsert(cat, { conflictFields: ['name'] });
      const found = await Category.findOne({ where: { name: cat.name } });
      catMap[cat.name] = found.id;
      console.log(`   Category: ${cat.name} (id=${found.id})`);
    }

    // Admin user
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@impactcircle.ca';
    const adminPass = process.env.ADMIN_PASS || 'Admin@123456';
    const [adminUser, createdAdmin] = await User.findOrCreate({
      where: { email: adminEmail },
      defaults: { passwordHash: adminPass, role: 'admin', verificationStatus: 'verified' },
    });
    if (createdAdmin) console.log(`   Admin: ${adminEmail}`);
    else console.log(`  ℹ Admin already exists: ${adminEmail}`);

    // Demo Org
    const orgEmail = 'moncton-cares@demo.com';
    let orgUser = await User.findOne({ where: { email: orgEmail } });
    let org;
    if (!orgUser) {
      orgUser = await User.create({ email: orgEmail, passwordHash: 'Demo@123456', role: 'org', verificationStatus: 'verified' });
      org = await Organization.create({
        userId: orgUser.id,
        orgName: 'Moncton Cares',
        missionStatement: 'Building a stronger, more connected Greater Moncton community.',
        categories: [catMap['Food Security'], catMap['Youth Development']],
        contactName: 'Ketan Raval',
        contactEmail: 'ketan@monctoncares.ca',
        address: '123 Main Street, Moncton, NB',
        website: 'https://monctoncares.ca',
      });
      console.log(`   Org: ${orgEmail}`);
    } else {
      org = await Organization.findOne({ where: { userId: orgUser.id } });
    }

    // Demo Gigs
    const gigCount = await Gig.count({ where: { orgId: org.id } });
    if (gigCount === 0) {
      await Gig.bulkCreate([
        {
          orgId: org.id, title: 'Food Bank Sorting Volunteers',
          description: 'Help sort and package food donations at the Moncton Food Bank. No experience necessary — just bring your energy and good attitude!',
          categoryId: catMap['Food Security'],
          startDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          endDate: new Date(Date.now() + 8 * 86400000).toISOString().split('T')[0],
          estimatedHours: 4, locationType: 'in-person', locationAddress: '56 Church St, Moncton, NB',
          requiredSkills: ['Physical stamina', 'Teamwork'], verifiedOnly: false, status: 'open',
        },
        {
          orgId: org.id, title: 'After-School Tutoring Program',
          description: 'Support students with homework and learning in a safe, structured environment. Ideal for education students or graduates who want to make a real difference.',
          categoryId: catMap['Youth Development'],
          startDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
          endDate: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
          estimatedHours: 2, locationType: 'in-person', locationAddress: '200 Lutz St, Moncton, NB',
          requiredSkills: ['Teaching', 'Patience'], verifiedOnly: true, status: 'open',
        },
        {
          orgId: org.id, title: 'Community Garden Cleanup',
          description: 'Virtual planning and coordination for our annual community garden project. Help plan plots, coordinate volunteers, and document progress from anywhere.',
          categoryId: catMap['Environment'],
          startDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
          endDate: new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0],
          estimatedHours: 3, locationType: 'remote', locationAddress: '',
          requiredSkills: ['Organization', 'Communication'], verifiedOnly: false, status: 'open',
        },
      ]);
      console.log('   Demo gigs created');
    }

    // Demo Volunteer
    const volEmail = 'volunteer@demo.com';
    let volUser = await User.findOne({ where: { email: volEmail } });
    if (!volUser) {
      volUser = await User.create({ email: volEmail, passwordHash: 'Demo@123456', role: 'volunteer', verificationStatus: 'verified' });
      const profile = await VolunteerProfile.create({
        userId: volUser.id,
        firstName: 'Alex', lastName: 'Demo',
        phone: '506-555-0001', address: 'Moncton, NB',
        skills: ['Teamwork', 'Communication'],
        interests: ['Community service', 'Youth programs'],
        languages: ['English', 'French'],
        weeklyAvailabilityHours: 10,
        weeklyAvailabilityDays: ['Saturday', 'Sunday'],
        preferredCategories: [catMap['Food Security']],
        totalVerifiedHours: 15,
        totalPoints: 180,
        registrationStep: 6,
        consentGiven: true,
      });
      await VolunteerCategoryHours.create({ volunteerId: volUser.id, categoryId: catMap['Food Security'], hours: 15 });
      console.log(`   Volunteer: ${volEmail}`);
    }

    // Demo CSR
    const csrEmail = 'csr@demo.com';
    let csrUser = await User.findOne({ where: { email: csrEmail } });
    if (!csrUser) {
      csrUser = await User.create({ email: csrEmail, passwordHash: 'Demo@123456', role: 'csr', verificationStatus: 'verified' });
      await CsrPartner.create({ userId: csrUser.id, companyName: 'Atlantic Tech Solutions', industry: 'Technology', contactName: 'Jane Smith', contactEmail: 'csr@atlantictech.ca' });
      console.log(`   CSR: ${csrEmail}`);
    }

    // Rewards
    const rewardCount = await Reward.count();
    if (rewardCount === 0) {
      await Reward.bulkCreate([
        { name: 'Food Bank Champion Badge', description: 'Digital badge for outstanding food security volunteers', categoryId: catMap['Food Security'], sponsorName: 'Moncton Cares', pointsRequired: 100, categoryHoursRequired: 10, type: 'badge' },
        { name: '15% Coffee Shop Voucher', description: '15% discount at participating local coffee shops', categoryId: catMap['Volunteer Opportunities'], sponsorName: 'Atlantic Tech Solutions', pointsRequired: 150, categoryHoursRequired: 5, type: 'discount' },
        { name: "Women's Empowerment Certificate", description: 'Certificate of Excellence for Women Support volunteers', categoryId: catMap['Women Support'], sponsorName: 'Platform', pointsRequired: 200, categoryHoursRequired: 10, type: 'certificate' },
        { name: 'Youth Mentor Recognition Award', description: 'Award for top youth development volunteers', categoryId: catMap['Youth Development'], sponsorName: 'Platform', pointsRequired: 400, categoryHoursRequired: 20, type: 'perk' },
        { name: 'Community Event Pass', description: 'Free access to a community event of your choice', categoryId: catMap['Environment'], sponsorName: 'Moncton Cares', pointsRequired: 200, categoryHoursRequired: 10, type: 'eventPass' },
      ]);
      console.log('   Sample rewards seeded');
    }

    console.log('\n Seed complete!\n');
    console.log('Demo credentials:');
    console.log('  Admin:     admin@impactcircle.ca  /  Admin@123456');
    console.log('  Volunteer: volunteer@demo.com     /  Demo@123456');
    console.log('  Org:       moncton-cares@demo.com /  Demo@123456');
    console.log('  CSR:       csr@demo.com           /  Demo@123456\n');

    await sequelize.close();
  } catch (err) {
    console.error(' Seed failed:', err.message);
    if (err.parent) console.error('   SQL error:', err.parent.message);
    process.exit(1);
  }
};

seed();
