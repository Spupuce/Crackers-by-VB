// pages/api/admin/orders/[id].js

import { connectMongo } from '../../../../lib/mongodb';
import { requireAdminSession } from '../../../../lib/session';
import Order from '../../../../models/Order';
import {
  normalizeCarrier,
  normalizeText,
  resolveOrderShippingConsistency,
} from '../../../../lib/services/trackingService';

const ALLOWED_STATUSES = ['pending', 'preparing', 'shipped', 'delivered', 'cancelled'];
const ALLOWED_METHODS = ['', 'relay', 'home'];
const ALLOWED_CARRIERS = ['', 'mondial relay', 'colissimo', 'chronopost'];

function normalizeStatus(value) {
  if (!value || typeof value !== 'string') {
    return '';
  }

  return value.trim().toLowerCase();
}

function normalizeTrackingUrl(value) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return '';
  }

  if (/^https?:\/\//i.test(normalizedValue)) {
    return normalizedValue;
  }

  return `https://${normalizedValue}`;
}

function normalizeMethod(value) {
  const normalizedMethod = normalizeText(value).toLowerCase();

  if (!normalizedMethod) {
    return '';
  }

  return ALLOWED_METHODS.includes(normalizedMethod) ? normalizedMethod : '';
}

function normalizeAllowedCarrier(value) {
  const normalizedCarrier = normalizeCarrier(value);

  if (!normalizedCarrier) {
    return '';
  }

  return ALLOWED_CARRIERS.includes(normalizedCarrier) ? normalizedCarrier : '';
}

function ensureShippingObject(order) {
  if (!order.shipping) {
    order.shipping = {};
  }
}

function serializeOrder(order) {
  return {
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
  };
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

    const { status, carrier, trackingNumber, trackingUrl, method } = req.body || {};
    const requestedStatus = normalizeStatus(status);
    const normalizedCarrier = normalizeAllowedCarrier(carrier);
    const normalizedTrackingNumber = normalizeText(trackingNumber);
    const normalizedMethod = normalizeMethod(method);

    if (!ALLOWED_STATUSES.includes(requestedStatus)) {
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

    ensureShippingObject(order);

    const currentTrackingUrl = normalizeTrackingUrl(trackingUrl);
    const consistency = resolveOrderShippingConsistency({
      status: requestedStatus,
      shippedAt: order.shipping?.shippedAt || null,
      deliveredAt: order.shipping?.deliveredAt || null,
      trackingNumber: normalizedTrackingNumber,
      trackingUrl: currentTrackingUrl,
      carrier: normalizedCarrier,
      now: new Date(),
    });

    order.status = consistency.status;

    if (normalizedMethod) {
      order.shipping.method = normalizedMethod;
    }

    order.shipping.carrier = consistency.carrier;
    order.shipping.trackingNumber = consistency.trackingNumber;
    order.shipping.trackingUrl = consistency.trackingUrl;
    order.shipping.shippedAt = consistency.shippedAt;
    order.shipping.deliveredAt = consistency.deliveredAt;

    await order.save();

    return res.status(200).json({
      ok: true,
      order: serializeOrder(order),
    });
  } catch (error) {
    console.error('ADMIN_ORDER_STATUS_UPDATE_ERROR', error);

    return res.status(500).json({
      ok: false,
      message: "Impossible de mettre à jour le statut de la commande.",
    });
  }
}