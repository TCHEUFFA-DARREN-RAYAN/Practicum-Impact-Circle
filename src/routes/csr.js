const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { CsrPartner, CsrEmployee, HourRecord, Reward, Redemption, User, Category } = require('../models/index');

router.get('/me', requireAuth, requireRole('csr'), async (req, res, next) => {
  try {
    const partner = await CsrPartner.findOne({ where: { userId: req.user.id } });
    if (!partner) return res.status(404).json({ success: false, message: 'CSR profile not found.' });
    res.json({ success: true, data: { partner } });
  } catch (err) { next(err); }
});

router.put('/me', requireAuth, requireRole('csr'), async (req, res, next) => {
  try {
    const allowed = ['companyName', 'industry', 'contactName', 'contactEmail', 'contactPhone', 'website', 'sponsoredCategories'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    await CsrPartner.update(updates, { where: { userId: req.user.id } });
    const partner = await CsrPartner.findOne({ where: { userId: req.user.id } });
    res.json({ success: true, message: 'Profile updated.', data: { partner } });
  } catch (err) { next(err); }
});

router.get('/me/dashboard', requireAuth, requireRole('csr'), async (req, res, next) => {
  try {
    const partner = await CsrPartner.findOne({ where: { userId: req.user.id } });
    if (!partner) return res.status(404).json({ success: false, message: 'CSR profile not found.' });

    const employees = await CsrEmployee.findAll({ where: { csrPartnerId: partner.id } });
    const empIds = employees.map(e => e.userId);

    const employeeHours = empIds.length
      ? await HourRecord.findAll({ where: { volunteerId: empIds }, include: [{ model: Category, as: 'category', attributes: ['name'] }] })
      : [];

    const totalEmployeeHours = employeeHours.reduce((s, r) => s + r.hours, 0);
    const categoryBreakdown = {};
    employeeHours.forEach(r => {
      const k = r.category?.name || String(r.categoryId);
      categoryBreakdown[k] = (categoryBreakdown[k] || 0) + r.hours;
    });

    const sponsoredRewards = await Reward.findAll({ where: { sponsorId: req.user.id } });
    const redemptions = sponsoredRewards.length
      ? await Redemption.findAll({ where: { rewardId: sponsoredRewards.map(r => r.id) } })
      : [];

    res.json({
      success: true,
      data: {
        partner,
        stats: { totalEmployeeHours, employeeCount: empIds.length, sponsoredRewardsCount: sponsoredRewards.length, totalRedemptions: redemptions.length, categoryBreakdown },
        sponsoredRewards,
        redemptions,
      },
    });
  } catch (err) { next(err); }
});

router.get('/me/report.csv', requireAuth, requireRole('csr'), async (req, res, next) => {
  try {
    const partner = await CsrPartner.findOne({ where: { userId: req.user.id } });
    const employees = await CsrEmployee.findAll({ where: { csrPartnerId: partner.id } });
    const empIds = employees.map(e => e.userId);
    const records = empIds.length
      ? await HourRecord.findAll({ where: { volunteerId: empIds }, include: [{ model: Category, as: 'category', attributes: ['name'] }, { model: User, attributes: ['email'] }] })
      : [];

    const lines = ['Employee Email,Category,Hours,Points Awarded,Approved At'];
    records.forEach(r => lines.push(`${r.User?.email || 'N/A'},${r.category?.name || 'N/A'},${r.hours},${r.pointsAwarded},${r.approvedAt?.toISOString() || ''}`));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="impact-report.csv"');
    res.send(lines.join('\n'));
  } catch (err) { next(err); }
});

module.exports = router;
