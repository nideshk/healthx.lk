const nodemailer = require("nodemailer");

// Manually provided credentials for verification
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

console.log("Verifying connection for user:", SMTP_USER);

transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP connection failed:", error);
    process.exit(1);
  } else {
    console.log("📨 SMTP server is ready to send emails");
    process.exit(0);
  }
});
