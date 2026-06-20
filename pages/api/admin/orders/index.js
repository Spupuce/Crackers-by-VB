// pages/api/admin/orders/index.js

import { connectMongo } from '../../../../lib/mongodb';
import { getSessionUser } from '../../../../lib/session';
import Order from '../../../../models/Order';

function serializeOrder(order) {
  return {
    _id: order._id?.toString() || '',
    orderNumber: order.orderNumber || '',
    status: order.status || 'pending',
    paymentStatus: order.paymentStatus || 'pending',
    customer: {
      firstName: order.customer?.firstName || '',
      lastName: order.customer?.lastName || '',
      email: order.customer?.email || '',
      phone: order.customer?.phone || '',
    },
    subtotalAmount: Number(order.subtotalAmount || 0),
    shippingAmount: Number(order.shippingAmount || 0),
    totalAmount: Number(order.totalAmount || 0),
    currency: order.currency || 'EUR',
    items: Array.isArray(order.items)
      ? order.items.map((item) => ({
          productId: item.productId?.toString() || '',
          name: item.name || '',
          slug: item.slug || '',
          color: item.color || '',
          quantity: Number(item.quantity || 0),
          unitPrice: Number(item.unitPrice || 0),
          imageUrl: item.imageUrl || '',
        }))
      : [],
    shippingAddress: {
      addressLine1: order.shippingAddress?.addressLine1 || '',
      addressLine2: order.shippingAddress?.addressLine2 || '',
      postalCode: order.shippingAddress?.postalCode || '',
      city: order.shippingAddress?.city || '',
      country: order.shippingAddress?.country || '',
    },
    shipping: {
      method: order.shipping?.method || '',
      carrier: order.shipping?.carrier || '',
      trackingNumber: order.shipping?.trackingNumber || '',
      trackingUrl: order.shipping?.trackingUrl || '',
      shippedAt: order.shipping?.shippedAt || null,
      deliveredAt: order.shipping?.deliveredAt || null,
    },
    stripeSessionId: order.stripeSessionId || '',
    stripePaymentIntentId: order.stripePaymentIntentId || '',
    notes: order.notes || '',
    createdAt: order.createdAt || null,
    updatedAt: order.updatedAt || null,
    isUserDeleted: Boolean(order.isUserDeleted),
    anonymizedAt: order.anonymizedAt || null,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      ok: false,
      message: 'Méthode non autorisée.',
    });
  }

  try {
    const sessionUser = await getSessionUser(req, res);

    if (!sessionUser) {
      return res.status(401).json({
        ok: false,
        message: 'Authentification requise.',
      });
    }

    if (sessionUser.role !== 'admin') {
      return res.status(403).json({
        ok: false,
        message: 'Accès administrateur requis.',
      });
    }

    await connectMongo();

    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      ok: true,
      orders: orders.map(serializeOrder),
    });
  } catch (error) {
    console.error('ADMIN_ORDERS_LIST_ERROR', error);

    return res.status(500).json({
      ok: false,
      message: 'Impossible de récupérer les commandes administrateur.',
    });
  }
}