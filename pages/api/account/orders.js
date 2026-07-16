// pages/api/account/orders.js

import mongoose from 'mongoose';
import { connectMongo } from '../../../lib/mongodb';
import { getSessionFromRequest } from '../../../lib/session';
import Order from '../../../models/Order';
import User from '../../../models/User';

function formatOrderStatus(status, paymentStatus) {
  if (status === 'cancelled') {
    return 'Annulée';
  }

  if (status === 'delivered') {
    return 'Livrée';
  }

  if (status === 'shipped') {
    return 'Expédiée';
  }

  if (status === 'preparing') {
    return 'En préparation';
  }

  if (status === 'pending' && paymentStatus === 'paid') {
    return 'Payée';
  }

  return 'En attente';
}

function serializeOrder(order) {
  const items = Array.isArray(order.items)
    ? order.items.map((item, index) => ({
        id:
          item.productId && mongoose.Types.ObjectId.isValid(String(item.productId))
            ? String(item.productId)
            : `${order._id}-${index}`,
        name: item.name || 'Produit',
        quantity: Number(item.quantity) || 0,
        price: Number(item.unitPrice) || 0,
        image: item.imageUrl || '/images/placeholder-product.jpg',
        slug: item.slug || '',
        color: item.color || '',
      }))
    : [];

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    id: String(order._id),
    orderNumber: order.orderNumber || '',
    createdAt: order.createdAt,
    status: formatOrderStatus(order.status, order.paymentStatus),
    total: Number(order.totalAmount) || 0,
    itemCount,
    items,
    shippingMethod: order.shipping?.method || '',
    carrier: order.shipping?.carrier || '',
    trackingNumber: order.shipping?.trackingNumber || '',
    trackingUrl: order.shipping?.trackingUrl || '',
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
    await connectMongo();

    const session = getSessionFromRequest(req);

    if (!session?.userId || !mongoose.Types.ObjectId.isValid(session.userId)) {
      return res.status(401).json({
        ok: false,
        message: 'Utilisateur non authentifié.',
      });
    }

    const user = await User.findById(session.userId).lean();

    if (!user) {
      return res.status(404).json({
        ok: false,
        message: 'Utilisateur introuvable.',
      });
    }

    const normalizedEmail =
      typeof user.email === 'string' ? user.email.trim().toLowerCase() : '';

    const ordersQuery = normalizedEmail
      ? {
          $or: [
            { userId: session.userId },
            { userId: null, 'customer.email': normalizedEmail },
          ],
        }
      : {
          userId: session.userId,
        };

    const orders = await Order.find(ordersQuery).sort({ createdAt: -1 }).lean();

    const uniqueOrders = Array.from(
      new Map(orders.map((order) => [String(order._id), order])).values()
    );

    return res.status(200).json({
      ok: true,
      orders: uniqueOrders.map(serializeOrder),
    });
  } catch (error) {
    console.error('ACCOUNT_ORDERS_GET_ERROR', {
      message: error?.message || null,
      stack: error?.stack || null,
      raw: error,
    });

    return res.status(500).json({
      ok: false,
      message:
        'Une erreur est survenue lors de la récupération des commandes.',
    });
  }
}