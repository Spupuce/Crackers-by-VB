// pages/api/orders/[id].js

import mongoose from 'mongoose';
import { connectMongo } from '../../../lib/mongodb';
import Order from '../../../models/Order';

function getSingleQueryParam(value) {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0].trim() : '';
  }

  return typeof value === 'string' ? value.trim() : '';
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

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      ok: false,
      code: 'INVALID_ORDER_ID',
      message: "Identifiant de commande invalide.",
    });
  }

  try {
    await connectMongo();

    const order = await Order.findById(id).lean();

    if (!order) {
      return res.status(404).json({
        ok: false,
        code: 'ORDER_NOT_FOUND',
        message:
          "Cette commande n'existe pas ou n'est plus disponible.",
      });
    }

    if (
      sessionId &&
      typeof order.stripeSessionId === 'string' &&
      order.stripeSessionId.trim() &&
      order.stripeSessionId.trim() !== sessionId
    ) {
      return res.status(403).json({
        ok: false,
        code: 'ORDER_SESSION_MISMATCH',
        message:
          "Cette commande ne correspond pas à la session de paiement fournie.",
      });
    }

    if (order.paymentStatus !== 'paid') {
      return res.status(404).json({
        ok: false,
        code: 'ORDER_NOT_PAID',
        message:
          "Cette commande n'est pas encore validée. Si vous avez déjà procédé au paiement, merci de contacter la créatrice.",
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
        items: order.items.map((item) => ({
          name: item.name,
          slug: item.slug,
          color: item.color || '',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    console.error('ORDER_CONFIRMATION_FETCH_ERROR', error);

    return res.status(500).json({
      ok: false,
      code: 'ORDER_FETCH_ERROR',
      message:
        "Une erreur est survenue lors de la vérification de la commande. Merci de réessayer plus tard.",
    });
  }
}