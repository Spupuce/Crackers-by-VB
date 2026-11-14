// pages/api/admin/orders/send-test-email.js

import { requireAdminSession } from '../../../../lib/session';
import { connectMongo } from '../../../../lib/mongodb';
import Order from '../../../../models/Order';
import {
  isValidEmail,
  normalizeCustomMessage,
  buildOrderStatusEmailText,
  buildOrderStatusEmailHtml,
  buildCustomEmailText,
  buildCustomEmailHtml,
  sendEmail,
} from '../../../../lib/services/emailService';

function normalizeStatusLabel(statusLabel) {
  if (!statusLabel || typeof statusLabel !== 'string') {
    return '';
  }

  const normalizedLabel = statusLabel.trim().toLowerCase();

  if (normalizedLabel === 'en attente') {
    return 'pending';
  }

  if (normalizedLabel === 'en préparation') {
    return 'preparing';
  }

  if (normalizedLabel === 'expédiée' || normalizedLabel === 'expediee') {
    return 'shipped';
  }

  if (normalizedLabel === 'livrée' || normalizedLabel === 'livree') {
    return 'delivered';
  }

  if (normalizedLabel === 'annulée' || normalizedLabel === 'annulee') {
    return 'cancelled';
  }

  return '';
}

async function findOrderForEmail(orderId) {
  const orderByNumber = await Order.findOne({
    orderNumber: orderId,
  });

  if (orderByNumber) {
    return orderByNumber;
  }

  if (!/^[a-fA-F0-9]{24}$/.test(orderId)) {
    return null;
  }

  return Order.findById(orderId);
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
      recipientType,
      orderId,
      customerName,
      statusLabel,
      trackingNumber,
      trackingUrl,
      customMessage,
    } = req.body || {};

    const normalizedCustomMessage = normalizeCustomMessage(customMessage);

    if (
      !orderId ||
      typeof orderId !== 'string' ||
      !orderId.trim()
    ) {
      return res.status(400).json({ message: 'Commande invalide.' });
    }

    const normalizedOrderId = orderId.trim();
    const isCustomerEmail = recipientType === 'customer';

    let order = null;
    let finalRecipient = testEmail;

    if (isCustomerEmail) {
      await connectMongo();

      order = await findOrderForEmail(normalizedOrderId);

      if (!order) {
        return res.status(404).json({
          message: 'Commande introuvable.',
        });
      }

      if (order.isUserDeleted || order.anonymizedAt) {
        return res.status(409).json({
          message:
            'Envoi impossible : le compte associé à cette commande a été supprimé et ses coordonnées ont été anonymisées.',
        });
      }

      finalRecipient = order.customer?.email || '';
    }

    if (!isValidEmail(finalRecipient)) {
      return res.status(400).json({
        message: 'Adresse email destinataire invalide.',
      });
    }

    const subject = `Votre commande ${normalizedOrderId} - ${statusLabel}`;

    const text = normalizedCustomMessage
      ? buildCustomEmailText(normalizedCustomMessage)
      : buildOrderStatusEmailText({
          orderId: normalizedOrderId,
          customerName,
          statusLabel,
          trackingNumber,
          trackingUrl,
        });

    const html = normalizedCustomMessage
      ? buildCustomEmailHtml(normalizedCustomMessage)
      : buildOrderStatusEmailHtml({
          orderId: normalizedOrderId,
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

    if (isCustomerEmail && order) {
      const normalizedStatus = normalizeStatusLabel(statusLabel);

      await Order.updateOne(
        {
          _id: order._id,
          isUserDeleted: { $ne: true },
          anonymizedAt: null,
        },
        {
          $set: {
            statusEmail: {
              sent: true,
              sentAt: new Date(),
              sentForStatus: normalizedStatus,
              recipient: finalRecipient,
              messageId: info?.messageId || '',
            },
          },
        },
        {
          runValidators: true,
        }
      );
    }

    console.log('ORDER_STATUS_MAIL_RESULT:', {
      adminUserId: session.userId,
      orderId: normalizedOrderId,
      recipientType: isCustomerEmail ? 'customer' : 'test',
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