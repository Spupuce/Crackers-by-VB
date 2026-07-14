// pages/api/admin/orders/[id]/refresh-tracking.js

import { connectMongo } from '../../../../../lib/mongodb';
import { requireAdminSession } from '../../../../../lib/session';
import Order from '../../../../../models/Order';
import { refreshOrderTracking } from '../../../../../lib/services/trackingService';

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

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      ok: false,
      message: 'Méthode non autorisée.',
    });
  }

  try {
    await connectMongo();

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        ok: false,
        message: 'Commande introuvable.',
      });
    }

    const trackingResult = await refreshOrderTracking(order);

    return res.status(200).json({
      ok: trackingResult.ok,
      message: trackingResult.message,
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
      tracking: trackingResult,
    });
  } catch (error) {
    console.error('ADMIN_ORDER_REFRESH_TRACKING_ERROR', error);

    return res.status(500).json({
      ok: false,
      message: "Impossible d'actualiser le suivi de la commande.",
    });
  }
}