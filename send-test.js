const nodemailer = require("nodemailer");

const SMTP_USER = "noreply@clinecxa.lk";
const SMTP_PASS = "WsukvEsVzuE6";

const transporter = nodemailer.createTransport({
  host: "smtp.zoho.com",
  port: 465,
  secure: true,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

async function sendTestEmail() {
  try {
    const info = await transporter.sendMail({
      from: '"Clinecxa Test" <noreply@clinecxa.lk>',
      to: "noreply@clinecxa.lk",
      subject: "Zoho SMTP Test Email",
      text: "This is a test email from your application using Zoho SMTP.",
      html: "<b>This is a test email from your application using Zoho SMTP.</b>",
    });

    console.log("Message sent: %s", info.messageId);
    process.exit(0);
  } catch (error) {
    console.error("Error sending email:", error);
    process.exit(1);
  }
}

sendTestEmail();
