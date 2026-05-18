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
        const hoursWorked = parseFloat(((eventEnd - new Date(attendance.checkInAt)) / 3600000).toFixed(2));
        await attendance.update({
          checkOutAt: eventEnd,
          hoursWorked: Math.max(hoursWorked, 0),
          autoCheckedOut: true,
        });

        const profile = await VolunteerProfile.findOne({ where: { userId: attendance.volunteerId } });
        if (profile && hoursWorked > 0) {
          await profile.increment('totalVerifiedHours', { by: hoursWorked });
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
