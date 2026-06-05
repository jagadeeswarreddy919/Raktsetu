const nodemailer = require('nodemailer');

const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = parseInt(process.env.SMTP_PORT || '465');
const smtpUser = process.env.SMTP_USER || 'onedropu@gmail.com';
const smtpPass = process.env.SMTP_PASS;

// Initialize transporter
const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465, // secure:true for port 465, false for 587
  auth: {
    user: smtpUser,
    pass: smtpPass
  },
  tls: {
    rejectUnauthorized: false // Avoid local environment certificate rejection issues
  }
});

const sendMail = async ({ to, subject, html }) => {
  try {
    // If SMTP_PASS is empty (not yet set by user), print to console instead of throwing errors
    if (!smtpPass || smtpPass.trim() === '') {
      console.warn(`\n[Mail Warning] SMTP_PASS is not configured. Email to ${to} is intercepted and printed below:`);
      console.log(`======================================================================`);
      console.log(`SENDER  : "ONEDROP Team" <${smtpUser}>`);
      console.log(`RECIPIENT: ${to}`);
      console.log(`SUBJECT  : ${subject}`);
      console.log(`CONTENT  :`);
      console.log(html);
      console.log(`======================================================================\n`);
      return { messageId: `mock-dev-console-mail-${Date.now()}` };
    }

    const info = await transporter.sendMail({
      from: `"ONEDROP Team" <${smtpUser}>`,
      to,
      subject,
      html
    });
    console.log(`[Mail] Email successfully sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[Mail] Send failed for ${to}: ${error.message}`);
    // Return null instead of crashing server so registration and reset flows remain functional
    return null;
  }
};

module.exports = { sendMail };
