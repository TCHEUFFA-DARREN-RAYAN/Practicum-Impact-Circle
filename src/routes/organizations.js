const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { Organization, Gig, Task, Category, User } = require('../models/index');

router.get('/me', requireAuth, requireRole('org'), async (req, res, next) => {
  try {
    const org = await Organization.findOne({ where: { userId: req.user.id } });
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found.' });
    res.json({ success: true, data: { org } });
  } catch (err) { next(err); }
});

router.put('/me', requireAuth, requireRole('org'), async (req, res, next) => {
  try {
    const allowed = ['orgName', 'missionStatement', 'categories', 'contactName', 'contactEmail', 'contactPhone', 'address', 'website'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    await Organization.update(updates, { where: { userId: req.user.id } });
    const org = await Organization.findOne({ where: { userId: req.user.id } });
    res.json({ success: true, message: 'Profile updated.', data: { org } });
  } catch (err) { next(err); }
});

router.get('/me/dashboard', requireAuth, requireRole('org'), async (req, res, next) => {
  try {
    const org = await Organization.findOne({ where: { userId: req.user.id } });
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found.' });

    const gigs = await Gig.findAll({
      where: { orgId: org.id },
      include: [{ model: Category, as: 'category', attributes: ['name', 'colorHex', 'icon'] }],
      order: [['createdAt', 'DESC']],
    });

    const pendingTasks = await Task.findAll({
      where: { orgId: org.id, status: 'completed' },
      include: [
        { model: Gig, as: 'gig', attributes: ['title', 'estimatedHours'] },
        { model: User, as: 'volunteer', attributes: ['email'] },
      ],
      order: [['submittedAt', 'ASC']],
    });

    res.json({
      success: true,
      data: {
        org, gigs, pendingTasks,
        stats: {
          totalGigs: gigs.length,
          openGigs: gigs.filter(g => g.status === 'open').length,
          pendingApprovals: pendingTasks.length,
          totalFacilitatedHours: org.totalFacilitatedHours || 0,
        },
      },
    });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const org = await Organization.findByPk(req.params.id);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found.' });
    res.json({ success: true, data: { org } });
  } catch (err) { next(err); }
});

module.exports = router;
