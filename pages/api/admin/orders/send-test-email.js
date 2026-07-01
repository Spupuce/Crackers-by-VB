// pages/api/admin/orders/send-test-email.js

import { requireAdminSession } from '../../../../lib/session';
import {
  isValidEmail,
  normalizeCustomMessage,
  buildOrderStatusEmailText,
  buildOrderStatusEmailHtml,
  buildCustomEmailText,
  buildCustomEmailHtml,
  sendEmail,
} from '../../../../lib/services/emailService';

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

    const normalizedCustomMessage = normalizeCustomMessage(customMessage);

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

    const subject = `Votre commande ${orderId} - ${statusLabel}`;

    const text = normalizedCustomMessage
      ? buildCustomEmailText(normalizedCustomMessage)
      : buildOrderStatusEmailText({
          orderId,
          customerName,
          statusLabel,
          trackingNumber,
          trackingUrl,
        });

    const html = normalizedCustomMessage
      ? buildCustomEmailHtml(normalizedCustomMessage)
      : buildOrderStatusEmailHtml({
          orderId,
          customerName,
          statusLabel,
          trackingNumber,
          trackingUrl,
        });

    const info = await sendEmail({
      to: finalRecipient,
      subject,
      text,
      html,
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