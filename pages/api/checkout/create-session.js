// pages/api/checkout/create-session.js

import mongoose from 'mongoose';
import { connectMongo } from '../../../lib/mongodb';
import Order from '../../../models/Order';

function buildOrigin(req) {
  return (
    req.headers.origin ||
    `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`
  );
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res
      .status(405)
      .json({ ok: false, message: 'Méthode non autorisée.' });
  }

  try {
    const { items, customer, shipping, notes, userId } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        ok: false,
        code: 'EMPTY_CART',
        message: 'Votre panier est vide.',
      });
    }

    const normalizedItems = items
      .map((item) => {
        if (!item || typeof item !== 'object') return null;

        const slug =
          typeof item.slug === 'string' && item.slug.trim()
            ? item.slug.trim()
            : null;

        const name =
          typeof item.name === 'string' && item.name.trim()
            ? item.name.trim()
            : null;

        const quantity = Number(item.quantity);
        const price = Number(item.price);

        if (
          !slug ||
          !name ||
          !Number.isFinite(quantity) ||
          !Number.isFinite(price)
        ) {
          return null;
        }

        if (quantity <= 0 || price < 0) {
          return null;
        }

        return {
          slug,
          name,
          quantity,
          price,
        };
      })
      .filter(Boolean);

    if (!normalizedItems.length) {
      return res.status(400).json({
        ok: false,
        code: 'INVALID_ITEMS',
        message:
          'Les informations du panier sont invalides. Merci de réessayer.',
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

    const stripeSecretKey =
      process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET;

    const origin = buildOrigin(req);
    const successUrl = `${origin}/panier?checkout=success`;
    const cancelUrl = `${origin}/panier?checkout=cancel`;

    if (!stripeSecretKey) {
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          ok: false,
          code: 'MISSING_USER_ID',
          message:
            "Impossible de simuler la commande sans identifiant utilisateur valide.",
        });
      }

      await connectMongo();

      const totalAmount = normalizedItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      const order = await Order.create({
        userId,
        status: 'paid',
        totalAmount,
        currency: 'EUR',
        items: normalizedItems.map((item) => ({
          productId: new mongoose.Types.ObjectId(),
          name: item.name,
          slug: item.slug,
          quantity: item.quantity,
          unitPrice: item.price,
          imageUrl: '',
        })),
        notes: normalizeText(notes),
        stripeSessionId: 'SIMULATED_SESSION',
        stripePaymentIntentId: 'SIMULATED_PAYMENT',
        shippingAddress: {
          addressLine1: normalizedShipping.address,
          addressLine2: '',
          postalCode: normalizedShipping.zip,
          city: normalizedShipping.city,
          country: normalizedShipping.country,
        },
      });

      return res.status(200).json({
        ok: true,
        code: 'SIMULATED_ORDER_CREATED',
        message: 'Commande simulée créée avec succès.',
        orderId: order._id,
        url: successUrl,
      });
    }

    // eslint-disable-next-line global-require
    const Stripe = require('stripe');
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const lineItems = normalizedItems.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: 'eur',
        product_data: {
          name: item.name,
          metadata: {
            slug: item.slug,
          },
        },
        unit_amount: Math.round(item.price * 100),
      },
    }));

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        customer_email: normalizedCustomer.email || '',
        customer_firstname: normalizedCustomer.firstName || '',
        customer_lastname: normalizedCustomer.lastName || '',
        shipping_address: normalizedShipping.address || '',
        shipping_city: normalizedShipping.city || '',
        shipping_zip: normalizedShipping.zip || '',
        shipping_country: normalizedShipping.country || '',
        notes: normalizeText(notes) || '',
        user_id: typeof userId === 'string' ? userId : '',
      },
    });

    return res.status(200).json({
      ok: true,
      code: 'SESSION_CREATED',
      sessionId: session.id,
      url: session.url,
    });
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