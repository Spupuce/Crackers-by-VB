// pages/api/stripe/webhook.js

import { buffer } from 'micro';
import mongoose from 'mongoose';
import { connectMongo } from '../../../lib/mongodb';
import Order from '../../../models/Order';
import Product from '../../../models/Product';

export const config = {
  api: {
    bodyParser: false,
  },
};

function getStripeClient() {
  const stripeSecretKey =
    process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET;

  if (!stripeSecretKey) {
    throw new Error('Clé Stripe secrète manquante.');
  }

  // eslint-disable-next-line global-require
  const Stripe = require('stripe');

  return new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16',
  });
}

async function decrementStockForOrder(order) {
  if (!Array.isArray(order.items) || order.items.length === 0) {
    return;
  }

  for (const item of order.items) {
    if (!item.productId || !mongoose.Types.ObjectId.isValid(String(item.productId))) {
      // Pas de productId fiable → on ignore cette ligne pour le stock
      // (la commande reste néanmoins marquée payée)
      // eslint-disable-next-line no-continue
      continue;
    }

    const product = await Product.findById(item.productId);

    if (!product) {
      // Produit supprimé ou introuvable → on ne décrémente rien
      // eslint-disable-next-line no-continue
      continue;
    }

    const orderedQty = Number(item.quantity) || 0;
    if (orderedQty <= 0) {
      // eslint-disable-next-line no-continue
      continue;
    }

    // Variante couleur
    if (item.color && Array.isArray(product.colors) && product.colors.length > 0) {
      const normalizedColorName = String(item.color).trim().toLowerCase();

      const colorVariant = product.colors.find((c) => {
        if (!c || !c.name) return false;
        return String(c.name).trim().toLowerCase() === normalizedColorName;
      });

      if (colorVariant) {
        const currentQty = Number(colorVariant.quantity) || 0;
        const newQty = Math.max(currentQty - orderedQty, 0);

        colorVariant.quantity = newQty;

        // Ici, on ne touche pas au stock global product.stock
        // pour ne pas casser une logique déjà en place ailleurs.
      }
    } else {
      // Pas de couleur → décrément stock global
      const currentStock = Number(product.stock) || 0;
      const newStock = Math.max(currentStock - orderedQty, 0);
      product.stock = newStock;
    }

    await product.save();
  }
}

async function markOrderAsPaid(session) {
  // Optionnel mais plus robuste : ne traiter que les sessions réellement payées
  if (session.payment_status && session.payment_status !== 'paid') {
    // On ne fait rien si Stripe nous envoie autre chose que 'paid'
    return;
  }

  const orderId = session?.metadata?.order_id;
  const stripeSessionId = typeof session?.id === 'string' ? session.id : '';
  const stripePaymentIntentId =
    typeof session?.payment_intent === 'string' ? session.payment_intent : '';

  let order = null;

  if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
    order = await Order.findById(orderId);
  }

  if (!order && stripeSessionId) {
    order = await Order.findOne({ stripeSessionId });
  }

  if (!order) {
    throw new Error('Commande introuvable pour cette session Stripe.');
  }

  if (order.status === 'cancelled') {
    throw new Error("Impossible de marquer comme payée une commande annulée.");
  }

  // Protection forte : une commande déjà payée ne doit jamais retrigger le stock
  if (order.paymentStatus === 'paid') {
    return;
  }

  const alreadyPaidWithSameIds =
    order.paymentStatus === 'paid' &&
    (!stripePaymentIntentId || order.stripePaymentIntentId === stripePaymentIntentId) &&
    (!stripeSessionId || order.stripeSessionId === stripeSessionId);

  if (alreadyPaidWithSameIds) {
    // Webhook dupliqué, on ne refait rien
    return;
  }

  await decrementStockForOrder(order);

  order.paymentStatus = 'paid';

  if (stripeSessionId) {
    order.stripeSessionId = stripeSessionId;
  }

  if (stripePaymentIntentId) {
    order.stripePaymentIntentId = stripePaymentIntentId;
  }

  await order.save();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      ok: false,
      message: 'Méthode non autorisée.',
    });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(500).json({
      ok: false,
      message: 'Webhook Stripe non configuré.',
    });
  }

  try {
    const stripe = getStripeClient();
    const rawBody = await buffer(req);
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(400).json({
        ok: false,
        message: 'Signature Stripe manquante.',
      });
    }

    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );

    await connectMongo();

    switch (event.type) {
      case 'checkout.session.completed': {
        await markOrderAsPaid(event.data.object);
        break;
      }

      default:
        break;
    }

    return res.status(200).json({
      ok: true,
      received: true,
    });
  } catch (error) {
    console.error('STRIPE_WEBHOOK_ERROR', error);

    return res.status(400).json({
      ok: false,
      message: 'Erreur lors du traitement du webhook Stripe.',
    });
  }
}