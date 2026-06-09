// pages/api/admin/orders/send-test-email.js

import nodemailer from 'nodemailer';
import { requireAdminSession } from '../../../../lib/session';

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(value = '') {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeCustomMessage(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function getTransporter() {
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

function getGreeting(customerName) {
  return customerName ? `Bonjour ${customerName},` : 'Bonjour,';
}

function buildDefaultEmailText({
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

function buildDefaultEmailHtml({
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

function buildCustomEmailText(customMessage) {
  return customMessage;
}

function buildCustomEmailHtml(customMessage) {
  const safeHtml = escapeHtml(customMessage).replace(/\n/g, '<br />');

  return `
    <div style="font-family: Arial, sans-serif; color: #1F2937; line-height: 1.6;">
      <p style="margin: 0;">${safeHtml}</p>
    </div>
  `;
}

function isAcceptedResult(info, email) {
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée.' });
  }

  const session = requireAdminSession(req);

  if (!session) {
    return res.status(401).json({ message: 'Accès administrateur requis.' });
  }

  try {
    const {
      testEmail,
      customerEmail,
      recipientType,
      orderId,
      customerName,
      statusLabel,
      trackingNumber,
      trackingUrl,
      customMessage,
    } = req.body || {};

    const mailFromAddress = process.env.MAIL_FROM_ADDRESS;
    const mailFromName = process.env.MAIL_FROM_NAME || 'Crackers by VB';
    const normalizedCustomMessage = normalizeCustomMessage(customMessage);

    if (!mailFromAddress) {
      throw new Error('MAIL_FROM_ADDRESS est manquant.');
    }

    if (!orderId || typeof orderId !== 'string') {
      return res.status(400).json({ message: 'Commande invalide.' });
    }

    const finalRecipient =
      recipientType === 'customer' ? customerEmail : testEmail;

    if (!isValidEmail(finalRecipient)) {
      return res.status(400).json({
        message: 'Adresse email destinataire invalide.',
      });
    }

    const transporter = getTransporter();
    await transporter.verify();

    const subject = `Votre commande ${orderId} - ${statusLabel}`;

    const text = normalizedCustomMessage
      ? buildCustomEmailText(normalizedCustomMessage)
      : buildDefaultEmailText({
          orderId,
          customerName,
          statusLabel,
          trackingNumber,
          trackingUrl,
        });

    const html = normalizedCustomMessage
      ? buildCustomEmailHtml(normalizedCustomMessage)
      : buildDefaultEmailHtml({
          orderId,
          customerName,
          statusLabel,
          trackingNumber,
          trackingUrl,
        });

    const info = await transporter.sendMail({
      from: `"${mailFromName}" <${mailFromAddress}>`,
      to: finalRecipient,
      subject,
      text,
      html,
      replyTo: process.env.CONTACT_RECIPIENT_EMAIL || mailFromAddress,
    });

    console.log('ORDER_STATUS_MAIL_RESULT:', {
      adminUserId: session.userId,
      orderId,
      recipientType: recipientType === 'customer' ? 'customer' : 'test',
      recipient: finalRecipient,
      usedCustomMessage: Boolean(normalizedCustomMessage),
      messageId: info?.messageId || null,
      accepted: info?.accepted || [],
      rejected: info?.rejected || [],
      response: info?.response || null,
    });

    if (!isAcceptedResult(info, finalRecipient)) {
      console.error('ORDER_STATUS_MAIL_NOT_ACCEPTED:', {
        adminUserId: session.userId,
        orderId,
        recipientType: recipientType === 'customer' ? 'customer' : 'test',
        recipient: finalRecipient,
        usedCustomMessage: Boolean(normalizedCustomMessage),
        messageId: info?.messageId || null,
        accepted: info?.accepted || [],
        rejected: info?.rejected || [],
        response: info?.response || null,
      });

      return res.status(500).json({
        message: "L'email n'a pas été accepté par le serveur SMTP.",
      });
    }

    return res.status(200).json({
      message: `Email accepté pour ${finalRecipient}.`,
    });
  } catch (error) {
    console.error('ORDER_STATUS_MAIL_ERROR:', {
      message: error?.message || error,
      code: error?.code || null,
      command: error?.command || null,
      response: error?.response || null,
      responseCode: error?.responseCode || null,
    });

    return res.status(500).json({
      message: "Erreur lors de l'envoi de l'email commande.",
    });
  }
}