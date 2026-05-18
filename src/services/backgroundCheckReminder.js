const cron = require('node-cron');
const { Op } = require('sequelize');
const { User, VolunteerProfile, Notification } = require('../models/index');
const { sendEmail } = require('./email');
const { createNotification } = require('./notifications');

async function remindVolunteersBackgroundCheck() {
  try {
    const profiles = await VolunteerProfile.findAll({
      where: {
        [Op.or]: [
          { backgroundCheckStatus: 'not_submitted' },
          { backgroundCheckStatus: 'expired' },
        ],
        [Op.or]: [
          { backgroundCheckReminded: null },
          { backgroundCheckReminded: { [Op.lt]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        ],
      },
      include: [{ model: User, attributes: ['id', 'email'] }],
    });

    for (const profile of profiles) {
      if (!profile.User) continue;

      const name = profile.firstName || profile.User.email.split('@')[0];
      const isExpired = profile.backgroundCheckStatus === 'expired';
      const subject = isExpired
        ? 'Your background check has expired — please renew'
        : 'Reminder: Complete your background check';
      const html = `
        <h2>Hi ${name},</h2>
        <p>${isExpired
          ? 'Your background check has expired. Some gigs require a valid background check.'
          : 'To access all volunteer opportunities, please complete your background check.'
        }</p>
        <p>Many organizations require this for their events. Upload your background check document in your profile settings.</p>
        <p style="color:#64748b;font-size:13px;">This is an automated reminder from ImpactCircle.</p>
      `;

      await sendEmail(profile.User.email, subject, html);
      await createNotification(
        profile.User.id,
        isExpired
          ? 'Your background check has expired. Please renew it in your profile.'
          : 'Reminder: Please complete your background check to access more opportunities.',
        'general',
        '/volunteer-profile'
      );
      await profile.update({ backgroundCheckReminded: new Date() });
    }

    if (profiles.length > 0) {
      console.log(`[BG-CHECK] Reminded ${profiles.length} volunteers about background check.`);
    }
  } catch (err) {
    console.error('[BG-CHECK] Error:', err.message);
  }
}

function start() {
  cron.schedule('0 9 * * 1', remindVolunteersBackgroundCheck);
  console.log('[BG-CHECK] Cron scheduled: Mondays at 9 AM');
}

module.exports = { start, remindVolunteersBackgroundCheck };
