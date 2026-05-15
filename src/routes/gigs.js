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
    const {
      category, location, timeOfDay, dayOfWeek, dateFrom, dateTo,
      org, search, minHours, maxHours, province, sortBy = 'createdAt',
      page = 1, limit = Math.min(parseInt(req.query.limit) || 12, 50),
    } = req.query;
    const where = { status: 'open' };
    if (category) where.categoryId = parseInt(category);
    if (location) where.locationType = location;
    if (timeOfDay) where.timeOfDay = timeOfDay;
    if (dayOfWeek) where.recurrenceDays = { [Op.like]: `%${dayOfWeek}%` };
    if (org) where.orgId = parseInt(org);
    if (dateFrom || dateTo) {
      where.startDate = {};
      if (dateFrom) where.startDate[Op.gte] = dateFrom;
      if (dateTo) where.startDate[Op.lte] = dateTo;
    }
    if (minHours || maxHours) {
      where.estimatedHours = {};
      if (minHours) where.estimatedHours[Op.gte] = parseFloat(minHours);
      if (maxHours) where.estimatedHours[Op.lte] = parseFloat(maxHours);
    }
    if (search) where[Op.or] = [
      { title: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
    ];

    /* Province filter — join with Organization */
    const orgInclude = province
      ? { model: Organization, as: 'org', attributes: ['orgName', 'address', 'province'], where: { province } }
      : { model: Organization, as: 'org', attributes: ['orgName', 'address', 'province'] };

    const orderMap = { hours: [['estimatedHours', 'ASC']], hoursDesc: [['estimatedHours', 'DESC']], date: [['startDate', 'ASC']] };
    const order = orderMap[sortBy] || [['createdAt', 'DESC']];
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count: total, rows: gigs } = await Gig.findAndCountAll({
      where,
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name', 'colorHex', 'icon'] },
        orgInclude,
      ],
      order,
      offset,
      limit: parseInt(limit),
    });

    res.json({ success: true, data: { gigs, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
});

/* POST /api/gigs/:id/view — increment view counter (public, no auth required) */
router.post('/:id/view', async (req, res, next) => {
  try {
    await Gig.increment('viewCount', { where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.get('/:id/my-application', requireAuth, requireRole('volunteer'), async (req, res, next) => {
  try {
    const app = await Application.findOne({ where: { gigId: req.params.id, volunteerId: req.user.id } });
    if (!app) return res.json({ success: true, data: { applied: false } });
    res.json({ success: true, data: { applied: true, status: app.status, applicationId: app.id } });
  } catch (err) { next(err); }
});

router.get('/:id/applications', requireAuth, requireRole('org'), async (req, res, next) => {
  try {
    const org = await Organization.findOne({ where: { userId: req.user.id } });
    const gig = await Gig.findOne({ where: { id: req.params.id, orgId: org.id } });
    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found.' });

    const applications = await Application.findAll({
      where: { gigId: gig.id },
      include: [{
        model: User, as: 'volunteer', attributes: ['id', 'email', 'verificationStatus', 'avatarUrl'],
        include: [{ model: VolunteerProfile, as: 'volunteerProfile' }],
      }],
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, data: { applications, gig } });
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
  body('description').trim().notEmpty().withMessage('Description is required.'),
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

    const {
      title, description, categoryId, startDate, endDate, estimatedHours,
      location, requiredSkills, verifiedOnly,
      timeOfDay, startTime, endTime,
      isRecurring, recurrenceType, recurrenceDays, hoursPerOccurrence,
      maxVolunteers,
    } = req.body;
    const gig = await Gig.create({
      orgId: org.id, title, description, categoryId: parseInt(categoryId),
      startDate, endDate, estimatedHours,
      locationType: location?.type || 'in-person',
      locationAddress: location?.address || '',
      requiredSkills: requiredSkills || [],
      verifiedOnly: !!verifiedOnly,
      timeOfDay: timeOfDay || null,
      startTime: startTime || null,
      endTime: endTime || null,
      isRecurring: !!isRecurring,
      recurrenceType: recurrenceType || null,
      recurrenceDays: recurrenceDays || [],
      hoursPerOccurrence: hoursPerOccurrence || null,
      maxVolunteers: maxVolunteers ? parseInt(maxVolunteers) : null,
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

    const allowed = ['title', 'description', 'startDate', 'endDate', 'estimatedHours', 'requiredSkills', 'verifiedOnly', 'status',
      'timeOfDay', 'startTime', 'endTime', 'isRecurring', 'recurrenceType', 'recurrenceDays', 'hoursPerOccurrence', 'maxVolunteers'];
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

router.delete('/:id/permanent', requireAuth, requireRole('org'), async (req, res, next) => {
  try {
    const org = await Organization.findOne({ where: { userId: req.user.id } });
    const gig = await Gig.findOne({ where: { id: req.params.id, orgId: org.id, status: 'cancelled' } });
    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found or not in cancelled state.' });
    await Application.destroy({ where: { gigId: gig.id } });
    await Task.destroy({ where: { gigId: gig.id } });
    await gig.destroy();
    res.json({ success: true, message: 'Gig permanently deleted.' });
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

router.get('/applications/:appId', requireAuth, requireRole('org'), async (req, res, next) => {
  try {
    const org = await Organization.findOne({ where: { userId: req.user.id } });
    if (!org) return res.status(403).json({ success: false, message: 'Organization not found.' });

    const app = await Application.findByPk(req.params.appId, {
      include: [
        { model: Gig, as: 'gig', where: { orgId: org.id } },
        {
          model: User, as: 'volunteer', attributes: ['id', 'email', 'verificationStatus'],
          include: [{ model: VolunteerProfile, as: 'volunteerProfile' }],
        },
      ],
    });
    if (!app) return res.status(404).json({ success: false, message: 'Application not found.' });
    res.json({ success: true, data: { application: app } });
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
