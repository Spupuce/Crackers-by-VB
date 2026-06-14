// pages/api/stripe/webhook.js

import { buffer } from 'micro';
import mongoose from 'mongoose';
import { connectMongo } from '../../../lib/mongodb';
import Order from '../../../models/Order';

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

async function markOrderAsPaid(session) {
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

  const alreadyPaid =
    order.paymentStatus === 'paid' &&
    (!stripePaymentIntentId || order.stripePaymentIntentId === stripePaymentIntentId) &&
    (!stripeSessionId || order.stripeSessionId === stripeSessionId);

  if (alreadyPaid) {
    return;
  }

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