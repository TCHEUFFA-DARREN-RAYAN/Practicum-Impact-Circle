const cron = require('node-cron');
const { Op } = require('sequelize');
const { Task, Gig, User, Organization } = require('../models/index');
const { awardPoints } = require('./points');
const { sendEmail, templates } = require('./email');
const { createNotification } = require('./notifications');

const DAY_MS = 24 * 60 * 60 * 1000;

const processAutoApprovals = async () => {
  const cutoff = new Date(Date.now() - 30 * DAY_MS);
  const pending = await Task.findAll({ where: { status: 'completed', submittedAt: { [Op.lte]: cutoff } } });

  for (const task of pending) {
    try {
      const gig = await Gig.findByPk(task.gigId);
      if (!gig) continue;

      const { hours, points } = await awardPoints(task.volunteerId, task, gig, true);
      await task.update({ status: 'approved', autoApprovedAt: new Date() });

      const volunteer = await User.findByPk(task.volunteerId);
      if (volunteer) {
        const tpl = templates.autoApproved(volunteer.email.split('@')[0], gig.title, hours, points);
        await sendEmail(volunteer.email, tpl.subject, tpl.html);
      }
      await createNotification(task.volunteerId, `Task auto-approved for "${gig.title}" — ${hours}h credited`, 'task', '/volunteer-dashboard');
    } catch (err) {
      console.error('[AUTO-APPROVE] Error:', err.message);
    }
  }
};

const sendReminders = async () => {
  const remindDays = [7, 15, 28];
  for (const day of remindDays) {
    const start = new Date(Date.now() - (day + 1) * DAY_MS);
    const end = new Date(Date.now() - day * DAY_MS);
    const tasks = await Task.findAll({ where: { status: 'completed', submittedAt: { [Op.between]: [start, end] } } });

    for (const task of tasks) {
      const reminders = task.remindersSent || [];
      if (reminders.includes(day)) continue;
      try {
        const [gig, org] = await Promise.all([Gig.findByPk(task.gigId), Organization.findByPk(task.orgId)]);
        if (!gig || !org) continue;
        const orgUser = await User.findByPk(org.userId);
        if (orgUser) {
          const tpl = templates.pendingApprovalReminder(org.orgName, gig.title, day);
          await sendEmail(orgUser.email, tpl.subject, tpl.html);
        }
        await task.update({ remindersSent: [...reminders, day] });
      } catch (err) {
        console.error('[REMINDER] Error:', err.message);
      }
    }
  }
};

const start = () => {
  cron.schedule('0 2 * * *', async () => {
    console.log('[CRON] Running auto-approval and reminders...');
    await sendReminders();
    await processAutoApprovals();
  });
  console.log('⏰  Auto-approval cron scheduled (daily at 02:00)');
};

module.exports = { start, processAutoApprovals };
