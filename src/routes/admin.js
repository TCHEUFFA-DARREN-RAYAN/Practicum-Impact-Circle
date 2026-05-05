const router = require('express').Router();
const { fn, col, literal } = require('sequelize');
const { requireAuth, requireRole } = require('../middleware/auth');
const { User, VolunteerProfile, Organization, Category, Gig, Reward, Task, HourRecord, AuditLog, Notification } = require('../models/index');
const { createNotification } = require('../services/notifications');
const { sendEmail, templates } = require('../services/email');

const adminAuth = [requireAuth, requireRole('admin')];

router.get('/dashboard', ...adminAuth, async (req, res, next) => {
  try {
    const [[{ total: totalHours }], totalUsers, totalGigs, totalOrgs, pendingVerifications, pendingTasks, totalApproved, autoApproved] = await Promise.all([
      HourRecord.findAll({ attributes: [[fn('SUM', col('hours')), 'total']], raw: true }),
      User.count(),
      Gig.count(),
      Organization.count(),
      User.count({ where: { verificationStatus: 'pending' } }),
      Task.count({ where: { status: 'completed' } }),
      Task.count({ where: { status: 'approved' } }),
      Task.count({ where: { autoApprovedAt: { [require('sequelize').Op.ne]: null } } }),
    ]);

    const autoApprovalRate = totalApproved > 0 ? parseFloat(((autoApproved / totalApproved) * 100).toFixed(1)) : 0;
    res.json({ success: true, data: { stats: { totalUsers, totalGigs, totalOrgs, totalVerifiedHours: totalHours || 0, pendingVerifications, pendingTasks, autoApprovalRate } } });
  } catch (err) { next(err); }
});

router.get('/verifications', ...adminAuth, async (req, res, next) => {
  try {
    const { status = 'pending', role } = req.query;
    const where = { verificationStatus: status };
    if (role) where.role = role;
    else where.role = ['volunteer', 'org'];

    const users = await User.findAll({ where, attributes: { exclude: ['passwordHash'] }, order: [['createdAt', 'DESC']] });
    const enriched = await Promise.all(users.map(async (u) => {
      const obj = u.toJSON();
      if (u.role === 'volunteer') obj.profile = await VolunteerProfile.findOne({ where: { userId: u.id } });
      else if (u.role === 'org') obj.org = await Organization.findOne({ where: { userId: u.id } });
      return obj;
    }));
    res.json({ success: true, data: { users: enriched } });
  } catch (err) { next(err); }
});

router.patch('/verify/:userId', ...adminAuth, async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    if (!['verified', 'rejected'].includes(status))
      return res.status(400).json({ success: false, message: 'Status must be verified or rejected.' });
    if (status === 'rejected' && (!reason || reason.trim().length < 5))
      return res.status(400).json({ success: false, message: 'A reason is required for rejection.' });

    const [, [user]] = await User.update(
      { verificationStatus: status, rejectionReason: status === 'rejected' ? reason : null },
      { where: { id: req.params.userId }, returning: true }
    );
    const updated = user || await User.findByPk(req.params.userId);
    if (!updated) return res.status(404).json({ success: false, message: 'User not found.' });

    const name = updated.email.split('@')[0];
    const tpl = status === 'verified' ? templates.verificationApproved(name) : templates.verificationRejected(name, reason);
    await sendEmail(updated.email, tpl.subject, tpl.html);
    await createNotification(updated.id, `Your account verification status: ${status}`, 'verification');

    res.json({ success: true, message: `User ${status}.`, data: { user: updated.toSafeObject() } });
  } catch (err) { next(err); }
});

router.get('/users', ...adminAuth, async (req, res, next) => {
  try {
    const { role, status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (role) where.role = role;
    if (status) where.verificationStatus = status;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count: total, rows: users } = await User.findAndCountAll({ where, attributes: { exclude: ['passwordHash'] }, order: [['createdAt', 'DESC']], offset, limit: parseInt(limit) });
    res.json({ success: true, data: { users, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
});

router.get('/categories', ...adminAuth, async (req, res, next) => {
  try {
    const categories = await Category.findAll({ order: [['name', 'ASC']] });
    res.json({ success: true, data: { categories } });
  } catch (err) { next(err); }
});

router.post('/categories', ...adminAuth, async (req, res, next) => {
  try {
    const cat = await Category.create(req.body);
    res.status(201).json({ success: true, message: 'Category created.', data: { category: cat } });
  } catch (err) { next(err); }
});

router.put('/categories/:id', ...adminAuth, async (req, res, next) => {
  try {
    await Category.update(req.body, { where: { id: req.params.id } });
    const cat = await Category.findByPk(req.params.id);
    res.json({ success: true, message: 'Category updated.', data: { category: cat } });
  } catch (err) { next(err); }
});

router.patch('/categories/:id/archive', ...adminAuth, async (req, res, next) => {
  try {
    await Category.update({ isActive: false }, { where: { id: req.params.id } });
    res.json({ success: true, message: 'Category archived.' });
  } catch (err) { next(err); }
});

router.get('/rewards', ...adminAuth, async (req, res, next) => {
  try {
    const rewards = await Reward.findAll({ include: [{ model: Category, as: 'category', attributes: ['name'] }], order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: { rewards } });
  } catch (err) { next(err); }
});

router.post('/rewards', ...adminAuth, async (req, res, next) => {
  try {
    const reward = await Reward.create(req.body);
    res.status(201).json({ success: true, message: 'Reward created.', data: { reward } });
  } catch (err) { next(err); }
});

router.put('/rewards/:id', ...adminAuth, async (req, res, next) => {
  try {
    await Reward.update(req.body, { where: { id: req.params.id } });
    const reward = await Reward.findByPk(req.params.id);
    res.json({ success: true, message: 'Reward updated.', data: { reward } });
  } catch (err) { next(err); }
});

router.patch('/rewards/:id/retire', ...adminAuth, async (req, res, next) => {
  try {
    await Reward.update({ isActive: false, isRetired: true }, { where: { id: req.params.id } });
    res.json({ success: true, message: 'Reward retired.' });
  } catch (err) { next(err); }
});

router.get('/disputes', ...adminAuth, async (req, res, next) => {
  try {
    const tasks = await Task.findAll({
      where: { status: 'rejected' },
      include: [
        { model: Gig, as: 'gig', attributes: ['title'] },
        { model: User, as: 'volunteer', attributes: ['email'] },
        { model: Organization, as: 'org', attributes: ['orgName'] },
      ],
      order: [['updatedAt', 'DESC']],
    });
    res.json({ success: true, data: { disputes: tasks } });
  } catch (err) { next(err); }
});

router.patch('/disputes/:taskId/override', ...adminAuth, async (req, res, next) => {
  try {
    const { decision, reason } = req.body;
    if (!reason || reason.trim().length < 10)
      return res.status(400).json({ success: false, message: 'A written reason (min 10 chars) is required.' });

    const task = await Task.findByPk(req.params.taskId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

    await task.update({ status: decision, rejectionReason: reason });

    await AuditLog.create({
      eventType: 'ADMIN_OVERRIDE', actorId: req.user.id, actorRole: 'admin',
      method: 'PATCH', route: req.path, targetEntity: 'Task',
      targetId: String(task.id), metadata: { decision, reason },
    });

    res.json({ success: true, message: `Task overridden to "${decision}".` });
  } catch (err) { next(err); }
});

router.get('/audit', ...adminAuth, async (req, res, next) => {
  try {
    const { Op } = require('sequelize');
    const { dateFrom, dateTo, eventType, actorId, page = 1, limit = 50 } = req.query;
    const where = {};
    if (eventType) where.eventType = { [Op.like]: `%${eventType}%` };
    if (actorId) where.actorId = parseInt(actorId);
    if (dateFrom || dateTo) {
      where.timestamp = {};
      if (dateFrom) where.timestamp[Op.gte] = new Date(dateFrom);
      if (dateTo) where.timestamp[Op.lte] = new Date(dateTo);
    }
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count: total, rows: logs } = await AuditLog.findAndCountAll({ where, order: [['timestamp', 'DESC']], offset, limit: parseInt(limit) });
    res.json({ success: true, data: { logs, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
});

router.get('/analytics', ...adminAuth, async (req, res, next) => {
  try {
    const { Op } = require('sequelize');
    const [[{ total: totalHours }], totalUsers, verifiedVolunteers, pendingVerifications, totalGigs, openGigs, totalOrgs, autoApproved, totalApproved] = await Promise.all([
      HourRecord.findAll({ attributes: [[fn('SUM', col('hours')), 'total']], raw: true }),
      User.count(),
      User.count({ where: { role: 'volunteer', verificationStatus: 'verified' } }),
      User.count({ where: { verificationStatus: 'pending' } }),
      Gig.count(),
      Gig.count({ where: { status: 'open' } }),
      Organization.count(),
      Task.count({ where: { autoApprovedAt: { [Op.ne]: null } } }),
      Task.count({ where: { status: 'approved' } }),
    ]);
    const autoApprovalRate = totalApproved > 0 ? parseFloat(((autoApproved / totalApproved) * 100).toFixed(1)) : 0;
    res.json({ success: true, data: { totalUsers, verifiedVolunteers, pendingVerifications, totalGigs, openGigs, totalVerifiedHours: totalHours || 0, totalOrgs, autoApprovalRate, autoApprovedTasks: autoApproved, totalApprovedTasks: totalApproved } });
  } catch (err) { next(err); }
});

router.get('/analytics.csv', ...adminAuth, async (req, res, next) => {
  try {
    const users = await User.findAll({ attributes: { exclude: ['passwordHash'] } });
    const lines = ['ID,Email,Role,Status,Created'];
    users.forEach(u => lines.push(`${u.id},${u.email},${u.role},${u.verificationStatus},${u.createdAt?.toISOString()}`));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="analytics.csv"');
    res.send(lines.join('\n'));
  } catch (err) { next(err); }
});

module.exports = router;
