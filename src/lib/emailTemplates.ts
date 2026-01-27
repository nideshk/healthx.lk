type BaseEmailParams = {
  recipientName?: string;
  eventType?: string;
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
  actionUrl?: string;
  actionText?: string;
};

// Appointment Confirmation Template
export function generateAppointmentConfirmationEmail({
  recipientName,
  appointment,
}: AppointmentEmailParams) {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hello,';
  const startTime = new Date(appointment.startsAt).toLocaleString();
  const endTime = new Date(appointment.endsAt).toLocaleString();

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
        ${appointment.meetingUrl ? `<p style="margin: 5px 0;"><strong>Meeting Link:</strong> <a href="${appointment.meetingUrl}" style="color: #007bff; text-decoration: none;">${appointment.meetingUrl}</a></p>` : ''}
      </div>

      <p>You can join the meeting using the link above at the scheduled time. If you need to reschedule or cancel, please contact us.</p>

      ${appointment.meetingUrl ? `<a href="${appointment.meetingUrl}" class="join-button">Join Meeting</a>` : ''}
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
}: ReminderEmailParams) {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hello,';
  const startTime = new Date(appointment.startsAt).toLocaleString();

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
        ${appointment.meetingUrl ? `<p style="margin: 5px 0;"><strong>Meeting Link:</strong> <a href="${appointment.meetingUrl}" style="color: #007bff; text-decoration: none;">${appointment.meetingUrl}</a></p>` : ''}
      </div>

      <p>Please ensure you have a stable internet connection and are in a quiet environment for your appointment.</p>

      ${appointment.meetingUrl ? `<a href="${appointment.meetingUrl}" class="join-button">Join Meeting</a>` : ''}
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

  const actionButton = actionUrl && actionText
    ? `<a href="${actionUrl}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold;">${actionText}</a>`
    : '';

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
      ${actionButton}
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