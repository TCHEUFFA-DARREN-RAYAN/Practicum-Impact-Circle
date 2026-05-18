const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { fn, col, Op } = require('sequelize');
const { requireAuth, requireRole } = require('../middleware/auth');
const { Organization, Gig, Application, Task, HourRecord, Category, User, VolunteerProfile, Notification, Attendance } = require('../models/index');
const { sendEmail } = require('../services/email');
const { createNotification } = require('../services/notifications');

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../src/uploads', String(req.user.id));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `logo-${Date.now()}${path.extname(file.originalname)}`);
  },
});
const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (!allowed.includes(path.extname(file.originalname).toLowerCase()))
      return cb(new Error('Only image files are allowed.'));
    cb(null, true);
  },
});

router.get('/me', requireAuth, requireRole('org'), async (req, res, next) => {
  try {
    const org = await Organization.findOne({ where: { userId: req.user.id } });
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found.' });
    res.json({ success: true, data: { org } });
  } catch (err) { next(err); }
});

router.put('/me', requireAuth, requireRole('org'), async (req, res, next) => {
  try {
    const allowed = ['orgName', 'missionStatement', 'categories', 'contactName', 'contactEmail', 'contactPhone', 'address', 'website', 'province', 'city'];
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

router.get('/me/applications', requireAuth, requireRole('org'), async (req, res, next) => {
  try {
    const org = await Organization.findOne({ where: { userId: req.user.id } });
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found.' });

    const applications = await Application.findAll({
      include: [
        {
          model: Gig,
          as: 'gig',
          where: { orgId: org.id },
          required: true,
          include: [{ model: Category, as: 'category', attributes: ['name', 'colorHex', 'icon'] }],
        },
        {
          model: User,
          as: 'volunteer',
          attributes: ['id', 'email', 'verificationStatus', 'avatarUrl'],
          include: [{ model: VolunteerProfile, as: 'volunteerProfile' }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ success: true, data: { applications } });
  } catch (err) { next(err); }
});

router.get('/me/analytics', requireAuth, requireRole('org'), async (req, res, next) => {
  try {
    const org = await Organization.findOne({ where: { userId: req.user.id } });
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found.' });

    const gigs = await Gig.findAll({
      where: { orgId: org.id },
      attributes: ['id', 'title', 'status', 'applicantCount', 'viewCount'],
      include: [{ model: Category, as: 'category', attributes: ['name', 'colorHex', 'icon'] }],
      order: [['createdAt', 'DESC']],
    });

    const gigIds = gigs.map(g => g.id);

    if (gigIds.length === 0) {
      return res.json({
        success: true,
        data: {
          org: { name: org.orgName, totalFacilitatedHours: org.totalFacilitatedHours || 0 },
          gigs: { open: 0, closed: 0, cancelled: 0, total: 0 },
          applications: { total: 0, approved: 0, rejected: 0, pending: 0 },
          tasks: { approved: 0, rejected: 0, pending: 0, autoApproved: 0, autoApprovalRate: 0 },
          perGig: [],
        },
      });
    }

    const [
      totalApplications,
      approvedApplications,
      rejectedApplications,
      approvedTasks,
      rejectedTasks,
      pendingTasksCount,
      autoApprovedCount,
    ] = await Promise.all([
      Application.count({ where: { gigId: { [Op.in]: gigIds } } }),
      Application.count({ where: { gigId: { [Op.in]: gigIds }, status: 'approved' } }),
      Application.count({ where: { gigId: { [Op.in]: gigIds }, status: 'rejected' } }),
      Task.count({ where: { orgId: org.id, status: 'approved' } }),
      Task.count({ where: { orgId: org.id, status: 'rejected' } }),
      Task.count({ where: { orgId: org.id, status: 'completed' } }),
      Task.count({ where: { orgId: org.id, autoApprovedAt: { [Op.ne]: null } } }),
    ]);

    const autoApprovalRate = approvedTasks > 0 ? parseFloat(((autoApprovedCount / approvedTasks) * 100).toFixed(1)) : 0;

    const perGig = await Promise.all(gigs.map(async (g) => {
      const [gigApprovedTasks, gigHoursRaw] = await Promise.all([
        Task.count({ where: { gigId: g.id, status: 'approved' } }),
        HourRecord.findAll({ attributes: [[fn('SUM', col('hours')), 'total']], where: { gigId: g.id }, raw: true }),
      ]);
      return {
        id: g.id,
        title: g.title,
        status: g.status,
        applications: g.applicantCount || 0,
        category: g.category,
        approvedTasks: gigApprovedTasks,
        hoursGenerated: parseFloat((gigHoursRaw[0]?.total || 0).toFixed(1)),
        viewCount: g.viewCount || 0,
      };
    }));

    res.json({
      success: true,
      data: {
        org: { name: org.orgName, totalFacilitatedHours: org.totalFacilitatedHours || 0 },
        gigs: {
          open: gigs.filter(g => g.status === 'open').length,
          closed: gigs.filter(g => g.status === 'closed').length,
          cancelled: gigs.filter(g => g.status === 'cancelled').length,
          total: gigs.length,
        },
        applications: {
          total: totalApplications,
          approved: approvedApplications,
          rejected: rejectedApplications,
          pending: totalApplications - approvedApplications - rejectedApplications,
        },
        tasks: { approved: approvedTasks, rejected: rejectedTasks, pending: pendingTasksCount, autoApproved: autoApprovedCount, autoApprovalRate },
        perGig,
      },
    });
  } catch (err) { next(err); }
});

router.get('/me/volunteers', requireAuth, requireRole('org'), async (req, res, next) => {
  try {
    const org = await Organization.findOne({ where: { userId: req.user.id } });
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found.' });

    const tasks = await Task.findAll({
      where: { orgId: org.id, status: ['approved', 'inProgress', 'completed'] },
      include: [
        { model: Gig, as: 'gig', attributes: ['id', 'title', 'estimatedHours'] },
        {
          model: User, as: 'volunteer', attributes: ['id', 'email'],
          include: [{ model: VolunteerProfile, as: 'volunteerProfile', attributes: ['firstName', 'lastName', 'phone', 'totalVerifiedHours', 'skills'] }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    /* Group by volunteer */
    const map = {};
    for (const t of tasks) {
      const vid = t.volunteerId;
      if (!map[vid]) {
        map[vid] = { volunteer: t.volunteer, tasks: [], totalHours: 0, isActive: false, lastActive: null };
      }
      map[vid].tasks.push(t);
      if (t.status === 'approved') map[vid].totalHours += (t.gig?.estimatedHours || 0);
      if (t.status === 'inProgress') map[vid].isActive = true;
      const lat = t.verifiedAt || t.submittedAt || t.createdAt;
      if (!map[vid].lastActive || (lat && new Date(lat) > new Date(map[vid].lastActive))) map[vid].lastActive = lat;
    }

    const volunteers = Object.values(map).map(v => ({
      ...v,
      sessionCount: v.tasks.length,
      isRecurring: v.tasks.length >= 2,
    }));

    res.json({ success: true, data: { volunteers } });
  } catch (err) { next(err); }
});

router.post('/me/logo', requireAuth, requireRole('org'), logoUpload.single('logo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
    await Organization.update({ logoUrl: req.file.filename }, { where: { userId: req.user.id } });
    res.json({ success: true, message: 'Logo updated.', data: { logoUrl: req.file.filename } });
  } catch (err) { next(err); }
});

router.get('/me/calendar', requireAuth, requireRole('org'), async (req, res, next) => {
  try {
    const org = await Organization.findOne({ where: { userId: req.user.id } });
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found.' });
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
    const startOfMonth = `${year}-${String(month).padStart(2,'0')}-01`;
    const endDate = new Date(year, month, 0);
    const endOfMonth = `${year}-${String(month).padStart(2,'0')}-${String(endDate.getDate()).padStart(2,'0')}`;
    const gigs = await Gig.findAll({
      where: { orgId: org.id, startDate: { [Op.lte]: endOfMonth }, endDate: { [Op.gte]: startOfMonth } },
      attributes: ['id', 'title', 'startDate', 'endDate', 'startTime', 'endTime', 'locationType', 'maxVolunteers'],
      include: [{
        model: Task, foreignKey: 'gigId',
        where: { status: { [Op.in]: ['accepted', 'inProgress', 'completed', 'approved'] } },
        required: false,
        include: [{ model: User, as: 'volunteer', attributes: ['id', 'email', 'avatarUrl'],
          include: [{ model: VolunteerProfile, as: 'volunteerProfile', attributes: ['firstName', 'lastName'] }] }],
      }],
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

/* POST /api/orgs/me/announcements — send a notification to all volunteers with approved applications */
router.post('/me/announcements', requireAuth, requireRole('org'), async (req, res, next) => {
  try {
    const { title, body } = req.body;
    if (!title || !body)
      return res.status(400).json({ success: false, message: 'title and body are required.' });

    const org = await Organization.findOne({ where: { userId: req.user.id } });
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found.' });

    /* Find all gigs for this org */
    const gigs = await Gig.findAll({ where: { organizationId: org.id }, attributes: ['id'] });
    const gigIds = gigs.map(g => g.id);
    if (!gigIds.length)
      return res.json({ success: true, message: 'Announcement sent to 0 volunteers.', data: { recipientCount: 0 } });

    /* Find approved volunteers (deduplicated) */
    const applications = await Application.findAll({
      where: { gigId: { [Op.in]: gigIds }, status: 'approved' },
      attributes: ['volunteerId'],
    });
    const volunteerIds = [...new Set(applications.map(a => a.volunteerId))];
    if (!volunteerIds.length)
      return res.json({ success: true, message: 'Announcement sent to 0 volunteers (none approved yet).', data: { recipientCount: 0 } });

    /* Bulk-create in-app notifications */
    await Notification.bulkCreate(volunteerIds.map(uid => ({
      userId: uid,
      message: `${org.orgName}: ${title} — ${body.substring(0, 100)}${body.length > 100 ? '…' : ''}`,
      type: 'general',
      link: null,
    })));

    res.status(201).json({
      success: true,
      message: `Announcement sent to ${volunteerIds.length} volunteer${volunteerIds.length !== 1 ? 's' : ''}.`,
      data: { recipientCount: volunteerIds.length },
    });
  } catch (err) { next(err); }
});

/* POST /api/orgs/me/email-volunteers — send email + notification to all org's volunteers */
router.post('/me/email-volunteers', requireAuth, requireRole('org'), async (req, res, next) => {
  try {
    const { subject, body } = req.body;
    if (!subject || !body)
      return res.status(400).json({ success: false, message: 'subject and body are required.' });

    const org = await Organization.findOne({ where: { userId: req.user.id } });
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found.' });

    const gigs = await Gig.findAll({ where: { orgId: org.id }, attributes: ['id'] });
    const gigIds = gigs.map(g => g.id);
    if (!gigIds.length)
      return res.json({ success: true, message: 'No volunteers to email.', data: { recipientCount: 0 } });

    const applications = await Application.findAll({
      where: { gigId: { [Op.in]: gigIds }, status: 'approved' },
      attributes: ['volunteerId'],
    });
    const volunteerIds = [...new Set(applications.map(a => a.volunteerId))];
    if (!volunteerIds.length)
      return res.json({ success: true, message: 'No approved volunteers to email.', data: { recipientCount: 0 } });

    const volunteers = await User.findAll({
      where: { id: { [Op.in]: volunteerIds } },
      attributes: ['id', 'email'],
    });

    await Notification.bulkCreate(volunteers.map(u => ({
      userId: u.id,
      message: `${org.orgName}: ${subject} — ${body.substring(0, 100)}${body.length > 100 ? '…' : ''}`,
      type: 'general',
      link: null,
    })));

    for (const u of volunteers) {
      try {
        await sendEmail(u.email, `${org.orgName}: ${subject}`,
          `<h2>${subject}</h2><p>${body.replace(/\n/g, '<br>')}</p><p style="color:#64748b;font-size:13px;">Sent by ${org.orgName} via ImpactCircle</p>`);
      } catch (_) {}
    }

    res.json({
      success: true,
      message: `Email sent to ${volunteers.length} volunteers.`,
      data: { recipientCount: volunteers.length },
    });
  } catch (err) { next(err); }
});

/* GET /api/orgs/me/gigs-stats — get all gigs with applicant counts and attendance */
router.get('/me/gigs-stats', requireAuth, requireRole('org'), async (req, res, next) => {
  try {
    const org = await Organization.findOne({ where: { userId: req.user.id } });
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found.' });

    const gigs = await Gig.findAll({
      where: { orgId: org.id },
      include: [{ model: Category, as: 'category', attributes: ['name', 'colorHex', 'icon'] }],
      order: [['startDate', 'DESC']],
    });

    const gigsWithStats = await Promise.all(gigs.map(async (g) => {
      const [totalApplicants, approvedApplicants, attendanceCount] = await Promise.all([
        Application.count({ where: { gigId: g.id } }),
        Application.count({ where: { gigId: g.id, status: 'approved' } }),
        Attendance.count({ where: { gigId: g.id } }),
      ]);
      const isPast = new Date(g.endDate) < new Date();
      return {
        ...g.toJSON(),
        totalApplicants,
        approvedApplicants,
        attendanceCount,
        isPast,
        spotsRemaining: g.maxVolunteers ? Math.max(0, g.maxVolunteers - approvedApplicants) : null,
      };
    }));

    res.json({ success: true, data: { gigs: gigsWithStats } });
  } catch (err) { next(err); }
});

/* GET /api/orgs/me/attendance/:gigId — org attendance tracking for a specific gig */
router.get('/me/attendance/:gigId', requireAuth, requireRole('org'), async (req, res, next) => {
  try {
    const org = await Organization.findOne({ where: { userId: req.user.id } });
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found.' });

    const gig = await Gig.findOne({ where: { id: req.params.gigId, orgId: org.id } });
    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found.' });

    const attendances = await Attendance.findAll({
      where: { gigId: gig.id },
      include: [{
        model: User, as: 'volunteer', attributes: ['id', 'email', 'avatarUrl'],
        include: [{ model: VolunteerProfile, as: 'volunteerProfile', attributes: ['firstName', 'lastName', 'phone', 'skills'] }],
      }],
      order: [['checkInAt', 'DESC']],
    });

    const tasks = await Task.findAll({
      where: { gigId: gig.id, status: { [Op.in]: ['accepted', 'inProgress'] } },
      include: [{
        model: User, as: 'volunteer', attributes: ['id', 'email'],
        include: [{ model: VolunteerProfile, as: 'volunteerProfile', attributes: ['firstName', 'lastName'] }],
      }],
    });

    const attendedIds = attendances.map(a => a.volunteerId);
    const absentees = tasks.filter(t => !attendedIds.includes(t.volunteerId));

    res.json({
      success: true,
      data: {
        gig: { id: gig.id, title: gig.title, startDate: gig.startDate, endDate: gig.endDate, startTime: gig.startTime, endTime: gig.endTime },
        attendances,
        absentees,
        stats: {
          totalSignedUp: tasks.length,
          totalAttended: attendances.length,
          currentlyCheckedIn: attendances.filter(a => !a.checkOutAt).length,
          totalAbsent: absentees.length,
          totalHours: parseFloat(attendances.reduce((sum, a) => sum + (a.hoursWorked || 0), 0).toFixed(2)),
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
