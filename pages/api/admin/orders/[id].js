// pages/api/admin/orders/[id].js

import { connectMongo } from '../../../../lib/mongodb';
import { requireAdminSession } from '../../../../lib/session';
import Order from '../../../../models/Order';

const ALLOWED_STATUSES = ['pending', 'preparing', 'shipped', 'delivered', 'cancelled'];
const ALLOWED_METHODS = ['', 'relay', 'home'];
const ALLOWED_CARRIERS = ['', 'mondial relay', 'colissimo', 'chronopost'];

function normalizeStatus(value) {
  if (!value || typeof value !== 'string') {
    return '';
  }

  return value.trim().toLowerCase();
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
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

function normalizeCarrierKey(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeCarrier(value) {
  const normalizedCarrier = normalizeCarrierKey(value);

  if (!normalizedCarrier) {
    return '';
  }

  return ALLOWED_CARRIERS.includes(normalizedCarrier) ? normalizedCarrier : '';
}

function normalizeMethod(value) {
  const normalizedMethod = normalizeText(value).toLowerCase();

  if (!normalizedMethod) {
    return '';
  }

  return ALLOWED_METHODS.includes(normalizedMethod) ? normalizedMethod : '';
}

function buildTrackingUrl(carrier, trackingNumber) {
  const normalizedCarrier = normalizeCarrierKey(carrier);
  const normalizedTrackingNumber = normalizeText(trackingNumber);

  if (!normalizedCarrier || !normalizedTrackingNumber) {
    return '';
  }

  const encodedTrackingNumber = encodeURIComponent(normalizedTrackingNumber);

  if (normalizedCarrier === 'colissimo') {
    return `https://www.laposte.fr/outils/suivre-vos-envois?code=${encodedTrackingNumber}`;
  }

  if (normalizedCarrier === 'chronopost') {
    return `https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=${encodedTrackingNumber}`;
  }

  if (normalizedCarrier === 'mondial relay') {
    return `https://www.mondialrelay.fr/suivi-de-colis/?numeroExpedition=${encodedTrackingNumber}`;
  }

  return '';
}

function resolveTrackingUrl({ carrier, trackingNumber, trackingUrl }) {
  const autoTrackingUrl = buildTrackingUrl(carrier, trackingNumber);

  if (autoTrackingUrl) {
    return autoTrackingUrl;
  }

  return normalizeTrackingUrl(trackingUrl);
}

function ensureShippingObject(order) {
  if (!order.shipping) {
    order.shipping = {};
  }
}

function resolveNextStatus(status, trackingNumber) {
  if (status === 'preparing' && normalizeText(trackingNumber)) {
    return 'shipped';
  }

  return status;
}

function shouldClearDeliveredAt(nextStatus) {
  return nextStatus !== 'delivered';
}

function shouldClearShippedAt(nextStatus, trackingNumber) {
  return (
    (nextStatus === 'pending' || nextStatus === 'preparing') &&
    !normalizeText(trackingNumber)
  );
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
    const normalizedCarrier = normalizeCarrier(carrier);
    const normalizedTrackingNumber = normalizeText(trackingNumber);
    const normalizedMethod = normalizeMethod(method);
    const nextStatus = resolveNextStatus(requestedStatus, normalizedTrackingNumber);
    const resolvedTrackingUrl = resolveTrackingUrl({
      carrier: normalizedCarrier,
      trackingNumber: normalizedTrackingNumber,
      trackingUrl,
    });

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

    const now = new Date();
    ensureShippingObject(order);

    order.status = nextStatus;

    if (normalizedMethod) {
      order.shipping.method = normalizedMethod;
    }

    order.shipping.carrier = normalizedCarrier;
    order.shipping.trackingNumber = normalizedTrackingNumber;
    order.shipping.trackingUrl = resolvedTrackingUrl;

    if (shouldClearShippedAt(nextStatus, normalizedTrackingNumber)) {
      order.shipping.shippedAt = null;
    }

    if (nextStatus === 'shipped' || nextStatus === 'delivered') {
      if (!order.shipping.shippedAt) {
        order.shipping.shippedAt = now;
      }
    }

    if (shouldClearDeliveredAt(nextStatus)) {
      order.shipping.deliveredAt = null;
    }

    if (nextStatus === 'delivered') {
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