// pages/api/stripe/webhook.js

import { buffer } from 'micro';
import mongoose from 'mongoose';
import { connectMongo } from '../../../lib/mongodb';
import Order from '../../../models/Order';
import Product from '../../../models/Product';
import { sendOrderConfirmationEmail } from '../../../lib/services/emailService';

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

function getBaseUrlFromEnv() {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    process.env.NEXTAUTH_URL,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim().replace(/\/+$/, '');
    }
  }

  return '';
}

function buildAccountUrl(order) {
  if (!order?.userId) {
    return '';
  }

  const baseUrl = getBaseUrlFromEnv();

  if (!baseUrl) {
    return '';
  }

  return `${baseUrl}/mon-compte`;
}

function normalizeCurrency(currency) {
  if (typeof currency === 'string' && currency.trim()) {
    return currency.trim().toUpperCase();
  }

  return 'EUR';
}

function buildEmailOrderItems(order) {
  if (!Array.isArray(order?.items) || order.items.length === 0) {
    return [];
  }

  return order.items.map((item, index) => {
    const unitPrice = Number(item?.unitPrice) || 0;
    const quantity = Number(item?.quantity) || 0;

    return {
      id: item?.productId ? String(item.productId) : `item-${index}`,
      name: item?.name ? String(item.name).trim() : 'Produit',
      color: item?.color ? String(item.color).trim() : '',
      quantity,
      unitPrice,
      lineTotal: unitPrice * quantity,
    };
  });
}

function buildEmailOrderSummary(order) {
  return {
    items: buildEmailOrderItems(order),
    subtotalAmount: Number(order?.subtotalAmount) || 0,
    shippingAmount: Number(order?.shippingAmount) || 0,
    totalAmount: Number(order?.totalAmount) || 0,
    currency: normalizeCurrency(order?.currency),
  };
}

async function decrementStockForOrder(order) {
  if (!Array.isArray(order.items) || order.items.length === 0) {
    return;
  }

  for (const item of order.items) {
    if (
      !item.productId ||
      !mongoose.Types.ObjectId.isValid(String(item.productId))
    ) {
      // eslint-disable-next-line no-continue
      continue;
    }

    const product = await Product.findById(item.productId);

    if (!product) {
      // eslint-disable-next-line no-continue
      continue;
    }

    const orderedQty = Number(item.quantity) || 0;

    if (orderedQty <= 0) {
      // eslint-disable-next-line no-continue
      continue;
    }

    if (
      item.color &&
      Array.isArray(product.colors) &&
      product.colors.length > 0
    ) {
      const normalizedColorName = String(item.color).trim().toLowerCase();

      const colorVariant = product.colors.find((c) => {
        if (!c || !c.name) return false;
        return String(c.name).trim().toLowerCase() === normalizedColorName;
      });

      if (colorVariant) {
        const currentQty = Number(colorVariant.quantity) || 0;
        const newQty = Math.max(currentQty - orderedQty, 0);

        colorVariant.quantity = newQty;
      }
    } else {
      const currentStock = Number(product.stock) || 0;
      const newStock = Math.max(currentStock - orderedQty, 0);
      product.stock = newStock;
    }

    await product.save();
  }
}

async function markOrderAsPaid(session) {
  if (session.payment_status && session.payment_status !== 'paid') {
    return {
      order: null,
      didMarkAsPaid: false,
    };
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

  if (order.paymentStatus === 'paid') {
    return {
      order,
      didMarkAsPaid: false,
    };
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

  return {
    order,
    didMarkAsPaid: true,
  };
}

function getOrderCustomerEmail(order, session) {
  if (typeof order?.customer?.email === 'string' && order.customer.email.trim()) {
    return order.customer.email.trim();
  }

  if (
    typeof session?.customer_details?.email === 'string' &&
    session.customer_details.email.trim()
  ) {
    return session.customer_details.email.trim();
  }

  if (
    typeof session?.customer_email === 'string' &&
    session.customer_email.trim()
  ) {
    return session.customer_email.trim();
  }

  return '';
}

function getOrderCustomerName(order) {
  if (typeof order?.customer?.firstName === 'string' && order.customer.firstName.trim()) {
    return order.customer.firstName.trim();
  }

  return '';
}

function getOrderReference(order) {
  if (typeof order?.orderNumber === 'string' && order.orderNumber.trim()) {
    return order.orderNumber.trim();
  }

  if (order?._id) {
    return String(order._id);
  }

  return 'commande';
}

async function sendConfirmationEmailForOrder(order, session) {
  const customerEmail = getOrderCustomerEmail(order, session);

  if (!customerEmail) {
    console.warn('STRIPE_ORDER_CONFIRMATION_EMAIL_SKIPPED_NO_EMAIL', {
      orderId: order?._id ? String(order._id) : null,
      stripeSessionId: session?.id || null,
    });
    return;
  }

  const customerName = getOrderCustomerName(order);
  const orderId = getOrderReference(order);
  const accountUrl = buildAccountUrl(order);
  const orderSummary = buildEmailOrderSummary(order);

  const info = await sendOrderConfirmationEmail({
    customerEmail,
    customerName,
    orderId,
    accountUrl,
    orderSummary,
  });

  console.log('STRIPE_ORDER_CONFIRMATION_EMAIL_SENT', {
    orderId,
    customerEmail,
    accountUrl: accountUrl || null,
    itemCount: orderSummary.items.length,
    totalAmount: orderSummary.totalAmount,
    currency: orderSummary.currency,
    messageId: info?.messageId || null,
    accepted: info?.accepted || [],
    rejected: info?.rejected || [],
    response: info?.response || null,
  });
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
        const session = event.data.object;
        const { order, didMarkAsPaid } = await markOrderAsPaid(session);

        if (order && didMarkAsPaid) {
          await sendConfirmationEmailForOrder(order, session);
        }

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
    console.error('STRIPE_WEBHOOK_ERROR', {
      message: error?.message || error,
      code: error?.code || null,
      type: error?.type || null,
      stack: error?.stack || null,
    });

    return res.status(400).json({
      ok: false,
      message: 'Erreur lors du traitement du webhook Stripe.',
    });
  }
}