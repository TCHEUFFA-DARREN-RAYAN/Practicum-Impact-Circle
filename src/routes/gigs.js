const router = require('express').Router();
const { Op } = require('sequelize');
const { body } = require('express-validator');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { Gig, Application, Organization, Category, User, Task, VolunteerProfile } = require('../models/index');
const { createNotification } = require('../services/notifications');
const { sendEmail, templates } = require('../services/email');

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { category, location, dateFrom, dateTo, org, search, page = 1, limit = 12 } = req.query;
    const where = { status: 'open' };
    if (category) where.categoryId = parseInt(category);
    if (location) where.locationType = location;
    if (org) where.orgId = parseInt(org);
    if (dateFrom || dateTo) {
      where.startDate = {};
      if (dateFrom) where.startDate[Op.gte] = dateFrom;
      if (dateTo) where.startDate[Op.lte] = dateTo;
    }
    if (search) where[Op.or] = [
      { title: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
    ];

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count: total, rows: gigs } = await Gig.findAndCountAll({
      where,
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name', 'colorHex', 'icon'] },
        { model: Organization, as: 'org', attributes: ['orgName', 'address'] },
      ],
      order: [['createdAt', 'DESC']],
      offset,
      limit: parseInt(limit),
    });

    res.json({ success: true, data: { gigs, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const gig = await Gig.findByPk(req.params.id, {
      include: [
        { model: Category, as: 'category' },
        { model: Organization, as: 'org', attributes: ['orgName', 'missionStatement', 'address', 'contactEmail', 'website'] },
      ],
    });
    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found.' });
    res.json({ success: true, data: { gig } });
  } catch (err) { next(err); }
});

router.post('/', requireAuth, requireRole('org'), [
  body('title').trim().notEmpty().withMessage('Title is required.'),
  body('description').trim().isLength({ min: 20 }).withMessage('Description must be at least 20 characters.'),
  body('categoryId').notEmpty().withMessage('Category is required.'),
  body('startDate').isISO8601().withMessage('Valid start date required.'),
  body('endDate').isISO8601().withMessage('Valid end date required.'),
  body('estimatedHours').isFloat({ min: 0.5 }).withMessage('Estimated hours must be at least 0.5.'),
], validate, async (req, res, next) => {
  try {
    const org = await Organization.findOne({ where: { userId: req.user.id } });
    if (!org) return res.status(403).json({ success: false, message: 'Organization profile not found.' });

    const orgUser = await User.findByPk(req.user.id);
    if (orgUser.verificationStatus !== 'verified')
      return res.status(403).json({ success: false, message: 'Your organization must be verified to post gigs.' });

    const { title, description, categoryId, startDate, endDate, estimatedHours, location, requiredSkills, verifiedOnly } = req.body;
    const gig = await Gig.create({
      orgId: org.id, title, description, categoryId: parseInt(categoryId),
      startDate, endDate, estimatedHours,
      locationType: location?.type || 'in-person',
      locationAddress: location?.address || '',
      requiredSkills: requiredSkills || [],
      verifiedOnly: !!verifiedOnly,
    });

    const populated = await Gig.findByPk(gig.id, {
      include: [{ model: Category, as: 'category', attributes: ['name', 'colorHex', 'icon'] }],
    });
    res.status(201).json({ success: true, message: 'Gig posted successfully.', data: { gig: populated } });
  } catch (err) { next(err); }
});

router.put('/:id', requireAuth, requireRole('org'), async (req, res, next) => {
  try {
    const org = await Organization.findOne({ where: { userId: req.user.id } });
    const gig = await Gig.findOne({ where: { id: req.params.id, orgId: org.id } });
    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found.' });

    const allowed = ['title', 'description', 'startDate', 'endDate', 'estimatedHours', 'requiredSkills', 'verifiedOnly', 'status'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    if (req.body.location) {
      updates.locationType = req.body.location.type;
      updates.locationAddress = req.body.location.address;
    }
    await gig.update(updates);
    res.json({ success: true, message: 'Gig updated.', data: { gig } });
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, requireRole('org'), async (req, res, next) => {
  try {
    const org = await Organization.findOne({ where: { userId: req.user.id } });
    const gig = await Gig.findOne({ where: { id: req.params.id, orgId: org.id } });
    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found.' });
    await gig.update({ status: 'cancelled' });
    res.json({ success: true, message: 'Gig cancelled.' });
  } catch (err) { next(err); }
});

router.post('/:id/apply', requireAuth, requireRole('volunteer'), [
  body('personalStatement').trim().isLength({ min: 20 }).withMessage('Personal statement must be at least 20 characters.'),
], validate, async (req, res, next) => {
  try {
    const gig = await Gig.findByPk(req.params.id);
    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found.' });
    if (gig.status !== 'open') return res.status(400).json({ success: false, message: 'This gig is no longer accepting applications.' });

    if (gig.verifiedOnly) {
      const user = await User.findByPk(req.user.id);
      if (user.verificationStatus !== 'verified')
        return res.status(403).json({ success: false, message: 'This gig requires a verified volunteer badge.' });
    }

    const existing = await Application.findOne({ where: { gigId: gig.id, volunteerId: req.user.id } });
    if (existing) return res.status(409).json({ success: false, message: 'You have already applied to this gig.' });

    const application = await Application.create({ gigId: gig.id, volunteerId: req.user.id, personalStatement: req.body.personalStatement });
    await gig.increment('applicantCount');

    const org = await Organization.findByPk(gig.orgId);
    if (org) await createNotification(org.userId, `New application received for "${gig.title}"`, 'application', '/org-dashboard');

    res.status(201).json({ success: true, message: 'Application submitted.', data: { application } });
  } catch (err) { next(err); }
});

router.get('/:id/applications', requireAuth, requireRole('org'), async (req, res, next) => {
  try {
    const org = await Organization.findOne({ where: { userId: req.user.id } });
    const gig = await Gig.findOne({ where: { id: req.params.id, orgId: org.id } });
    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found.' });

    const applications = await Application.findAll({
      where: { gigId: gig.id },
      include: [{ model: User, as: 'volunteer', attributes: ['id', 'email', 'verificationStatus'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, data: { applications, gig } });
  } catch (err) { next(err); }
});

router.patch('/applications/:appId/decide', requireAuth, requireRole('org'), [
  body('decision').isIn(['approved', 'rejected']).withMessage('Decision must be approved or rejected.'),
], validate, async (req, res, next) => {
  try {
    const app = await Application.findByPk(req.params.appId, {
      include: [{ model: Gig, as: 'gig', include: [{ model: Organization, as: 'org' }] }],
    });
    if (!app) return res.status(404).json({ success: false, message: 'Application not found.' });

    const org = await Organization.findOne({ where: { userId: req.user.id } });
    if (!org || org.id !== app.gig.orgId) return res.status(403).json({ success: false, message: 'Not authorized.' });

    const { decision, reason } = req.body;
    await app.update({ status: decision, decisionReason: reason || null, decidedAt: new Date() });

    if (decision === 'approved') {
      await Task.create({
        applicationId: app.id, gigId: app.gigId,
        volunteerId: app.volunteerId, orgId: org.id, status: 'accepted',
      });
    }

    const volUser = await User.findByPk(app.volunteerId);
    if (volUser) {
      const tpl = templates.applicationDecision(volUser.email.split('@')[0], app.gig.title, decision === 'approved', reason);
      await sendEmail(volUser.email, tpl.subject, tpl.html);
      await createNotification(app.volunteerId, `Your application for "${app.gig.title}" was ${decision}.`, 'application', '/volunteer-dashboard');
    }

    res.json({ success: true, message: `Application ${decision}.` });
  } catch (err) { next(err); }
});

module.exports = router;
