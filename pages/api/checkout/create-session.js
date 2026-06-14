// pages/api/checkout/create-session.js

import mongoose from 'mongoose';
import { connectMongo } from '../../../lib/mongodb';
import { getSessionFromRequest } from '../../../lib/session';
import Order from '../../../models/Order';
import Product from '../../../models/Product';

function buildOrigin(req) {
  return (
    req.headers.origin ||
    `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`
  );
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeIncomingItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const slug =
        typeof item.slug === 'string' && item.slug.trim()
          ? item.slug.trim()
          : '';

      const quantity = Number(item.quantity);

      const color =
        typeof item.color === 'string' && item.color.trim()
          ? item.color.trim()
          : '';

      if (!slug || !Number.isFinite(quantity) || quantity <= 0) {
        return null;
      }

      return {
        slug,
        quantity: Math.max(1, Math.floor(quantity)),
        color,
      };
    })
    .filter(Boolean);
}

function getSafeStock(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function resolveVariantData(product, colorName) {
  if (!colorName || !Array.isArray(product.colors)) {
    return {
      color: '',
      unitPrice: Number(product.price),
      imageUrl: product.imageUrl || '',
    };
  }

  const normalizedColorName = colorName.trim().toLowerCase();

  const variant =
    product.colors.find((c) => {
      if (!c || typeof c !== 'object') return false;
      if (!c.name) return false;
      return String(c.name).trim().toLowerCase() === normalizedColorName;
    }) || null;

  if (!variant) {
    return {
      color: '',
      unitPrice: Number(product.price),
      imageUrl: product.imageUrl || '',
    };
  }

  const variantPrice =
    variant.price !== undefined && variant.price !== null
      ? Number(variant.price)
      : Number(product.price);

  const finalUnitPrice = Number.isFinite(variantPrice) && variantPrice >= 0
    ? variantPrice
    : Number(product.price);

  const variantImage =
    typeof variant.imageUrl === 'string' && variant.imageUrl.trim()
      ? variant.imageUrl.trim()
      : product.imageUrl || '';

  return {
    color: variant.name,
    unitPrice: finalUnitPrice,
    imageUrl: variantImage,
  };
}

async function resolveOrderItemsFromProducts(incomingItems) {
  const slugs = [...new Set(incomingItems.map((item) => item.slug))];

  const products = await Product.find({
    slug: { $in: slugs },
    isArchived: false,
  });

  const productMap = new Map(products.map((product) => [product.slug, product]));
  const resolvedItems = [];

  for (const incomingItem of incomingItems) {
    const product = productMap.get(incomingItem.slug);

    if (!product) {
      continue;
    }

    const safeQuantity = Number(incomingItem.quantity);

    if (!Number.isFinite(safeQuantity) || safeQuantity <= 0) {
      continue;
    }

    const { color, unitPrice, imageUrl } = resolveVariantData(
      product,
      incomingItem.color
    );

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      continue;
    }

    resolvedItems.push({
      productId: product._id,
      name: product.name,
      slug: product.slug,
      color,
      quantity: safeQuantity,
      unitPrice,
      imageUrl,
    });
  }

  return resolvedItems;
}

function buildOrderPayload({
  userId,
  customer,
  resolvedItems,
  normalizedShipping,
  notes,
  status,
  paymentStatus,
  stripeSessionId = '',
  stripePaymentIntentId = '',
}) {
  const subtotalAmount = resolvedItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  const shippingAmount = 0;
  const totalAmount = subtotalAmount + shippingAmount;

  return {
    userId,
    status,
    paymentStatus,
    customer: {
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
    },
    subtotalAmount,
    shippingAmount,
    totalAmount,
    currency: 'EUR',
    items: resolvedItems,
    notes: normalizeText(notes),
    stripeSessionId,
    stripePaymentIntentId,
    shippingAddress: {
      addressLine1: normalizedShipping.address,
      addressLine2: '',
      postalCode: normalizedShipping.zip,
      city: normalizedShipping.city,
      country: normalizedShipping.country,
    },
  };
}

function buildStripeLineItems(resolvedItems) {
  return resolvedItems.map((item) => ({
    quantity: item.quantity,
    price_data: {
      currency: 'eur',
      product_data: {
        name: item.color ? `${item.name} - ${item.color}` : item.name,
        images: item.imageUrl ? [item.imageUrl] : undefined,
        metadata: {
          slug: item.slug,
          productId: String(item.productId),
          color: item.color || '',
        },
      },
      unit_amount: Math.round(item.unitPrice * 100),
    },
  }));
}

function getStripeClient(stripeSecretKey) {
  // eslint-disable-next-line global-require
  const Stripe = require('stripe');

  return new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16',
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

  try {
    const session = getSessionFromRequest(req);

    if (!session?.userId || !mongoose.Types.ObjectId.isValid(session.userId)) {
      return res.status(401).json({
        ok: false,
        code: 'UNAUTHENTICATED',
        message: 'Vous devez être connectée pour finaliser votre commande.',
      });
    }

    const { items, customer, shipping, notes } = req.body || {};
    const userId = session.userId;

    const normalizedItems = normalizeIncomingItems(items);

    if (!normalizedItems.length) {
      return res.status(400).json({
        ok: false,
        code: 'EMPTY_CART',
        message: 'Votre panier est vide ou invalide.',
      });
    }

    const normalizedCustomer = {
      firstName: normalizeText(customer?.firstName),
      lastName: normalizeText(customer?.lastName),
      email: normalizeText(customer?.email),
      phone: normalizeText(customer?.phone),
    };

    const normalizedShipping = {
      address: normalizeText(shipping?.address),
      city: normalizeText(shipping?.city),
      zip: normalizeText(shipping?.zip),
      country: normalizeText(shipping?.country) || 'France',
    };

    if (
      !normalizedCustomer.firstName ||
      !normalizedCustomer.lastName ||
      !normalizedCustomer.email ||
      !normalizedCustomer.phone
    ) {
      return res.status(400).json({
        ok: false,
        code: 'INVALID_CUSTOMER',
        message:
          'Les informations de contact sont incomplètes. Merci de réessayer.',
      });
    }

    if (
      !normalizedShipping.address ||
      !normalizedShipping.city ||
      !normalizedShipping.zip ||
      !normalizedShipping.country
    ) {
      return res.status(400).json({
        ok: false,
        code: 'INVALID_SHIPPING',
        message:
          'Les informations de livraison sont incomplètes. Merci de réessayer.',
      });
    }

    await connectMongo();

    const resolvedItems = await resolveOrderItemsFromProducts(normalizedItems);

    if (!resolvedItems.length) {
      return res.status(400).json({
        ok: false,
        code: 'INVALID_ITEMS',
        message:
          'Les produits du panier sont introuvables ou ne sont plus disponibles.',
      });
    }

    const stripeSecretKey =
      process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET;

    const origin = buildOrigin(req);
    const successUrl = `${origin}/panier?checkout=success`;
    const cancelUrl = `${origin}/panier?checkout=cancel`;

    if (!stripeSecretKey) {
      const simulatedOrder = await Order.create(
        buildOrderPayload({
          userId,
          customer: normalizedCustomer,
          resolvedItems,
          normalizedShipping,
          notes,
          status: 'pending',
          paymentStatus: 'paid',
          stripeSessionId: 'SIMULATED_SESSION',
          stripePaymentIntentId: 'SIMULATED_PAYMENT',
        })
      );

      return res.status(200).json({
        ok: true,
        code: 'SIMULATED_ORDER_CREATED',
        message: 'Commande simulée créée avec succès.',
        orderId: simulatedOrder._id,
        url: successUrl,
      });
    }

    const pendingOrder = await Order.create(
      buildOrderPayload({
        userId,
        customer: normalizedCustomer,
        resolvedItems,
        normalizedShipping,
        notes,
        status: 'pending',
        paymentStatus: 'pending',
      })
    );

    try {
      const stripe = getStripeClient(stripeSecretKey);
      const lineItems = buildStripeLineItems(resolvedItems);

      const stripeSession = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: lineItems,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          order_id: String(pendingOrder._id),
          user_id: String(userId),
          customer_email: normalizedCustomer.email || '',
          customer_firstname: normalizedCustomer.firstName || '',
          customer_lastname: normalizedCustomer.lastName || '',
          shipping_address: normalizedShipping.address || '',
          shipping_city: normalizedShipping.city || '',
          shipping_zip: normalizedShipping.zip || '',
          shipping_country: normalizedShipping.country || '',
          notes: normalizeText(notes) || '',
        },
      });

      pendingOrder.stripeSessionId = stripeSession.id;
      await pendingOrder.save();

      return res.status(200).json({
        ok: true,
        code: 'SESSION_CREATED',
        sessionId: stripeSession.id,
        orderId: pendingOrder._id,
        url: stripeSession.url,
      });
    } catch (stripeError) {
      await Order.deleteOne({ _id: pendingOrder._id });

      console.error('CHECKOUT_STRIPE_SESSION_ERROR', stripeError);

      return res.status(500).json({
        ok: false,
        code: 'STRIPE_SESSION_ERROR',
        message:
          'Une erreur est survenue lors de la création de la session de paiement.',
      });
    }
  } catch (error) {
    console.error('CHECKOUT_CREATE_SESSION_ERROR', error);

    return res.status(500).json({
      ok: false,
      code: 'CHECKOUT_ERROR',
      message:
        'Une erreur est survenue lors de la préparation du paiement. Merci de réessayer plus tard.',
    });
  }
}