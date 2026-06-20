// pages/api/admin/orders/[id].js

import { connectMongo } from '../../../../lib/mongodb';
import { requireAdminSession } from '../../../../lib/session';
import Order from '../../../../models/Order';

const ALLOWED_STATUSES = ['pending', 'preparing', 'shipped', 'delivered', 'cancelled'];

function normalizeStatus(value) {
  if (!value || typeof value !== 'string') {
    return '';
  }

  return value.trim().toLowerCase();
}

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      ok: false,
      message: 'Identifiant de commande manquant.',
    });
  }

  const adminSession = requireAdminSession(req);

  if (!adminSession) {
    return res.status(401).json({
      ok: false,
      message: 'Accès administrateur requis.',
    });
  }

  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH']);
    return res.status(405).json({
      ok: false,
      message: 'Méthode non autorisée.',
    });
  }

  try {
    await connectMongo();

    const { status } = req.body || {};
    const nextStatus = normalizeStatus(status);

    if (!ALLOWED_STATUSES.includes(nextStatus)) {
      return res.status(400).json({
        ok: false,
        message: 'Statut de commande invalide.',
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        ok: false,
        message: 'Commande introuvable.',
      });
    }

    const previousStatus = order.status;
    order.status = nextStatus;

    const now = new Date();

    // Passage en "shipped" : poser shippedAt si pas encore défini
    if (previousStatus !== 'shipped' && nextStatus === 'shipped') {
      if (!order.shipping) {
        order.shipping = {};
      }
      if (!order.shipping.shippedAt) {
        order.shipping.shippedAt = now;
      }
    }

    // Passage en "delivered" : poser deliveredAt si pas encore défini
    if (previousStatus !== 'delivered' && nextStatus === 'delivered') {
      if (!order.shipping) {
        order.shipping = {};
      }
      if (!order.shipping.deliveredAt) {
        order.shipping.deliveredAt = now;
      }
    }

    await order.save();

    return res.status(200).json({
      ok: true,
      order: {
        _id: order._id.toString(),
        status: order.status,
        paymentStatus: order.paymentStatus,
        shipping: {
          method: order.shipping?.method || '',
          carrier: order.shipping?.carrier || '',
          trackingNumber: order.shipping?.trackingNumber || '',
          trackingUrl: order.shipping?.trackingUrl || '',
          shippedAt: order.shipping?.shippedAt || null,
          deliveredAt: order.shipping?.deliveredAt || null,
        },
      },
    });
  } catch (error) {
    console.error('ADMIN_ORDER_STATUS_UPDATE_ERROR', error);

    return res.status(500).json({
      ok: false,
      message: "Impossible de mettre à jour le statut de la commande.",
    });
  }
}