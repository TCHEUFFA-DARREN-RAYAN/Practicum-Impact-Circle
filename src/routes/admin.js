const router = require('express').Router();
const { fn, col, literal, Op } = require('sequelize');
const { requireAuth, requireRole } = require('../middleware/auth');
const { User, VolunteerProfile, Organization, Category, Gig, Application, Reward, Task, HourRecord, AuditLog, Notification, Announcement, Attendance } = require('../models/index');
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
    /* rejection reason is optional */

    await User.update(
      { verificationStatus: status, rejectionReason: status === 'rejected' ? reason : null },
      { where: { id: req.params.userId } }
    );
    const updated = await User.findByPk(req.params.userId);
    if (!updated) return res.status(404).json({ success: false, message: 'User not found.' });

    const name = updated.email.split('@')[0];
    const tpl = status === 'verified' ? templates.verificationApproved(name) : templates.verificationRejected(name, reason);
    let emailSent = true;
    try {
      await sendEmail(updated.email, tpl.subject, tpl.html);
    } catch (e) {
      emailSent = false;
      console.error('[ADMIN] verify email failed:', e.message);
    }
    await createNotification(updated.id, `Your account verification status: ${status}`, 'verification');

    res.json({ success: true, message: `User ${status}.`, data: { user: updated.toSafeObject(), emailSent } });
  } catch (err) { next(err); }
});

router.get('/users', ...adminAuth, async (req, res, next) => {
  try {
    const { role, status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (role) {
      where.role = role;
    } else {
      where.role = { [Op.notIn]: ['org'] };
    }
    if (status) where.verificationStatus = status;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count: total, rows: users } = await User.findAndCountAll({ where, attributes: { exclude: ['passwordHash'] }, order: [['createdAt', 'DESC']], offset, limit: parseInt(limit) });
    res.json({ success: true, data: { users, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { next(err); }
});

router.get('/users/:id', ...adminAuth, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['passwordHash'] },
      include: [
        { model: VolunteerProfile, as: 'volunteerProfile' },
        { model: Organization, as: 'organization' },
      ],
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, data: { user: user.toJSON() } });
  } catch (err) { next(err); }
});

router.patch('/users/:id/block', ...adminAuth, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.role === 'admin') return res.status(403).json({ success: false, message: 'Cannot block an admin account.' });
    const newState = !user.isBlocked;
    await user.update({ isBlocked: newState });
    res.json({ success: true, message: `User ${newState ? 'blocked' : 'unblocked'}.`, data: { isBlocked: newState } });
  } catch (err) { next(err); }
});

router.delete('/users/:id', ...adminAuth, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.role === 'admin') return res.status(403).json({ success: false, message: 'Cannot delete an admin account.' });
    await user.update({ isBlocked: true, verificationStatus: 'rejected' });
    res.json({ success: true, message: 'User account has been deactivated.' });
  } catch (err) { next(err); }
});

router.get('/organizations', ...adminAuth, async (req, res, next) => {
  try {
    const orgs = await Organization.findAll({
      include: [{ model: User, attributes: ['id', 'email', 'verificationStatus', 'role', 'createdAt', 'isBlocked'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, data: { organizations: orgs } });
  } catch (err) { next(err); }
});

router.get('/organizations/:id', ...adminAuth, async (req, res, next) => {
  try {
    const org = await Organization.findByPk(req.params.id, {
      include: [{ model: User, attributes: ['id', 'email', 'verificationStatus', 'isBlocked', 'createdAt'] }],
    });
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found.' });
    res.json({ success: true, data: { organization: org } });
  } catch (err) { next(err); }
});

router.put('/organizations/:id', ...adminAuth, async (req, res, next) => {
  try {
    const allowed = ['orgName', 'missionStatement', 'contactName', 'contactEmail', 'contactPhone', 'address', 'website'];
    const updates = {};
    const changedLabels = [];
    const labelMap = { orgName:'Organization Name', missionStatement:'Mission Statement', contactName:'Contact Name', contactEmail:'Contact Email', contactPhone:'Contact Phone', address:'Address', website:'Website' };
    allowed.forEach(k => {
      if (req.body[k] !== undefined) {
        updates[k] = req.body[k];
        changedLabels.push(labelMap[k] || k);
      }
    });
    await Organization.update(updates, { where: { id: req.params.id } });
    const org = await Organization.findByPk(req.params.id, { include: [{ model: User, attributes: ['email'] }] });

    if (org && changedLabels.length > 0) {
      const emailTarget = org.contactEmail || org.User?.email;
      if (emailTarget) {
        try {
          const tpl = templates.orgUpdatedByAdmin(org.orgName, changedLabels);
          await sendEmail(emailTarget, tpl.subject, tpl.html);
        } catch (e) {
          console.error('[ADMIN] org update email failed:', e.message);
        }
      }
    }

    res.json({ success: true, message: 'Organization updated.', data: { organization: org } });
  } catch (err) { next(err); }
});

router.delete('/organizations/:id', ...adminAuth, async (req, res, next) => {
  try {
    const org = await Organization.findByPk(req.params.id);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found.' });
    await User.update({ isBlocked: true, verificationStatus: 'rejected' }, { where: { id: org.userId } });
    res.json({ success: true, message: 'Organization account has been deactivated.' });
  } catch (err) { next(err); }
});

router.get('/gigs', ...adminAuth, async (req, res, next) => {
  try {
    const { Op } = require('sequelize');
    const { status, upcoming, page = 1, limit = 30 } = req.query;
    const where = {};
    if (status && ['open', 'closed', 'cancelled'].includes(status)) where.status = status;
    if (String(upcoming).toLowerCase() === 'true') {
      where.startDate = { [Op.gte]: new Date().toISOString().slice(0, 10) };
    }
    const { sortBy } = req.query;
    const lim = Math.min(parseInt(limit, 10) || 30, 100);
    const pg = parseInt(page, 10) || 1;
    const offset = (pg - 1) * lim;
    let orderClause = [['startDate', String(upcoming).toLowerCase() === 'true' ? 'ASC' : 'DESC']];
    if (sortBy === 'viewCount') orderClause = [['viewCount', 'DESC']];
    const { count: total, rows: gigs } = await Gig.findAndCountAll({
      where,
      include: [
        { model: Organization, as: 'org', attributes: ['id', 'orgName', 'address', 'contactEmail'] },
        { model: Category, as: 'category', attributes: ['name'] },
      ],
      order: orderClause,
      offset,
      limit: lim,
    });
    res.json({ success: true, data: { gigs, total, page: pg, pages: Math.ceil(total / lim) } });
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
    const [
      [{ total: totalHours }],
      totalUsers,
      volunteerVerified,
      volunteerPending,
      volunteerRejected,
      orgVerified,
      orgPending,
      adminCount,
      totalGigs,
      openGigs,
      closedGigs,
      cancelledGigs,
      totalApplications,
      approvedApplications,
      rejectedApplications,
      approvedTasks,
      autoApproved,
      pendingTasksCount,
      rejectedTasks,
      totalOrgs,
      topOrgs,
    ] = await Promise.all([
      HourRecord.findAll({ attributes: [[fn('SUM', col('hours')), 'total']], raw: true }),
      User.count(),
      User.count({ where: { role: 'volunteer', verificationStatus: 'verified' } }),
      User.count({ where: { role: 'volunteer', verificationStatus: 'pending' } }),
      User.count({ where: { role: 'volunteer', verificationStatus: 'rejected' } }),
      User.count({ where: { role: 'org', verificationStatus: 'verified' } }),
      User.count({ where: { role: 'org', verificationStatus: 'pending' } }),
      User.count({ where: { role: 'admin' } }),
      Gig.count(),
      Gig.count({ where: { status: 'open' } }),
      Gig.count({ where: { status: 'closed' } }),
      Gig.count({ where: { status: 'cancelled' } }),
      Application.count(),
      Application.count({ where: { status: 'approved' } }),
      Application.count({ where: { status: 'rejected' } }),
      Task.count({ where: { status: 'approved' } }),
      Task.count({ where: { autoApprovedAt: { [Op.ne]: null } } }),
      Task.count({ where: { status: 'completed' } }),
      Task.count({ where: { status: 'rejected' } }),
      Organization.count(),
      Organization.findAll({
        attributes: ['orgName', 'totalFacilitatedHours'],
        where: { totalFacilitatedHours: { [Op.gt]: 0 } },
        order: [['totalFacilitatedHours', 'DESC']],
        limit: 5,
        raw: true,
      }),
    ]);

    const autoApprovalRate = approvedTasks > 0 ? parseFloat(((autoApproved / approvedTasks) * 100).toFixed(1)) : 0;
    const fillRate = totalGigs > 0 ? parseFloat(((closedGigs / totalGigs) * 100).toFixed(1)) : 0;

    res.json({
      success: true,
      data: {
        totalUsers,
        totalVerifiedHours: totalHours || 0,
        totalOrgs,
        totalGigs,
        openGigs,
        autoApprovalRate,
        volunteers: { verified: volunteerVerified, pending: volunteerPending, rejected: volunteerRejected, total: volunteerVerified + volunteerPending + volunteerRejected },
        orgs: { verified: orgVerified, pending: orgPending, total: orgVerified + orgPending },
        gigs: { open: openGigs, closed: closedGigs, cancelled: cancelledGigs, total: totalGigs, fillRate },
        applications: { total: totalApplications, approved: approvedApplications, rejected: rejectedApplications, pending: totalApplications - approvedApplications - rejectedApplications },
        tasks: { approved: approvedTasks, rejected: rejectedTasks, pending: pendingTasksCount, autoApproved, autoApprovalRate },
        adminCount,
        topOrgs,
      },
    });
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

router.get('/gigs/:id/applications', ...adminAuth, async (req, res, next) => {
  try {
    const gig = await Gig.findByPk(req.params.id, {
      include: [
        { model: Organization, as: 'org', attributes: ['orgName'] },
        { model: Category, as: 'category', attributes: ['name', 'colorHex'] },
      ],
    });
    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found.' });
    const applications = await Application.findAll({
      where: { gigId: gig.id },
      include: [{ model: User, as: 'volunteer', attributes: ['id', 'email', 'verificationStatus', 'avatarUrl'],
        include: [{ model: VolunteerProfile, as: 'volunteerProfile' }] }],
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, data: { gig, applications } });
  } catch (err) { next(err); }
});

router.patch('/gigs/:gigId/applications/:appId/decide', ...adminAuth, async (req, res, next) => {
  try {
    const { decision, reason } = req.body;
    if (!['approved', 'rejected'].includes(decision))
      return res.status(400).json({ success: false, message: 'Decision must be approved or rejected.' });
    const app = await Application.findByPk(req.params.appId);
    if (!app) return res.status(404).json({ success: false, message: 'Application not found.' });
    if (String(app.gigId) !== String(req.params.gigId))
      return res.status(400).json({ success: false, message: 'Application does not belong to this gig.' });
    await app.update({ status: decision, decisionReason: reason || null, decidedAt: new Date() });
    res.json({ success: true, message: `Application ${decision}.` });
  } catch (err) { next(err); }
});

router.get('/calendar', ...adminAuth, async (req, res, next) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
    const startOfMonth = `${year}-${String(month).padStart(2,'0')}-01`;
    const endDate = new Date(year, month, 0);
    const endOfMonth = `${year}-${String(month).padStart(2,'0')}-${String(endDate.getDate()).padStart(2,'0')}`;
    const gigs = await Gig.findAll({
      where: { startDate: { [Op.lte]: endOfMonth }, endDate: { [Op.gte]: startOfMonth } },
      attributes: ['id', 'title', 'startDate', 'endDate', 'startTime', 'endTime', 'locationType', 'maxVolunteers'],
      include: [
        { model: Organization, as: 'org', attributes: ['orgName'] },
        { model: Category, as: 'category', attributes: ['name', 'colorHex'] },
        { model: Task, foreignKey: 'gigId',
          where: { status: { [Op.in]: ['accepted', 'inProgress', 'completed', 'approved'] } },
          required: false,
          include: [{ model: User, as: 'volunteer', attributes: ['id', 'email', 'avatarUrl'],
            include: [{ model: VolunteerProfile, as: 'volunteerProfile', attributes: ['firstName', 'lastName'] }] }] },
      ],
    });
    const byDate = {};
    gigs.forEach(g => {
      const obj = g.toJSON();
      const activeTasks = (obj.Tasks || []).filter(t => ['accepted','inProgress','completed','approved'].includes(t.status));
      obj.acceptedCount = activeTasks.length;
      obj.isFull = obj.maxVolunteers != null && obj.acceptedCount >= obj.maxVolunteers;
      for (let d = new Date(g.startDate); d <= new Date(g.endDate); d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        if (!byDate[key]) byDate[key] = [];
        byDate[key].push(obj);
      }
    });
    res.json({ success: true, data: { calendar: byDate, year, month } });
  } catch (err) { next(err); }
});

/* ── Announcements ── */
router.get('/announcements', ...adminAuth, async (req, res, next) => {
  try {
    const announcements = await Announcement.findAll({ order: [['createdAt', 'DESC']], limit: 50 });
    res.json({ success: true, data: { announcements } });
  } catch (err) { next(err); }
});

router.post('/announcements', ...adminAuth, async (req, res, next) => {
  try {
    const { title, body, targetGroup, sendEmails } = req.body;
    if (!title || !body || !targetGroup)
      return res.status(400).json({ success: false, message: 'title, body and targetGroup are required.' });
    if (!['all', 'volunteers', 'orgs', 'inactive'].includes(targetGroup))
      return res.status(400).json({ success: false, message: 'Invalid targetGroup.' });

    /* Resolve target users */
    const where = {};
    if (targetGroup === 'volunteers') {
      where.role = 'volunteer';
    } else if (targetGroup === 'orgs') {
      where.role = 'org';
    } else if (targetGroup === 'inactive') {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      where[Op.or] = [{ lastLoginAt: null }, { lastLoginAt: { [Op.lt]: cutoff } }];
      where.role = { [Op.in]: ['volunteer', 'org'] };
    } else {
      where.role = { [Op.in]: ['volunteer', 'org'] };
    }
    const targets = await User.findAll({ where, attributes: ['id', 'email'] });

    /* Bulk-create notifications */
    if (targets.length > 0) {
      await Notification.bulkCreate(targets.map(u => ({
        userId: u.id,
        message: `${title}: ${body.substring(0, 120)}${body.length > 120 ? '…' : ''}`,
        type: 'general',
        link: null,
      })));
    }

    /* Optionally send emails */
    if (sendEmails && targets.length > 0) {
      const tpl = templates.announcement(title, body);
      for (const u of targets) {
        try { await sendEmail(u.email, tpl.subject, tpl.html); } catch (_) {}
      }
    }

    const announcement = await Announcement.create({
      title, body, targetGroup,
      sentBy: req.user.id,
      recipientCount: targets.length,
    });

    res.status(201).json({ success: true, message: `Announcement sent to ${targets.length} users.`, data: { announcement } });
  } catch (err) { next(err); }
});

/* ── Mass Email to All Volunteers ── */
router.post('/email-volunteers', ...adminAuth, async (req, res, next) => {
  try {
    const { subject, body: emailBody, targetGroup = 'volunteers' } = req.body;
    if (!subject || !emailBody)
      return res.status(400).json({ success: false, message: 'subject and body are required.' });

    const where = {};
    if (targetGroup === 'volunteers') where.role = 'volunteer';
    else if (targetGroup === 'orgs') where.role = 'org';
    else where.role = { [Op.in]: ['volunteer', 'org'] };

    const users = await User.findAll({ where, attributes: ['id', 'email'] });

    if (users.length > 0) {
      await Notification.bulkCreate(users.map(u => ({
        userId: u.id,
        message: `${subject}: ${emailBody.substring(0, 120)}${emailBody.length > 120 ? '…' : ''}`,
        type: 'general',
        link: null,
      })));

      for (const u of users) {
        try {
          await sendEmail(u.email, subject, `<h2>${subject}</h2><p>${emailBody.replace(/\n/g, '<br>')}</p><p style="color:#64748b;font-size:13px;">Sent by ImpactCircle Admin</p>`);
        } catch (_) {}
      }
    }

    res.json({ success: true, message: `Email sent to ${users.length} users.`, data: { recipientCount: users.length } });
  } catch (err) { next(err); }
});

/* ── Gig attendance overview (admin) ── */
router.get('/gigs/:id/attendance', ...adminAuth, async (req, res, next) => {
  try {
    const gig = await Gig.findByPk(req.params.id, {
      include: [
        { model: Organization, as: 'org', attributes: ['orgName'] },
        { model: Category, as: 'category', attributes: ['name'] },
      ],
    });
    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found.' });

    const attendances = await Attendance.findAll({
      where: { gigId: gig.id },
      include: [{
        model: User, as: 'volunteer', attributes: ['id', 'email', 'avatarUrl'],
        include: [{ model: VolunteerProfile, as: 'volunteerProfile', attributes: ['firstName', 'lastName', 'phone'] }],
      }],
      order: [['checkInAt', 'DESC']],
    });

    const tasks = await Task.findAll({
      where: { gigId: gig.id, status: { [Op.in]: ['accepted', 'inProgress'] } },
      attributes: ['volunteerId'],
    });

    const attendedIds = attendances.map(a => a.volunteerId);
    const absentVolunteerIds = tasks.filter(t => !attendedIds.includes(t.volunteerId)).map(t => t.volunteerId);

    res.json({
      success: true,
      data: {
        gig,
        attendances,
        stats: {
          totalSignedUp: tasks.length,
          totalAttended: attendances.length,
          totalAbsent: absentVolunteerIds.length,
          totalHours: attendances.reduce((sum, a) => sum + (a.hoursWorked || 0), 0),
        },
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
