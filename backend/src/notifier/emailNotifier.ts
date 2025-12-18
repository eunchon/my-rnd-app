import nodemailer from 'nodemailer';

type MailPayload = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
};

function isConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function buildTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendMail(payload: MailPayload) {
  if (!isConfigured()) {
    console.log('[notifier] SMTP not configured. Skipping email send.', {
      to: payload.to,
      subject: payload.subject,
    });
    return;
  }
  const transporter = buildTransport();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });
}
