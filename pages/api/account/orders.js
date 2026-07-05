// pages/api/account/orders.js

import mongoose from 'mongoose';
import { connectMongo } from '../../../lib/mongodb';
import { getSessionFromRequest } from '../../../lib/session';
import Order from '../../../models/Order';

function formatOrderStatus(status) {
  switch (status) {
    case 'delivered':
      return 'Livrée';
    case 'preparing':
      return 'En préparation';
    case 'paid':
      return 'Payée';
    case 'shipped':
      return 'Expédiée';
    case 'cancelled':
      return 'Annulée';
    case 'pending':
    default:
      return 'En attente';
  }
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
      }))
    : [];

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    id: String(order._id),
    createdAt: order.createdAt,
    status: formatOrderStatus(order.status),
    total: Number(order.totalAmount) || 0,
    itemCount,
    items,
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

    // On récupère d’abord les commandes liées au userId.
    const userId = session.userId;

    const primaryOrdersQuery = {
      userId,
    };

    let orders = await Order.find(primaryOrdersQuery)
      .sort({ createdAt: -1 })
      .lean();

    // Si aucune commande n’est liée par userId, on tente un fallback par email.
    // On ne casse pas la logique existante, on ajoute seulement un cas de rattrapage
    // pour les commandes passées en invité mais avec la même adresse email.
    if (!orders.length && typeof session.email === 'string' && session.email.trim()) {
      const normalizedEmail = session.email.trim().toLowerCase();

      const fallbackOrders = await Order.find({
        $or: [
          { userId },
          { userId: null, 'customer.email': normalizedEmail },
        ],
      })
        .sort({ createdAt: -1 })
        .lean();

      orders = fallbackOrders;
    }

    return res.status(200).json({
      ok: true,
      orders: orders.map(serializeOrder),
    });
  } catch (error) {
    console.error('ACCOUNT_ORDERS_GET_ERROR', error);

    return res.status(500).json({
      ok: false,
      message:
        'Une erreur est survenue lors de la récupération des commandes.',
    });
  }
}