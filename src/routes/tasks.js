const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { Task, Gig, Organization, User, VolunteerProfile } = require('../models/index');
const { awardPoints } = require('../services/points');
const { createNotification } = require('../services/notifications');
const { sendEmail, templates } = require('../services/email');

router.patch('/:id/start', requireAuth, requireRole('volunteer'), async (req, res, next) => {
  try {
    const task = await Task.findOne({ where: { id: req.params.id, volunteerId: req.user.id } });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });
    if (!task.canTransitionTo('inProgress'))
      return res.status(400).json({ success: false, message: `Cannot move from "${task.status}" to "inProgress".` });
    await task.update({ status: 'inProgress' });
    res.json({ success: true, message: 'Task started.', data: { task } });
  } catch (err) { next(err); }
});

router.patch('/:id/complete', requireAuth, requireRole('volunteer'), async (req, res, next) => {
  try {
    const task = await Task.findOne({ where: { id: req.params.id, volunteerId: req.user.id } });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });
    if (!task.canTransitionTo('completed'))
      return res.status(400).json({ success: false, message: `Cannot mark as completed from "${task.status}".` });

    await task.update({ status: 'completed', submittedAt: new Date() });

    const [gig, org] = await Promise.all([Gig.findByPk(task.gigId), Organization.findByPk(task.orgId)]);
    if (org) await createNotification(org.userId, `Task completion submitted for "${gig?.title}" — please verify within 30 days.`, 'task', '/org-dashboard');

    res.json({ success: true, message: 'Task marked as completed. Awaiting organization approval.', data: { task } });
  } catch (err) { next(err); }
});

router.patch('/:id/verify', requireAuth, requireRole('org'), async (req, res, next) => {
  try {
    const org = await Organization.findOne({ where: { userId: req.user.id } });
    if (!org) return res.status(403).json({ success: false, message: 'Organization not found.' });

    const task = await Task.findOne({ where: { id: req.params.id, orgId: org.id } });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

    const { decision, reason } = req.body;
    if (!['approved', 'rejected'].includes(decision))
      return res.status(400).json({ success: false, message: 'Decision must be approved or rejected.' });
    if (decision === 'rejected' && (!reason || reason.trim().length < 5))
      return res.status(400).json({ success: false, message: 'A reason is required when rejecting.' });
    if (!task.canTransitionTo(decision))
      return res.status(400).json({ success: false, message: `Cannot transition from "${task.status}".` });

    const [gig, volunteer] = await Promise.all([Gig.findByPk(task.gigId), User.findByPk(task.volunteerId)]);

    if (decision === 'approved') {
      await task.update({ status: 'approved', verifiedAt: new Date() });
      const { hours, points } = await awardPoints(task.volunteerId, task, gig);
      await Organization.increment('totalFacilitatedHours', { by: gig.estimatedHours, where: { id: org.id } });
      if (volunteer) {
        const tpl = templates.taskApproved(volunteer.email.split('@')[0], gig.title, hours, points);
        await sendEmail(volunteer.email, tpl.subject, tpl.html);
      }
    } else {
      await task.update({ status: 'rejected', rejectionReason: reason });
      if (volunteer) {
        const tpl = templates.taskRejected(volunteer.email.split('@')[0], gig.title, reason);
        await sendEmail(volunteer.email, tpl.subject, tpl.html);
        await createNotification(task.volunteerId, `Task for "${gig.title}" was rejected: ${reason}`, 'task', '/volunteer-dashboard');
      }
    }

    res.json({ success: true, message: `Task ${decision}.` });
  } catch (err) { next(err); }
});

router.patch('/:id/rate', requireAuth, requireRole('org'), [
  body('orgRating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1–5.'),
], validate, async (req, res, next) => {
  try {
    const org = await Organization.findOne({ where: { userId: req.user.id } });
    if (!org) return res.status(403).json({ success: false, message: 'Organization not found.' });

    const task = await Task.findOne({ where: { id: req.params.id, orgId: org.id, status: 'approved' } });
    if (!task) return res.status(404).json({ success: false, message: 'Approved task not found.' });

    const { orgRating, orgFeedback } = req.body;
    await task.update({ orgRating: parseInt(orgRating), orgFeedback: orgFeedback || null });
    res.json({ success: true, message: 'Rating saved.', data: { task } });
  } catch (err) { next(err); }
});

router.get('/my', requireAuth, requireRole('volunteer'), async (req, res, next) => {
  try {
    const tasks = await Task.findAll({
      where: { volunteerId: req.user.id },
      include: [{ model: Gig, as: 'gig', attributes: ['title', 'estimatedHours', 'startDate', 'endDate'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, data: { tasks } });
  } catch (err) { next(err); }
});

router.get('/org-pending', requireAuth, requireRole('org'), async (req, res, next) => {
  try {
    const org = await Organization.findOne({ where: { userId: req.user.id } });
    const tasks = await Task.findAll({
      where: { orgId: org.id, status: 'completed' },
      include: [
        { model: Gig, as: 'gig', attributes: ['title', 'estimatedHours'] },
        { model: User, as: 'volunteer', attributes: ['email'] },
      ],
      order: [['submittedAt', 'ASC']],
    });
    res.json({ success: true, data: { tasks } });
  } catch (err) { next(err); }
});

module.exports = router;
