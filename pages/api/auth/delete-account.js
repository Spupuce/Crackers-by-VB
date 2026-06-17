// pages/api/auth/delete-account.js

import bcrypt from 'bcryptjs';
import { connectMongo } from '../../../lib/mongodb';
import { getSessionFromRequest, clearSessionCookie } from '../../../lib/session';
import User from '../../../models/User';
import RestockRequest from '../../../models/RestockRequest';
import Order from '../../../models/Order';

function buildAnonymizedOrderEmail(orderId) {
  return `deleted-order-${String(orderId)}@anonymized.local`;
}

async function anonymizeUserOrders(user) {
  if (!user?._id) {
    return 0;
  }

  const orders = await Order.find({
    userId: user._id,
  });

  if (!orders.length) {
    return 0;
  }

  const anonymizedAt = new Date();

  await Promise.all(
    orders.map(async (order) => {
      order.userId = null;
      order.isUserDeleted = true;
      order.anonymizedAt = anonymizedAt;

      order.customer = {
        firstName: 'Compte',
        lastName: 'supprimé',
        email: buildAnonymizedOrderEmail(order._id),
        phone: 'Donnée supprimée',
      };

      order.shippingAddress = {
        addressLine1: 'Adresse supprimée',
        addressLine2: '',
        postalCode: '00000',
        city: 'Ville supprimée',
        country: 'France',
      };

      order.notes = '';

      await order.save();
    })
  );

  return orders.length;
}

async function deleteUserRelatedData(user) {
  let deletedRestockRequestsCount = 0;
  let anonymizedOrdersCount = 0;

  if (user?.email) {
    const deleteRestockResult = await RestockRequest.deleteMany({
      email: user.email,
    });

    deletedRestockRequestsCount = deleteRestockResult?.deletedCount || 0;
  }

  anonymizedOrdersCount = await anonymizeUserOrders(user);

  return {
    deletedRestockRequestsCount,
    anonymizedOrdersCount,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({
      message: 'Méthode non autorisée.',
    });
  }

  try {
    await connectMongo();

    const session = getSessionFromRequest(req);

    if (!session?.userId) {
      return res.status(401).json({
        message: 'Utilisateur non authentifié.',
      });
    }

    const { password = '' } = req.body || {};
    const normalizedPassword = String(password).trim();

    if (!normalizedPassword) {
      return res.status(400).json({
        message: 'Le mot de passe actuel est obligatoire.',
      });
    }

    const user = await User.findById(session.userId);

    if (!user) {
      clearSessionCookie(res);

      return res.status(404).json({
        message: 'Utilisateur introuvable.',
      });
    }

    const passwordMatches = await bcrypt.compare(
      normalizedPassword,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: 'Le mot de passe actuel est incorrect.',
      });
    }

    const relatedDataResult = await deleteUserRelatedData(user);
    await User.findByIdAndDelete(user._id);

    clearSessionCookie(res);

    const hasAnonymizedOrders = relatedDataResult.anonymizedOrdersCount > 0;

    return res.status(200).json({
      message: hasAnonymizedOrders
        ? 'Votre compte a bien été supprimé. Vos demandes de réassort associées ont été supprimées et vos commandes passées ont été conservées sous une forme anonymisée.'
        : 'Votre compte ainsi que vos demandes de réassort associées ont bien été supprimés.',
    });
  } catch (error) {
    console.error('DELETE_ACCOUNT_ERROR', error);

    return res.status(500).json({
      message: 'Une erreur est survenue lors de la suppression du compte.',
    });
  }
}