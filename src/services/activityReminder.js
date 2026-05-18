const cron = require('node-cron');
const { Op } = require('sequelize');
const { Gig, Task, User, VolunteerProfile, Organization, Notification } = require('../models/index');
const { sendEmail } = require('./email');
const { createNotification } = require('./notifications');

async function remindUpcomingActivities() {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    const gigs = await Gig.findAll({
      where: { startDate: tomorrowStr, status: 'open' },
      include: [{ model: Organization, as: 'org', attributes: ['orgName'] }],
    });

    for (const gig of gigs) {
      const tasks = await Task.findAll({
        where: { gigId: gig.id, status: { [Op.in]: ['accepted', 'inProgress'] } },
        include: [{
          model: User, as: 'volunteer', attributes: ['id', 'email'],
          include: [{ model: VolunteerProfile, as: 'volunteerProfile', attributes: ['firstName'] }],
        }],
      });

      for (const task of tasks) {
        if (!task.volunteer) continue;
        const name = task.volunteer.volunteerProfile?.firstName || task.volunteer.email.split('@')[0];
        const subject = `Reminder: "${gig.title}" starts tomorrow!`;
        const html = `
          <h2>Hi ${name},</h2>
          <p>This is a friendly reminder that <strong>${gig.title}</strong> starts tomorrow (${gig.startDate}).</p>
          ${gig.startTime ? `<p><strong>Time:</strong> ${gig.startTime}${gig.endTime ? ' - ' + gig.endTime : ''}</p>` : ''}
          ${gig.locationAddress ? `<p><strong>Location:</strong> ${gig.locationAddress}</p>` : ''}
          <p>Organization: ${gig.org?.orgName || 'Unknown'}</p>
          <p style="color:#64748b;font-size:13px;">This is an automated reminder from ImpactCircle.</p>
        `;

        await sendEmail(task.volunteer.email, subject, html);
        await createNotification(
          task.volunteer.id,
          `Reminder: "${gig.title}" starts tomorrow!`,
          'task',
          `/gigs/${gig.id}`
        );
      }
    }
  } catch (err) {
    console.error('[ACTIVITY-REMINDER] Error:', err.message);
  }
}

function start() {
  cron.schedule('0 18 * * *', remindUpcomingActivities);
  console.log('[ACTIVITY-REMINDER] Cron scheduled: daily at 6 PM');
}

module.exports = { start, remindUpcomingActivities };
