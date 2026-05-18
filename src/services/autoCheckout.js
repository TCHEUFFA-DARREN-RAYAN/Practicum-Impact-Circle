const cron = require('node-cron');
const { Op } = require('sequelize');
const { Attendance, Gig, VolunteerProfile } = require('../models/index');

async function autoCheckoutExpiredAttendances() {
  try {
    const now = new Date();
    const openAttendances = await Attendance.findAll({
      where: { checkOutAt: null },
      include: [{ model: Gig, as: 'gig', attributes: ['endDate', 'endTime'] }],
    });

    for (const attendance of openAttendances) {
      const gig = attendance.gig;
      if (!gig) continue;

      let eventEnd;
      if (gig.endTime) {
        eventEnd = new Date(`${gig.endDate}T${gig.endTime}`);
      } else {
        eventEnd = new Date(`${gig.endDate}T23:59:59`);
      }

      if (now > eventEnd) {
        /* Use the current open session's start, falling back to the very first
           check-in for legacy rows that pre-date currentSessionStartedAt. */
        const sessionStart = attendance.currentSessionStartedAt
          ? new Date(attendance.currentSessionStartedAt)
          : new Date(attendance.checkInAt);
        const sessionHours = Math.max(0, (eventEnd - sessionStart) / 3600000);
        const totalHours = parseFloat(((parseFloat(attendance.hoursWorked) || 0) + sessionHours).toFixed(2));

        await attendance.update({
          checkOutAt: eventEnd,
          hoursWorked: totalHours,
          currentSessionStartedAt: null,
          autoCheckedOut: true,
        });

        const profile = await VolunteerProfile.findOne({ where: { userId: attendance.volunteerId } });
        if (profile && sessionHours > 0) {
          await profile.increment('totalVerifiedHours', { by: parseFloat(sessionHours.toFixed(2)) });
        }
      }
    }
  } catch (err) {
    console.error('[AUTO-CHECKOUT] Error:', err.message);
  }
}

function start() {
  cron.schedule('*/15 * * * *', autoCheckoutExpiredAttendances);
  console.log('[AUTO-CHECKOUT] Cron scheduled: every 15 minutes');
}

module.exports = { start, autoCheckoutExpiredAttendances };
