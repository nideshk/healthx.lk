type BaseEmailParams = {
  recipientName?: string;
  eventType?: string;
  actionUrl?: string;
  actionText?: string;
};

type AppointmentEmailParams = BaseEmailParams & {
  appointment: {
    id: string;
    startsAt: string;
    endsAt: string;
    practitionerName: string;
    appointmentType: string;
    roomKey?: string;
    meetingUrl?: string;
  };
};

type PaymentEmailParams = BaseEmailParams & {
  payment: {
    amount: number;
    currency: string;
    status: string;
    appointmentId?: string;
  };
};

type ReminderEmailParams = BaseEmailParams & {
  appointment: {
    id: string;
    startsAt: string;
    practitionerName: string;
    roomKey?: string;
    meetingUrl?: string;
  };
};

type GenericEmailParams = BaseEmailParams & {
  title: string;
  message: string;
};

// Appointment Confirmation Template
export function generateAppointmentConfirmationEmail({
  recipientName,
  appointment,
  actionUrl,
  actionText,
}: AppointmentEmailParams) {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hello,';
  const startTime = new Date(appointment.startsAt).toLocaleString("en-LK", { timeZone: "Asia/Colombo" });
  const endTime = new Date(appointment.endsAt).toLocaleString("en-LK", { timeZone: "Asia/Colombo" });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Confirmed - Clinecxa</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
    .container { background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #007bff; margin-bottom: 10px; }
    .title { font-size: 20px; font-weight: bold; color: #28a745; margin-bottom: 20px; }
    .meeting-details { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff; }
    .join-button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eeeeee; font-size: 12px; color: #666666; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Clinecxa</div>
      <div class="title">Appointment Confirmed</div>
    </div>
    <div class="message">
      <p>${greeting}</p>
      <p>Your telehealth appointment has been successfully confirmed. Here are the details:</p>

      <div class="meeting-details">
        <h3 style="margin: 0 0 15px 0; color: #007bff; font-size: 18px;">📹 Meeting Details</h3>
        <p style="margin: 5px 0;"><strong>Appointment Type:</strong> ${appointment.appointmentType}</p>
        <p style="margin: 5px 0;"><strong>Practitioner:</strong> ${appointment.practitionerName}</p>
        <p style="margin: 5px 0;"><strong>Date & Time:</strong> ${startTime} - ${endTime}</p>
        ${appointment.roomKey ? `<p style="margin: 5px 0;"><strong>Room Number:</strong> ${appointment.roomKey}</p>` : ''}
        <p style="margin: 5px 0;"><strong>Meeting Link:</strong> <a href="${actionUrl || ("https://www.clinecxa.lk/appointment/meeting?room=" + appointment.roomKey)}" style="color: #007bff; text-decoration: none;">Join Meeting</a></p>
      </div>

      <p>You can join the meeting using the link above at the scheduled time. If you need to reschedule or cancel, please contact us.</p>

      ${actionUrl ? `<a href="${actionUrl}" class="join-button">${actionText || 'Join Meeting'}</a>` : `<a href="${"https://www.clinecxa.lk/appointment/meeting?room=" + appointment.roomKey}" class="join-button">Join Meeting</a>`}
    </div>
    <div class="footer">
      <p>This email was sent by Clinecxa Telehealth Platform.</p>
      <p>If you have any questions, please contact our support team.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// Appointment Reminder Template
export function generateAppointmentReminderEmail({
  recipientName,
  appointment,
  actionUrl,
  actionText,
}: ReminderEmailParams) {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hello,';
  const startTime = new Date(appointment.startsAt).toLocaleString("en-LK", { timeZone: "Asia/Colombo" });

  const finalActionUrl = actionUrl || appointment.meetingUrl;
  const finalActionText = actionText || 'Join Meeting';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Reminder - Clinecxa</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
    .container { background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #007bff; margin-bottom: 10px; }
    .title { font-size: 20px; font-weight: bold; color: #ffc107; margin-bottom: 20px; }
    .meeting-details { background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107; }
    .join-button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eeeeee; font-size: 12px; color: #666666; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Clinecxa</div>
      <div class="title">⏰ Appointment Reminder</div>
    </div>
    <div class="message">
      <p>${greeting}</p>
      <p>This is a friendly reminder that your telehealth appointment is coming up soon.</p>

      <div class="meeting-details">
        <h3 style="margin: 0 0 15px 0; color: #856404; font-size: 18px;">📹 Upcoming Meeting</h3>
        <p style="margin: 5px 0;"><strong>Practitioner:</strong> ${appointment.practitionerName}</p>
        <p style="margin: 5px 0;"><strong>Time:</strong> ${startTime}</p>
        ${appointment.roomKey ? `<p style="margin: 5px 0;"><strong>Room Number:</strong> ${appointment.roomKey}</p>` : ''}
        <p style="margin: 5px 0;"><strong>Meeting Link:</strong> <a href="${actionUrl || finalActionUrl || ("https://www.clinecxa.lk/appointment/meeting?room=" + appointment.roomKey)}" style="color: #007bff; text-decoration: none;">Join Meeting</a></p>
      </div>

      <p>Please ensure you have a stable internet connection and are in a quiet environment for your appointment.</p>

      ${(actionUrl || finalActionUrl) ? `<a href="${actionUrl || finalActionUrl}" class="join-button">${actionText || finalActionText}</a>` : ''}
    </div>
    <div class="footer">
      <p>This email was sent by Clinecxa Telehealth Platform.</p>
      <p>If you have any questions, please contact our support team.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// Payment Success Template
export function generatePaymentSuccessEmail({
  recipientName,
  payment,
  actionUrl,
  actionText,
}: PaymentEmailParams) {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hello,';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Successful - Clinecxa</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
    .container { background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #007bff; margin-bottom: 10px; }
    .title { font-size: 20px; font-weight: bold; color: #28a745; margin-bottom: 20px; }
    .payment-details { background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745; }
    .amount { font-size: 24px; font-weight: bold; color: #155724; }
    .join-button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eeeeee; font-size: 12px; color: #666666; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Clinecxa</div>
      <div class="title">💳 Payment Successful</div>
    </div>
    <div class="message">
      <p>${greeting}</p>
      <p>Thank you for your payment. Your transaction has been processed successfully.</p>

      <div class="payment-details">
        <h3 style="margin: 0 0 15px 0; color: #155724; font-size: 18px;">💰 Payment Details</h3>
        <p style="margin: 5px 0;"><strong>Amount:</strong> <span class="amount">${payment.currency} ${payment.amount}</span></p>
        <p style="margin: 5px 0;"><strong>Status:</strong> ${payment.status}</p>
        ${payment.appointmentId ? `<p style="margin: 5px 0;"><strong>Appointment ID:</strong> ${payment.appointmentId}</p>` : ''}
      </div>

      <p>You will receive a confirmation of your appointment details shortly if you haven't already.</p>
      
      ${actionUrl ? `<a href="${actionUrl}" class="join-button">${actionText || 'View Appointment'}</a>` : ''}
    </div>
    <div class="footer">
      <p>This email was sent by Clinecxa Telehealth Platform.</p>
      <p>If you have any questions, please contact our support team.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// Generic Template (fallback for other events)
export function generateGenericEmail({
  title,
  message,
  recipientName,
  actionUrl,
  actionText,
}: GenericEmailParams) {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hello,';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
    .container { background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #007bff; margin-bottom: 10px; }
    .title { font-size: 20px; font-weight: bold; color: #333333; margin-bottom: 20px; }
    .message { margin-bottom: 30px; }
    .join-button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eeeeee; font-size: 12px; color: #666666; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Clinecxa</div>
      <div class="title">${title}</div>
    </div>
    <div class="message">
      <p>${greeting}</p>
      <p>${message}</p>
      ${actionUrl ? `<a href="${actionUrl}" class="join-button">${actionText || 'Click Here'}</a>` : ''}
    </div>
    <div class="footer">
      <p>This email was sent by Clinecxa Telehealth Platform.</p>
      <p>If you have any questions, please contact our support team.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function welcomeTemplate(firstName: string) {
  return `
  <div style="font-family: Arial, Helvetica, sans-serif; background:#f3f4f6; padding:40px 20px;">
    <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:10px; padding:32px; box-shadow:0 6px 18px rgba(0,0,0,0.06);">

      <!-- Logo -->
      <div style="text-align:center; margin-bottom:25px;">
        <h1 style="margin:0; font-size:22px; color:#111827;">
          Clinecxa
        </h1>
        <p style="margin:4px 0 0; font-size:13px; color:#6b7280;">
          Smart & Secure Healthcare Management
        </p>
      </div>

      <!-- Greeting -->
      <h2 style="margin-bottom:12px; color:#111827;">
        Welcome ${firstName} 👋
      </h2>

      <p style="color:#374151; line-height:1.6; margin-bottom:16px;">
        Your account has been successfully created on <strong>Clinecxa</strong>.
      </p>

      <p style="color:#374151; line-height:1.6;">
        You can now:
      </p>

      <ul style="color:#374151; line-height:1.8; padding-left:20px;">
        <li>Book and manage appointments online</li>
        <li>Access your healthcare information securely</li>
        <li>Receive important medical updates and reminders</li>
      </ul>

      <!-- CTA Button -->
      <div style="text-align:center; margin:30px 0;">
        <a href="https://clinecxa.lk"
           style="display:inline-block; padding:12px 24px; background:#4f46e5; color:#ffffff; text-decoration:none; border-radius:6px; font-weight:600;">
           Go to Dashboard
        </a>
      </div>

      <!-- Support -->
      <p style="color:#6b7280; font-size:14px; line-height:1.6;">
        If you have any questions or need assistance, our support team is here to help.
      </p>

      <hr style="margin:30px 0; border:none; border-top:1px solid #e5e7eb;" />

      <!-- Footer -->
      <p style="color:#9ca3af; font-size:12px; text-align:center;">
        © ${new Date().getFullYear()} Clinecxa. All rights reserved.
      </p>

    </div>
  </div>
  `;
}