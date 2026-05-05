const router = require('express').Router();
const { fn, col, literal } = require('sequelize');
const { VolunteerProfile, Organization, HourRecord, Category, CsrPartner, User } = require('../models/index');

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const getCache = (k) => { const e = cache.get(k); if (e && Date.now() - e.ts < CACHE_TTL) return e.data; return null; };
const setCache = (k, d) => cache.set(k, { data: d, ts: Date.now() });

router.get('/impact', async (req, res, next) => {
  try {
    const cached = getCache('impact');
    if (cached) return res.json({ success: true, data: cached });

    const categories = await Category.findAll({ where: { isActive: true } });

    const categoryTotals = await Promise.all(
      categories.map(async (cat) => {
        const records = await HourRecord.findAll({ where: { categoryId: cat.id } });
        const totalHours = records.reduce((s, r) => s + r.hours, 0);
        const volunteerCount = new Set(records.map(r => r.volunteerId)).size;
        return { category: cat.toJSON(), totalHours, volunteerCount };
      })
    );

    const totalVerifiedHours = categoryTotals.reduce((s, c) => s + c.totalHours, 0);
    const [totalVolunteers, totalOrgs] = await Promise.all([
      VolunteerProfile.count({ where: literal('totalVerifiedHours > 0') }),
      Organization.count(),
    ]);

    const topAllTime = await VolunteerProfile.findAll({
      where: literal('totalVerifiedHours > 0'),
      include: [{ model: User, attributes: ['email'] }],
      order: [['totalVerifiedHours', 'DESC']],
      limit: 10,
    });

    const topOrgs = await Organization.findAll({
      where: literal('totalFacilitatedHours > 0'),
      order: [['totalFacilitatedHours', 'DESC']],
      limit: 10,
    });

    const topSponsors = await CsrPartner.findAll({ order: [['totalSponsoredRewards', 'DESC']], limit: 5 });

    const data = {
      summary: { totalVerifiedHours, totalVolunteers, totalOrgs, totalCategories: categories.length },
      categoryTotals,
      leaderboard: { allTime: topAllTime },
      topOrgs,
      topSponsors,
    };

    setCache('impact', data);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/stats', async (req, res, next) => {
  try {
    const [[{ total }], totalVolunteers, totalOrgs] = await Promise.all([
      HourRecord.findAll({ attributes: [[fn('SUM', col('hours')), 'total']], raw: true }),
      User.count({ where: { role: 'volunteer' } }),
      User.count({ where: { role: 'org' } }),
    ]);
    res.json({ success: true, data: { totalHours: total || 0, totalVolunteers, totalOrgs } });
  } catch (err) { next(err); }
});

module.exports = router;
