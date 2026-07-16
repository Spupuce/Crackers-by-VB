// pages/api/orders/[id].js

import mongoose from 'mongoose';
import { connectMongo } from '../../../lib/mongodb';
import { getSessionFromRequest } from '../../../lib/session';
import Order from '../../../models/Order';

function getSingleQueryParam(value) {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0].trim() : '';
  }

  return typeof value === 'string' ? value.trim() : '';
}

function isOrderOwnedBySession(order, session) {
  if (!order || !session?.userId) {
    return false;
  }

  if (!order.userId) {
    return false;
  }

  return String(order.userId) === String(session.userId);
}

function hasMatchingStripeSession(order, sessionId) {
  if (!sessionId) {
    return false;
  }

  if (typeof order?.stripeSessionId !== 'string') {
    return false;
  }

  return order.stripeSessionId.trim() === sessionId;
}

export default async function handler(req, res) {
  const { method } = req;

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      ok: false,
      message: 'Méthode non autorisée.',
    });
  }

  const id = getSingleQueryParam(req.query?.id);
  const sessionId = getSingleQueryParam(req.query?.session_id);
  const session = getSessionFromRequest(req);

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      ok: false,
      code: 'INVALID_ORDER_ID',
      message: 'Identifiant de commande invalide.',
    });
  }

  try {
    await connectMongo();

    const order = await Order.findById(id).lean();

    if (!order) {
      return res.status(404).json({
        ok: false,
        code: 'ORDER_NOT_FOUND',
        message: "Cette commande n'existe pas ou n'est plus disponible.",
      });
    }

    const hasSessionMatch = hasMatchingStripeSession(order, sessionId);
    const isOwner = isOrderOwnedBySession(order, session);

    if (!hasSessionMatch && !isOwner) {
      return res.status(403).json({
        ok: false,
        code: 'ORDER_ACCESS_DENIED',
        message:
          "Vous n'êtes pas autorisée à consulter cette commande.",
      });
    }

    if (
      sessionId &&
      typeof order.stripeSessionId === 'string' &&
      order.stripeSessionId.trim() &&
      order.stripeSessionId.trim() !== sessionId &&
      !isOwner
    ) {
      return res.status(403).json({
        ok: false,
        code: 'ORDER_SESSION_MISMATCH',
        message:
          'Cette commande ne correspond pas à la session de paiement fournie.',
      });
    }

    if (order.paymentStatus !== 'paid') {
      return res.status(404).json({
        ok: false,
        code: 'ORDER_NOT_PAID',
        message:
          "Cette commande n'est pas encore confirmée. Si vous revenez de Stripe, la validation peut prendre quelques instants avant d'apparaître.",
      });
    }

    return res.status(200).json({
      ok: true,
      code: 'ORDER_CONFIRMED',
      order: {
        id: String(order._id),
        orderNumber: order.orderNumber || '',
        status: order.status,
        paymentStatus: order.paymentStatus,
        customer: {
          firstName: order.customer.firstName,
          lastName: order.customer.lastName,
          email: order.customer.email,
        },
        subtotalAmount: order.subtotalAmount,
        shippingAmount: order.shippingAmount,
        totalAmount: order.totalAmount,
        currency: order.currency,
        shipping: {
          method: order.shipping?.method || '',
          parcelSize: order.shipping?.parcelSize || '',
          carrier: order.shipping?.carrier || '',
          trackingNumber: order.shipping?.trackingNumber || '',
          trackingUrl: order.shipping?.trackingUrl || '',
          shippedAt: order.shipping?.shippedAt || null,
          deliveredAt: order.shipping?.deliveredAt || null,
        },
        items: Array.isArray(order.items)
          ? order.items.map((item) => ({
              name: item.name,
              slug: item.slug,
              color: item.color || '',
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            }))
          : [],
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    console.error('ORDER_CONFIRMATION_FETCH_ERROR', {
      orderId: id,
      sessionId: sessionId || null,
      sessionUserId: session?.userId || null,
      message: error?.message || null,
      stack: error?.stack || null,
      raw: error,
    });

    return res.status(500).json({
      ok: false,
      code: 'ORDER_FETCH_ERROR',
      message:
        "Une erreur est survenue lors de la vérification de la commande. Merci de réessayer plus tard.",
    });
  }
}