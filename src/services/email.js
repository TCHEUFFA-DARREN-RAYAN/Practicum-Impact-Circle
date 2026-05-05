const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const sendEmail = async (to, subject, html) => {
  if (process.env.NODE_ENV === 'test') return;
  try {
    await transporter.sendMail({
      from: `"ImpactCircle" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('[EMAIL] Failed to send:', err.message);
  }
};

const templates = {
  welcome: (name) => ({
    subject: 'Welcome to ImpactCircle!',
    html: `<h2>Welcome, ${name}!</h2><p>Your account has been created. Complete your profile to start making an impact.</p>`,
  }),
  verificationApproved: (name) => ({
    subject: 'Your ImpactCircle account has been verified ',
    html: `<h2>Congratulations, ${name}!</h2><p>Your account has been verified. You can now access all features.</p>`,
  }),
  verificationRejected: (name, reason) => ({
    subject: 'ImpactCircle verification update',
    html: `<h2>Hi ${name},</h2><p>Your verification was not approved.</p><p><strong>Reason:</strong> ${reason}</p><p>You may resubmit your documents.</p>`,
  }),
  applicationDecision: (name, gigTitle, approved, reason) => ({
    subject: `Application ${approved ? 'approved' : 'rejected'}: ${gigTitle}`,
    html: `<h2>Hi ${name},</h2><p>Your application for <strong>${gigTitle}</strong> has been <strong>${approved ? 'approved' : 'rejected'}</strong>.</p>${!approved ? `<p>Reason: ${reason}</p>` : ''}`,
  }),
  taskApproved: (name, gigTitle, hours, points) => ({
    subject: `Task approved — ${hours} hours credited!`,
    html: `<h2>Hi ${name},</h2><p>Your task for <strong>${gigTitle}</strong> has been approved.</p><p><strong>${hours} hours</strong> and <strong>${points} points</strong> have been added to your account.</p>`,
  }),
  taskRejected: (name, gigTitle, reason) => ({
    subject: `Task completion update — ${gigTitle}`,
    html: `<h2>Hi ${name},</h2><p>Your task completion for <strong>${gigTitle}</strong> was not approved.</p><p><strong>Reason:</strong> ${reason}</p>`,
  }),
  pendingApprovalReminder: (orgName, gigTitle, daysPending) => ({
    subject: `⏰ Action required: Task approval pending (Day ${daysPending})`,
    html: `<h2>Hi ${orgName},</h2><p>A volunteer task completion for <strong>${gigTitle}</strong> has been pending for <strong>${daysPending} days</strong>.</p><p>Please log in to review. Auto-approval occurs at Day 30.</p>`,
  }),
  autoApproved: (name, gigTitle, hours, points) => ({
    subject: `Task auto-approved — ${hours} hours credited`,
    html: `<h2>Hi ${name},</h2><p>Your task for <strong>${gigTitle}</strong> was automatically approved after 30 days.</p><p><strong>${hours} hours</strong> and <strong>${points} points</strong> have been credited.</p>`,
  }),
  rewardRedeemed: (name, rewardName) => ({
    subject: `Reward redeemed: ${rewardName}`,
    html: `<h2>Congratulations, ${name}!</h2><p>You've successfully redeemed <strong>${rewardName}</strong>. Check your dashboard for details.</p>`,
  }),
};

module.exports = { sendEmail, templates };
