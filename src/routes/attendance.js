const router = require('express').Router();
const { Op } = require('sequelize');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/auth');
const { Gig, GigQrCode, Attendance, Organization, User, VolunteerProfile, Category, Task } = require('../models/index');
const { createNotification } = require('../services/notifications');

let QRCode;
try { QRCode = require('qrcode'); } catch (_) { QRCode = null; }

/**
 * GET /api/attendance/gig/:gigId/qr
 * Generate or retrieve the QR code for a gig (org only)
 */
router.get('/gig/:gigId/qr', requireAuth, requireRole('org'), async (req, res, next) => {
  try {
    const org = await Organization.findOne({ where: { userId: req.user.id } });
    if (!org) return res.status(403).json({ success: false, message: 'Organization not found.' });

    const gig = await Gig.findOne({ where: { id: req.params.gigId, orgId: org.id } });
    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found.' });

    let qrRecord = await GigQrCode.findOne({ where: { gigId: gig.id } });
    if (!qrRecord) {
      qrRecord = await GigQrCode.create({ gigId: gig.id });
    }

    const baseUrl = process.env.PUBLIC_APP_URL || process.env.CLIENT_URL || `http://localhost:${process.env.PORT || 5000}`;
    const checkinUrl = `${baseUrl}/checkin/${qrRecord.token}`;

    let qrDataUrl = null;
    if (QRCode) {
      qrDataUrl = await QRCode.toDataURL(checkinUrl, { width: 400, margin: 2 });
    }

    res.json({
      success: true,
      data: {
        qrCode: qrDataUrl,
        checkinUrl,
        token: qrRecord.token,
        gigTitle: gig.title,
        isActive: qrRecord.isActive,
      },
    });
  } catch (err) { next(err); }
});

/**
 * PATCH /api/attendance/gig/:gigId/qr/toggle
 * Enable/disable the QR code (org only)
 */
router.patch('/gig/:gigId/qr/toggle', requireAuth, requireRole('org'), async (req, res, next) => {
  try {
    const org = await Organization.findOne({ where: { userId: req.user.id } });
    const gig = await Gig.findOne({ where: { id: req.params.gigId, orgId: org.id } });
    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found.' });

    const qrRecord = await GigQrCode.findOne({ where: { gigId: gig.id } });
    if (!qrRecord) return res.status(404).json({ success: false, message: 'QR code not found. Generate one first.' });

    await qrRecord.update({ isActive: !qrRecord.isActive });
    res.json({ success: true, data: { isActive: qrRecord.isActive } });
  } catch (err) { next(err); }
});

/**
 * GET /api/attendance/checkin/:token
 * Get event details when volunteer scans QR code (public or authenticated)
 */
router.get('/checkin/:token', optionalAuth, async (req, res, next) => {
  try {
    const qrRecord = await GigQrCode.findOne({ where: { token: req.params.token } });
    if (!qrRecord) return res.status(404).json({ success: false, message: 'Invalid QR code.' });
    if (!qrRecord.isActive) return res.status(400).json({ success: false, message: 'This QR code is no longer active.' });

    const gig = await Gig.findByPk(qrRecord.gigId, {
      include: [
        { model: Organization, as: 'org', attributes: ['orgName', 'address', 'logoUrl'] },
        { model: Category, as: 'category', attributes: ['name', 'colorHex', 'icon'] },
      ],
    });
    if (!gig) return res.status(404).json({ success: false, message: 'Event not found.' });

    let alreadyCheckedIn = false;
    if (req.user) {
      const existing = await Attendance.findOne({
        where: { gigId: gig.id, volunteerId: req.user.id, checkOutAt: null },
      });
      alreadyCheckedIn = !!existing;
    }

    res.json({
      success: true,
      data: {
        gig: {
          id: gig.id,
          title: gig.title,
          description: gig.description,
          startDate: gig.startDate,
          endDate: gig.endDate,
          startTime: gig.startTime,
          endTime: gig.endTime,
          locationType: gig.locationType,
          locationAddress: gig.locationAddress,
          organization: gig.org,
          category: gig.category,
        },
        alreadyCheckedIn,
        token: req.params.token,
      },
    });
  } catch (err) { next(err); }
});

/**
 * POST /api/attendance/checkin/:token
 * Volunteer checks in to event via QR code
 */
router.post('/checkin/:token', requireAuth, requireRole('volunteer'), async (req, res, next) => {
  try {
    const qrRecord = await GigQrCode.findOne({ where: { token: req.params.token } });
    if (!qrRecord) return res.status(404).json({ success: false, message: 'Invalid QR code.' });
    if (!qrRecord.isActive) return res.status(400).json({ success: false, message: 'Check-in is not currently active for this event.' });

    const gig = await Gig.findByPk(qrRecord.gigId);
    if (!gig) return res.status(404).json({ success: false, message: 'Event not found.' });

    const existing = await Attendance.findOne({
      where: { gigId: gig.id, volunteerId: req.user.id, checkOutAt: null },
    });
    if (existing) return res.status(409).json({ success: false, message: 'You are already checked in to this event.' });

    const attendance = await Attendance.create({
      gigId: gig.id,
      volunteerId: req.user.id,
      checkInAt: new Date(),
    });

    const org = await Organization.findByPk(gig.orgId);
    if (org) {
      await createNotification(org.userId, `Volunteer checked in to "${gig.title}"`, 'general', `/org/attendance/${gig.id}`);
    }

    res.status(201).json({ success: true, message: 'Successfully checked in!', data: { attendance } });
  } catch (err) { next(err); }
});

/**
 * POST /api/attendance/checkout/:gigId
 * Volunteer manually checks out
 */
router.post('/checkout/:gigId', requireAuth, requireRole('volunteer'), async (req, res, next) => {
  try {
    const attendance = await Attendance.findOne({
      where: { gigId: req.params.gigId, volunteerId: req.user.id, checkOutAt: null },
    });
    if (!attendance) return res.status(404).json({ success: false, message: 'No active check-in found.' });

    const checkOutAt = new Date();
    const hoursWorked = parseFloat(((checkOutAt - new Date(attendance.checkInAt)) / 3600000).toFixed(2));
    await attendance.update({ checkOutAt, hoursWorked });

    res.json({ success: true, message: 'Successfully checked out!', data: { attendance, hoursWorked } });
  } catch (err) { next(err); }
});

/**
 * GET /api/attendance/gig/:gigId
 * Get attendance records for a gig (org or admin)
 */
router.get('/gig/:gigId', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role === 'org') {
      const org = await Organization.findOne({ where: { userId: req.user.id } });
      const gig = await Gig.findOne({ where: { id: req.params.gigId, orgId: org.id } });
      if (!gig) return res.status(404).json({ success: false, message: 'Gig not found.' });
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const attendances = await Attendance.findAll({
      where: { gigId: req.params.gigId },
      include: [{
        model: User, as: 'volunteer', attributes: ['id', 'email', 'avatarUrl'],
        include: [{ model: VolunteerProfile, as: 'volunteerProfile', attributes: ['firstName', 'lastName', 'phone'] }],
      }],
      order: [['checkInAt', 'DESC']],
    });

    const gig = await Gig.findByPk(req.params.gigId, {
      attributes: ['id', 'title', 'startDate', 'endDate', 'startTime', 'endTime'],
    });

    const totalCheckedIn = attendances.filter(a => !a.checkOutAt).length;
    const totalAttended = attendances.filter(a => a.checkOutAt).length;
    const totalHours = attendances.reduce((sum, a) => sum + (a.hoursWorked || 0), 0);

    res.json({
      success: true,
      data: {
        gig,
        attendances,
        stats: { totalCheckedIn, totalAttended, totalHours: parseFloat(totalHours.toFixed(2)) },
      },
    });
  } catch (err) { next(err); }
});

/**
 * GET /api/attendance/gig/:gigId/absentees
 * Get volunteers who signed up but didn't attend (org or admin)
 */
router.get('/gig/:gigId/absentees', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role === 'org') {
      const org = await Organization.findOne({ where: { userId: req.user.id } });
      const gig = await Gig.findOne({ where: { id: req.params.gigId, orgId: org.id } });
      if (!gig) return res.status(404).json({ success: false, message: 'Gig not found.' });
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const tasks = await Task.findAll({
      where: { gigId: req.params.gigId, status: { [Op.in]: ['accepted', 'inProgress'] } },
      include: [{
        model: User, as: 'volunteer', attributes: ['id', 'email', 'avatarUrl'],
        include: [{ model: VolunteerProfile, as: 'volunteerProfile', attributes: ['firstName', 'lastName'] }],
      }],
    });

    const attendedIds = (await Attendance.findAll({
      where: { gigId: req.params.gigId },
      attributes: ['volunteerId'],
    })).map(a => a.volunteerId);

    const absentees = tasks.filter(t => !attendedIds.includes(t.volunteerId));

    res.json({ success: true, data: { absentees } });
  } catch (err) { next(err); }
});

/**
 * GET /api/attendance/my
 * Get volunteer's own attendance history
 */
router.get('/my', requireAuth, requireRole('volunteer'), async (req, res, next) => {
  try {
    const attendances = await Attendance.findAll({
      where: { volunteerId: req.user.id },
      include: [{
        model: Gig, as: 'gig', attributes: ['id', 'title', 'startDate', 'endDate'],
        include: [{ model: Organization, as: 'org', attributes: ['orgName'] }],
      }],
      order: [['checkInAt', 'DESC']],
    });
    res.json({ success: true, data: { attendances } });
  } catch (err) { next(err); }
});

module.exports = router;
