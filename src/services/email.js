const nodemailer = require('nodemailer');

let cachedTransporter = null;
let etherealSetupPromise = null;

/** When false, TLS accepts self-signed / MITM proxies (dev only — never in production). */
function emailTlsOptions() {
  const insecure = String(process.env.EMAIL_TLS_REJECT_UNAUTHORIZED || '').toLowerCase() === 'false';
  return { rejectUnauthorized: !insecure };
}

function publicAppUrl() {
  return (
    process.env.PUBLIC_APP_URL ||
    process.env.CLIENT_URL ||
    `http://localhost:${process.env.PORT || 3000}`
  ).replace(/\/$/, '');
}

async function buildTransporter() {
  const useEthereal = String(process.env.EMAIL_USE_ETHEREAL || '').toLowerCase() === 'true';

  if (useEthereal) {
    if (!etherealSetupPromise) {
      etherealSetupPromise = (async () => {
        const testAccount = await nodemailer.createTestAccount();
        console.log('[EMAIL] Using Ethereal test SMTP (set EMAIL_USE_ETHEREAL=false to use real SMTP).');
        console.log('[EMAIL] Ethereal user:', testAccount.user);
        return nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: { user: testAccount.user, pass: testAccount.pass },
          tls: emailTlsOptions(),
        });
      })();
    }
    return etherealSetupPromise;
  }

  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  if (!host || !user) {
    console.warn('[EMAIL] EMAIL_HOST / EMAIL_USER missing. Set EMAIL_USE_ETHEREAL=true for local mail capture.');
  }

  return nodemailer.createTransport({
    host: host || 'smtp.ethereal.email',
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: String(process.env.EMAIL_SECURE || '').toLowerCase() === 'true',
    auth: user ? { user, pass: process.env.EMAIL_PASS || '' } : undefined,
    tls: emailTlsOptions(),
  });
}

async function getTransporter() {
  if (!cachedTransporter) {
    cachedTransporter = await buildTransporter();
  }
  return cachedTransporter;
}

/** Reset transporter (e.g. after env change) — mainly for tests */
function resetTransporterCache() {
  cachedTransporter = null;
  etherealSetupPromise = null;
}

const sendEmail = async (to, subject, html) => {
  if (process.env.NODE_ENV === 'test') return null;
  try {
    const transport = await getTransporter();
    const from =
      process.env.EMAIL_FROM ||
      `"ImpactCircle" <${process.env.EMAIL_USER || 'noreply@impactcircle.local'}>`;
    const info = await transport.sendMail({ from, to, subject, html });
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('[EMAIL] Open this link to view the message in Ethereal:', previewUrl);
    }
    return info;
  } catch (err) {
    console.error('[EMAIL] Failed to send:', err.message);
    throw err;
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
  passwordReset: (resetUrl) => ({
    subject: 'Reset your ImpactCircle password',
    html: `
      <h2>Password reset</h2>
      <p>We received a request to reset the password for your ImpactCircle account.</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#1e40af;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Choose a new password</a></p>
      <p>Or copy this link into your browser:</p>
      <p style="word-break:break-all;color:#475569;font-size:14px;">${resetUrl}</p>
      <p style="color:#64748b;font-size:13px;">This link expires in one hour. If you did not request a reset, you can ignore this email.</p>
    `,
  }),
};

module.exports = { sendEmail, templates, publicAppUrl, resetTransporterCache };
