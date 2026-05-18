const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { User, VolunteerProfile } = require('../models/index');

/**
 * GET /api/export/volunteers
 * Export all volunteer data as CSV (admin only)
 */
router.get('/volunteers', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { format = 'csv' } = req.query;

    const volunteers = await User.findAll({
      where: { role: 'volunteer' },
      attributes: ['id', 'email', 'verificationStatus', 'createdAt', 'lastLoginAt'],
      include: [{
        model: VolunteerProfile,
        as: 'volunteerProfile',
        attributes: [
          'firstName', 'lastName', 'phone', 'dateOfBirth', 'gender', 'country',
          'province', 'city', 'address', 'languages', 'skills', 'interests',
          'totalVerifiedHours', 'totalPoints', 'backgroundCheck',
          'backgroundCheckStatus', 'hasDrivingLicense', 'weeklyAvailabilityHours',
        ],
      }],
      order: [['createdAt', 'DESC']],
    });

    if (format === 'json') {
      return res.json({ success: true, data: { volunteers, total: volunteers.length } });
    }

    const headers = [
      'ID', 'Email', 'First Name', 'Last Name', 'Phone', 'Date of Birth',
      'Gender', 'Country', 'Province', 'City', 'Address', 'Languages',
      'Skills', 'Interests', 'Verification Status', 'Total Verified Hours',
      'Total Points', 'Background Check Status', 'Has Driving License',
      'Weekly Availability Hours', 'Registered At', 'Last Login',
    ];

    const rows = volunteers.map(v => {
      const p = v.volunteerProfile || {};
      return [
        v.id,
        `"${v.email}"`,
        `"${p.firstName || ''}"`,
        `"${p.lastName || ''}"`,
        `"${p.phone || ''}"`,
        p.dateOfBirth || '',
        `"${p.gender || ''}"`,
        `"${p.country || ''}"`,
        `"${p.province || ''}"`,
        `"${p.city || ''}"`,
        `"${(p.address || '').replace(/"/g, '""')}"`,
        `"${Array.isArray(p.languages) ? p.languages.join('; ') : ''}"`,
        `"${Array.isArray(p.skills) ? p.skills.join('; ') : ''}"`,
        `"${Array.isArray(p.interests) ? p.interests.join('; ') : ''}"`,
        v.verificationStatus,
        p.totalVerifiedHours || 0,
        p.totalPoints || 0,
        p.backgroundCheckStatus || 'not_submitted',
        p.hasDrivingLicense ? 'Yes' : 'No',
        p.weeklyAvailabilityHours || 0,
        v.createdAt ? v.createdAt.toISOString().slice(0, 10) : '',
        v.lastLoginAt ? v.lastLoginAt.toISOString().slice(0, 10) : 'Never',
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="volunteers-export.csv"');
    res.send(csv);
  } catch (err) { next(err); }
});

/**
 * GET /api/export/volunteers/summary
 * Get a summary of volunteer data for the admin dashboard
 */
router.get('/volunteers/summary', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { Op, fn, col } = require('sequelize');
    const total = await User.count({ where: { role: 'volunteer' } });

    const genderBreakdown = await VolunteerProfile.findAll({
      attributes: ['gender', [fn('COUNT', col('gender')), 'count']],
      where: { gender: { [Op.ne]: null } },
      group: ['gender'],
      raw: true,
    });

    const countryBreakdown = await VolunteerProfile.findAll({
      attributes: ['country', [fn('COUNT', col('country')), 'count']],
      where: { country: { [Op.ne]: null } },
      group: ['country'],
      raw: true,
    });

    const bgCheckBreakdown = await VolunteerProfile.findAll({
      attributes: ['backgroundCheckStatus', [fn('COUNT', col('backgroundCheckStatus')), 'count']],
      group: ['backgroundCheckStatus'],
      raw: true,
    });

    res.json({
      success: true,
      data: { total, genderBreakdown, countryBreakdown, bgCheckBreakdown },
    });
  } catch (err) { next(err); }
});

module.exports = router;
