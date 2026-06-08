// pages/api/admin/orders/send-test-email.js

import nodemailer from 'nodemailer';
import { requireAdminSession } from '../../../../lib/session';

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

function buildEmailText({
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
${
  trackingNumber ? `Numéro de suivi Mondial Relay : ${trackingNumber}` : ''
}
${
  trackingUrl ? `Lien de suivi : ${trackingUrl}` : ''
}

Nous restons disponibles si vous avez la moindre question.

Belle journée,
Crackers by VB`;
}

function buildEmailHtml({
  orderId,
  customerName,
  statusLabel,
  trackingNumber,
  trackingUrl,
}) {
  const greeting = getGreeting(customerName);

  return `
    <div style="font-family: Arial, sans-serif; color: #1F2937; line-height: 1.6;">
      <p style="margin: 0 0 16px;">${greeting}</p>

      <p style="margin: 0 0 16px;">
        Nous vous contactons au sujet de votre commande
        <strong>${orderId}</strong> sur Crackers by VB.
      </p>

      <div style="margin: 24px 0; padding: 16px; background: #F9FAFB; border-radius: 12px;">
        <p style="margin: 0 0 8px;"><strong>Commande :</strong> ${orderId}</p>
        <p style="margin: 0 0 8px;"><strong>Statut actuel :</strong> ${statusLabel}</p>
        ${
          trackingNumber
            ? `<p style="margin: 0 0 8px;"><strong>Numéro de suivi Mondial Relay :</strong> ${trackingNumber}</p>`
            : ''
        }
        ${
          trackingUrl
            ? `<p style="margin: 0;"><strong>Lien de suivi :</strong> <a href="${trackingUrl}" target="_blank" rel="noreferrer">${trackingUrl}</a></p>`
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
      orderId,
      customerName,
      statusLabel,
      trackingNumber,
      trackingUrl,
    } = req.body || {};

    const mailFromAddress = process.env.MAIL_FROM_ADDRESS;
    const mailFromName = process.env.MAIL_FROM_NAME || 'Crackers by VB';

    if (!mailFromAddress) {
      throw new Error('MAIL_FROM_ADDRESS est manquant.');
    }

    if (!isValidEmail(testEmail)) {
      return res.status(400).json({ message: 'Adresse email de test invalide.' });
    }

    if (!orderId || typeof orderId !== 'string') {
      return res.status(400).json({ message: 'Commande invalide.' });
    }

    const transporter = getTransporter();
    await transporter.verify();

    const info = await transporter.sendMail({
      from: `"${mailFromName}" <${mailFromAddress}>`,
      to: testEmail,
      subject: `Votre commande ${orderId} - ${statusLabel}`,
      text: buildEmailText({
        orderId,
        customerName,
        statusLabel,
        trackingNumber,
        trackingUrl,
      }),
      html: buildEmailHtml({
        orderId,
        customerName,
        statusLabel,
        trackingNumber,
        trackingUrl,
      }),
      replyTo: process.env.CONTACT_RECIPIENT_EMAIL || mailFromAddress,
    });

    console.log('ORDER_STATUS_MAIL_RESULT:', {
      adminUserId: session.userId,
      orderId,
      testEmail,
      messageId: info?.messageId || null,
      accepted: info?.accepted || [],
      rejected: info?.rejected || [],
      response: info?.response || null,
    });

    if (!isAcceptedResult(info, testEmail)) {
      console.error('ORDER_STATUS_MAIL_NOT_ACCEPTED:', {
        adminUserId: session.userId,
        orderId,
        testEmail,
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
      message: `Email accepté pour ${testEmail}.`,
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