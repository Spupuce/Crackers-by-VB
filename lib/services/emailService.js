// lib/services/emailService.js

import nodemailer from 'nodemailer';

export function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function normalizeCustomMessage(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

export function getMailFromConfig() {
  const mailFromAddress = process.env.MAIL_FROM_ADDRESS;
  const mailFromName = process.env.MAIL_FROM_NAME || 'Crackers by VB';
  const replyTo = process.env.CONTACT_RECIPIENT_EMAIL || mailFromAddress;

  if (!mailFromAddress) {
    throw new Error('MAIL_FROM_ADDRESS est manquant.');
  }

  return {
    mailFromAddress,
    mailFromName,
    replyTo,
  };
}

export function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    throw new Error('Configuration SMTP incomplète.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    logger: true,
    debug: true,
  });
}

export function getGreeting(customerName) {
  return customerName ? `Bonjour ${customerName},` : 'Bonjour,';
}

export function buildOrderStatusEmailText({
  orderId,
  customerName,
  statusLabel,
  trackingNumber,
  trackingUrl,
}) {
  const greeting = getGreeting(customerName);

  return `${greeting}

Nous vous contactons au sujet de votre commande ${orderId} sur Crackers by VB.

Statut actuel de votre commande : ${statusLabel}
${trackingNumber ? `Numéro de suivi Mondial Relay : ${trackingNumber}` : ''}
${trackingUrl ? `Lien de suivi : ${trackingUrl}` : ''}

Nous restons disponibles si vous avez la moindre question.

Belle journée,
Crackers by VB`;
}

export function buildOrderStatusEmailHtml({
  orderId,
  customerName,
  statusLabel,
  trackingNumber,
  trackingUrl,
}) {
  const greeting = getGreeting(customerName);

  return `
    <div style="font-family: Arial, sans-serif; color: #1F2937; line-height: 1.6;">
      <p style="margin: 0 0 16px;">${escapeHtml(greeting)}</p>

      <p style="margin: 0 0 16px;">
        Nous vous contactons au sujet de votre commande
        <strong>${escapeHtml(orderId)}</strong> sur Crackers by VB.
      </p>

      <div style="margin: 24px 0; padding: 16px; background: #F9FAFB; border-radius: 12px;">
        <p style="margin: 0 0 8px;"><strong>Commande :</strong> ${escapeHtml(orderId)}</p>
        <p style="margin: 0 0 8px;"><strong>Statut actuel :</strong> ${escapeHtml(statusLabel)}</p>
        ${
          trackingNumber
            ? `<p style="margin: 0 0 8px;"><strong>Numéro de suivi Mondial Relay :</strong> ${escapeHtml(
                trackingNumber
              )}</p>`
            : ''
        }
        ${
          trackingUrl
            ? `<p style="margin: 0;"><strong>Lien de suivi :</strong> <a href="${escapeHtml(
                trackingUrl
              )}" target="_blank" rel="noreferrer">${escapeHtml(trackingUrl)}</a></p>`
            : ''
        }
      </div>

      <p style="margin: 0 0 16px;">
        Nous restons disponibles si vous avez la moindre question.
      </p>

      <p style="margin: 0;">Belle journée,<br />Crackers by VB</p>
    </div>
  `;
}

export function buildCustomEmailText(customMessage) {
  return customMessage;
}

export function buildCustomEmailHtml(customMessage) {
  const safeHtml = escapeHtml(customMessage).replace(/\n/g, '<br />');

  return `
    <div style="font-family: Arial, sans-serif; color: #1F2937; line-height: 1.6;">
      <p style="margin: 0;">${safeHtml}</p>
    </div>
  `;
}

export function buildOrderConfirmationEmailText({
  orderId,
  customerName,
}) {
  const greeting = getGreeting(customerName);

  return `${greeting}

Merci pour votre commande ${orderId} sur Crackers by VB.

Votre paiement a bien été confirmé et votre commande est en cours de préparation.

Nous vous recontacterons dès que votre commande sera prête ou expédiée.

Belle journée,
Crackers by VB`;
}

export function buildOrderConfirmationEmailHtml({
  orderId,
  customerName,
}) {
  const greeting = getGreeting(customerName);

  return `
    <div style="font-family: Arial, sans-serif; color: #1F2937; line-height: 1.6;">
      <p style="margin: 0 0 16px;">${escapeHtml(greeting)}</p>

      <p style="margin: 0 0 16px;">
        Merci pour votre commande <strong>${escapeHtml(orderId)}</strong> sur Crackers by VB.
      </p>

      <div style="margin: 24px 0; padding: 16px; background: #F9FAFB; border-radius: 12px;">
        <p style="margin: 0 0 8px;"><strong>Commande :</strong> ${escapeHtml(orderId)}</p>
        <p style="margin: 0;"><strong>Paiement :</strong> confirmé</p>
      </div>

      <p style="margin: 0 0 16px;">
        Votre commande est en cours de préparation par la créatrice.
      </p>

      <p style="margin: 0 0 16px;">
        Nous vous recontacterons dès que votre commande sera prête ou expédiée.
      </p>

      <p style="margin: 0;">Belle journée,<br />Crackers by VB</p>
    </div>
  `;
}

export function isAcceptedResult(info, email) {
  if (!info) {
    return false;
  }

  const accepted = Array.isArray(info.accepted) ? info.accepted : [];
  const rejected = Array.isArray(info.rejected) ? info.rejected : [];

  if (rejected.includes(email)) {
    return false;
  }

  return accepted.includes(email);
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
}) {
  if (!isValidEmail(to)) {
    throw new Error('Adresse email destinataire invalide.');
  }

  const transporter = getTransporter();
  const { mailFromAddress, mailFromName, replyTo } = getMailFromConfig();

  await transporter.verify();

  const info = await transporter.sendMail({
    from: `"${mailFromName}" <${mailFromAddress}>`,
    to,
    subject,
    text,
    html,
    replyTo,
  });

  if (!isAcceptedResult(info, to)) {
    throw new Error("L'email n'a pas été accepté par le serveur SMTP.");
  }

  return info;
}

export async function sendOrderConfirmationEmail({
  customerEmail,
  customerName,
  orderId,
}) {
  const subject = `Confirmation de votre commande ${orderId}`;

  return sendEmail({
    to: customerEmail,
    subject,
    text: buildOrderConfirmationEmailText({
      orderId,
      customerName,
    }),
    html: buildOrderConfirmationEmailHtml({
      orderId,
      customerName,
    }),
  });
}