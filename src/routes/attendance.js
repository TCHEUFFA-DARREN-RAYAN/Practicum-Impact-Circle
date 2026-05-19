const router = require('express').Router();
const { Op } = require('sequelize');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/auth');
const { Gig, GigQrCode, Attendance, Organization, User, VolunteerProfile, Category, Task } = require('../models/index');
const { createNotification } = require('../services/notifications');

let QRCode;
try { QRCode = require('qrcode'); } catch (_) { QRCode = null; }

/* Build the public base URL for QR / check-in links. Order of preference:
   1. Explicit env override (PUBLIC_APP_URL / CLIENT_URL) — set this on prod.
   2. The host the org is currently using to access the app. This lets a gig
      created on a hosted domain produce a hosted-domain QR, while a gig
      created during local dev produces a localhost QR — automatically.
   3. Localhost fallback (shouldn't normally hit this). */
function getBaseUrl(req) {
  if (process.env.PUBLIC_APP_URL) return process.env.PUBLIC_APP_URL.replace(/\/+$/, '');
  if (process.env.CLIENT_URL)     return process.env.CLIENT_URL.replace(/\/+$/, '');
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host  = req.headers['x-forwarded-host']  || req.get('host');
  if (host) return `${proto}://${host}`;
  return `http://localhost:${process.env.PORT || 5000}`;
}

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

    const checkinUrl = `${getBaseUrl(req)}/checkin/${qrRecord.token}`;

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
 * POST /api/attendance/gig/:gigId/qr/regenerate
 * Rotate the QR token (org only). The old QR stops scanning, but volunteers
 * who already checked in stay checked in — attendance rows are keyed by
 * gigId + volunteerId, not by the token, and user logins are JWT-based so
 * they are unaffected.
 */
router.post('/gig/:gigId/qr/regenerate', requireAuth, requireRole('org'), async (req, res, next) => {
  try {
    const org = await Organization.findOne({ where: { userId: req.user.id } });
    if (!org) return res.status(403).json({ success: false, message: 'Organization not found.' });

    const gig = await Gig.findOne({ where: { id: req.params.gigId, orgId: org.id } });
    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found.' });

    let qrRecord = await GigQrCode.findOne({ where: { gigId: gig.id } });
    const newToken = require('crypto').randomUUID();
    if (qrRecord) {
      await qrRecord.update({ token: newToken, isActive: true });
    } else {
      qrRecord = await GigQrCode.create({ gigId: gig.id, token: newToken });
    }

    const checkinUrl = `${getBaseUrl(req)}/checkin/${qrRecord.token}`;
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
 * Volunteer checks in to an event via QR code.
 *
 * - First time for this (gig, volunteer): create a new Attendance row.
 * - Already checked in (open session): 409.
 * - Came back after a previous check-out: REUSE the existing row — clear
 *   checkOutAt, set currentSessionStartedAt = now. The original checkInAt
 *   stays anchored to the very first arrival, and hoursWorked carries over
 *   so we just keep accumulating on the next check-out.
 */
router.post('/checkin/:token', requireAuth, requireRole('volunteer'), async (req, res, next) => {
  try {
    const qrRecord = await GigQrCode.findOne({ where: { token: req.params.token } });
    if (!qrRecord) return res.status(404).json({ success: false, message: 'Invalid QR code.' });
    if (!qrRecord.isActive) return res.status(400).json({ success: false, message: 'Check-in is not currently active for this event.' });

    const gig = await Gig.findByPk(qrRecord.gigId);
    if (!gig) return res.status(404).json({ success: false, message: 'Event not found.' });

    const now = new Date();

    /* Check-in is allowed in the window [ start - 1 hour , end of event ].
       Some volunteers arrive a little early; before that we lock them out
       so people can't accidentally check in on the wrong day. After the
       event ends, the auto-checkout has likely already fired so a new
       check-in shouldn't create a new row. */
    const startBoundary = new Date(`${gig.startDate}T${gig.startTime || '00:00'}:00`);
    startBoundary.setHours(startBoundary.getHours() - 1);
    const endBoundary = new Date(`${gig.endDate}T${gig.endTime || '23:59:59'}`);

    if (now < startBoundary) {
      const fmt = startBoundary.toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' });
      return res.status(400).json({
        success: false,
        message: `Check-in opens at ${fmt} (1 hour before the gig starts). Please come back closer to the start time.`,
      });
    }
    if (now > endBoundary) {
      return res.status(400).json({
        success: false,
        message: 'This gig has already ended — check-in is no longer available.',
      });
    }

    const existing = await Attendance.findOne({
      where: { gigId: gig.id, volunteerId: req.user.id },
    });

    let attendance;
    let resumed = false;
    if (existing && !existing.checkOutAt) {
      return res.status(409).json({ success: false, message: 'You are already checked in to this event.' });
    } else if (existing) {
      /* Resume an earlier session: keep original checkInAt + hoursWorked,
         clear checkOutAt, mark when this new session started. */
      await existing.update({
        checkOutAt: null,
        currentSessionStartedAt: now,
        autoCheckedOut: false,
      });
      attendance = existing;
      resumed = true;
    } else {
      attendance = await Attendance.create({
        gigId: gig.id,
        volunteerId: req.user.id,
        checkInAt: now,
        currentSessionStartedAt: now,
      });
    }

    const org = await Organization.findByPk(gig.orgId);
    if (org) {
      const verb = resumed ? 'returned for another session at' : 'checked in to';
      await createNotification(org.userId, `Volunteer ${verb} "${gig.title}"`, 'general', `/org/attendance/${gig.id}`);
    }

    res.status(201).json({
      success: true,
      message: resumed ? 'Welcome back! Session resumed.' : 'Successfully checked in!',
      data: { attendance, resumed },
    });
  } catch (err) { next(err); }
});

/**
 * POST /api/attendance/checkout/:gigId
 * Volunteer manually checks out. Adds (now - currentSessionStartedAt) to
 * the existing hoursWorked total instead of overwriting it.
 */
router.post('/checkout/:gigId', requireAuth, requireRole('volunteer'), async (req, res, next) => {
  try {
    const attendance = await Attendance.findOne({
      where: { gigId: req.params.gigId, volunteerId: req.user.id, checkOutAt: null },
    });
    if (!attendance) return res.status(404).json({ success: false, message: 'No active check-in found.' });

    const checkOutAt = new Date();
    const sessionStart = attendance.currentSessionStartedAt
      ? new Date(attendance.currentSessionStartedAt)
      : new Date(attendance.checkInAt);
    const sessionHours = (checkOutAt - sessionStart) / 3600000;
    const totalHours = parseFloat(((parseFloat(attendance.hoursWorked) || 0) + sessionHours).toFixed(2));

    await attendance.update({
      checkOutAt,
      hoursWorked: totalHours,
      currentSessionStartedAt: null,
    });

    res.json({
      success: true,
      message: 'Successfully checked out!',
      data: { attendance, hoursWorked: totalHours, sessionHours: parseFloat(sessionHours.toFixed(2)) },
    });
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
 * Get volunteer's own attendance history (with optional active-session lookup)
 */
router.get('/my', requireAuth, requireRole('volunteer'), async (req, res, next) => {
  try {
    const attendances = await Attendance.findAll({
      where: { volunteerId: req.user.id },
      include: [{
        model: Gig, as: 'gig', attributes: ['id', 'title', 'startDate', 'endDate', 'estimatedHours'],
        include: [{ model: Organization, as: 'org', attributes: ['orgName', 'logoUrl'] }],
      }],
      order: [['checkInAt', 'DESC']],
    });

    const active = attendances.find(a => !a.checkOutAt) || null;
    const completed = attendances.filter(a => a.checkOutAt);
    const totalHours = parseFloat(completed.reduce((s, a) => s + (a.hoursWorked || 0), 0).toFixed(2));

    res.json({
      success: true,
      data: {
        attendances,
        active,
        stats: { totalSessions: completed.length, totalHours },
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
