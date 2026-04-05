import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.zoho.com",
  port: 465,
  secure: true, // use SSL
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const supportTransporter = nodemailer.createTransport({
  host: "smtp.zoho.com",
  port: 465,
  secure: true, // use SSL
  auth: {
    user: process.env.SUPPORT_USER,
    pass: process.env.SUPPORT_PASS,
  },
});

// Connect check (optional)
if (process.env.NODE_ENV === "development") {
  transporter.verify((err) => {
    if (err) {
      console.error("❌ SMTP connection failed:", err);
    } else {
      console.log("📨 SMTP server is ready to send emails");
    }
  });

  supportTransporter.verify((err) => {
    if (err) {
      console.error("❌ Support SMTP connection failed:", err);
    } else {
      console.log("📨 Support SMTP server is ready to send emails");
    }
  });
}

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  attachments?: any[];
};

export async function sendEmail({ to, subject, html, attachments }: SendEmailParams) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP credentials are missing");
  }

  return transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
    attachments,
  });
}

export async function sendSupportEmail({ to, subject, html, attachments }: SendEmailParams) {
  if (!process.env.SUPPORT_USER || !process.env.SUPPORT_PASS) {
    throw new Error("Support SMTP credentials are missing");
  }

  return supportTransporter.sendMail({
    from: process.env.SUPPORT_FROM || process.env.SUPPORT_USER,
    to,
    subject,
    html,
    attachments,
  });
}
