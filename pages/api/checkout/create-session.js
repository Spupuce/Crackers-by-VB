// pages/api/checkout/create-session.js

import mongoose from 'mongoose';
import { connectMongo } from '../../../lib/mongodb';
import { getSessionFromRequest } from '../../../lib/session';
import Order from '../../../models/Order';
import Product from '../../../models/Product';
import {
  computeShippingAmount,
  getParcelSizeFromItems,
  normalizeDeliveryMethod,
} from '../../../utils/shipping';

function buildOrigin(req) {
  const originHeader =
    typeof req.headers.origin === 'string' ? req.headers.origin.trim() : '';

  if (originHeader) {
    return originHeader.replace(/\/$/, '');
  }

  const forwardedProto =
    typeof req.headers['x-forwarded-proto'] === 'string' &&
    req.headers['x-forwarded-proto'].trim()
      ? req.headers['x-forwarded-proto'].trim()
      : 'http';

  const host =
    typeof req.headers.host === 'string' ? req.headers.host.trim() : '';

  if (!host) {
    throw new Error("L'origine de la requête est introuvable.");
  }

  return `${forwardedProto}://${host}`.replace(/\/$/, '');
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

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function isValidEmail(email) {
  if (!email) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getSafeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getSafeStock(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function hasValidPromoPrice(product) {
  if (!product) {
    return false;
  }

  const price = Number(product.price);
  const rawPromoPrice = product.promoPrice;

  if (
    rawPromoPrice === undefined ||
    rawPromoPrice === null ||
    rawPromoPrice === ''
  ) {
    return false;
  }

  const promoPrice = Number(rawPromoPrice);

  if (Number.isNaN(price) || Number.isNaN(promoPrice)) {
    return false;
  }

  return promoPrice >= 0 && promoPrice < price;
}

function getActiveProductPrice(product) {
  if (hasValidPromoPrice(product)) {
    return Number(product.promoPrice);
  }

  return getSafeNumber(product?.price);
}

function resolveVariantDataWithStock(product, colorName) {
  const basePrice = getActiveProductPrice(product);
  const baseImage = typeof product.imageUrl === 'string' ? product.imageUrl : '';
  const baseStock = getSafeStock(product.stock);

  if (!colorName || !Array.isArray(product.colors)) {
    return {
      color: '',
      unitPrice: basePrice,
      imageUrl: baseImage,
      availableStock: baseStock,
      invalidColorRequested: false,
      requestedColorName: '',
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
      unitPrice: basePrice,
      imageUrl: baseImage,
      availableStock: 0,
      invalidColorRequested: true,
      requestedColorName: colorName,
    };
  }

  const variantImage =
    typeof variant.imageUrl === 'string' && variant.imageUrl.trim()
      ? variant.imageUrl.trim()
      : baseImage;

  const variantStock = getSafeStock(variant.quantity);

  return {
    color: variant.name,
    unitPrice: basePrice,
    imageUrl: variantImage,
    availableStock: variantStock,
    invalidColorRequested: false,
    requestedColorName: '',
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
      throw new Error(
        `Le produit "${incomingItem.slug}" n'existe plus ou n'est plus disponible.`
      );
    }

    const safeQuantity = getSafeNumber(incomingItem.quantity);

    if (!Number.isFinite(safeQuantity) || safeQuantity <= 0) {
      throw new Error(
        `La quantité demandée pour "${product.name}" est invalide.`
      );
    }

    const {
      color,
      unitPrice,
      imageUrl,
      availableStock,
      invalidColorRequested,
      requestedColorName,
    } = resolveVariantDataWithStock(product, incomingItem.color);

    if (invalidColorRequested) {
      throw new Error(
        `La couleur "${requestedColorName}" n'est plus disponible pour "${product.name}".`
      );
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new Error(
        `Le prix du produit "${product.name}" est invalide. Merci de réessayer plus tard.`
      );
    }

    if (availableStock <= 0) {
      throw new Error(
        `Le produit "${product.name}" n'est plus en stock${
          color ? ` (couleur "${color}")` : ''
        }.`
      );
    }

    if (safeQuantity > availableStock) {
      throw new Error(
        `La quantité demandée pour "${product.name}"${
          color ? ` (couleur "${color}")` : ''
        } dépasse le stock disponible (${availableStock} maximum).`
      );
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
  deliveryMethod,
  parcelSize,
  shippingAmount,
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

  const totalAmount = subtotalAmount + shippingAmount;

  return {
    userId: userId || null,
    status,
    paymentStatus,
    customer: {
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: normalizeEmail(customer.email),
      phone: normalizeText(customer.phone),
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
    shipping: {
      method: deliveryMethod,
      parcelSize,
      carrier: '',
      trackingNumber: '',
      trackingUrl: '',
      shippedAt: null,
      deliveredAt: null,
    },
  };
}

function buildStripeLineItems(resolvedItems, shippingAmount, deliveryMethod) {
  const productLineItems = resolvedItems.map((item) => ({
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

  if (shippingAmount <= 0) {
    return productLineItems;
  }

  return [
    ...productLineItems,
    {
      quantity: 1,
      price_data: {
        currency: 'eur',
        product_data: {
          name:
            deliveryMethod === 'home'
              ? 'Frais de port - Livraison à domicile'
              : 'Frais de port - Point relais',
          metadata: {
            type: 'shipping',
            deliveryMethod,
          },
        },
        unit_amount: Math.round(shippingAmount * 100),
      },
    },
  ];
}

function getStripeClient(stripeSecretKey) {
  // eslint-disable-next-line global-require
  const Stripe = require('stripe');

  return new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16',
  });
}

function getEnabledPaymentMethodTypes() {
  return ['card'];
}

function getStripeErrorResponse(stripeError) {
  const knownStripeCodes = new Set([
    'authentication_error',
    'api_connection_error',
    'api_error',
    'card_error',
    'idempotency_error',
    'invalid_request_error',
    'rate_limit_error',
  ]);

  const errorType =
    typeof stripeError?.type === 'string' ? stripeError.type : '';
  const errorCode =
    typeof stripeError?.code === 'string' ? stripeError.code : '';
  const isKnownStripeError =
    knownStripeCodes.has(errorType) || errorType.startsWith('Stripe');

  if (!isKnownStripeError) {
    return {
      status: 500,
      code: 'STRIPE_SESSION_ERROR',
      message:
        'Une erreur est survenue lors de la création de la session de paiement.',
    };
  }

  if (errorType === 'invalid_request_error') {
    return {
      status: 500,
      code: 'STRIPE_INVALID_REQUEST',
      message:
        'Une erreur de configuration du paiement est survenue. Merci de réessayer plus tard.',
    };
  }

  if (errorType === 'api_connection_error' || errorType === 'api_error') {
    return {
      status: 502,
      code: 'STRIPE_UNAVAILABLE',
      message:
        'Le service de paiement est momentanément indisponible. Merci de réessayer dans quelques instants.',
    };
  }

  if (errorType === 'rate_limit_error') {
    return {
      status: 503,
      code: 'STRIPE_RATE_LIMIT',
      message:
        'Le service de paiement est temporairement saturé. Merci de réessayer dans quelques instants.',
    };
  }

  if (errorType === 'authentication_error') {
    return {
      status: 500,
      code: 'STRIPE_AUTH_ERROR',
      message:
        'Une erreur de configuration du paiement est survenue. Merci de réessayer plus tard.',
    };
  }

  if (errorType === 'idempotency_error') {
    return {
      status: 409,
      code: 'STRIPE_IDEMPOTENCY_ERROR',
      message:
        'Une tentative de paiement en double a été détectée. Merci de réessayer.',
    };
  }

  if (errorType === 'card_error' && errorCode === 'amount_too_small') {
    return {
      status: 400,
      code: 'STRIPE_AMOUNT_INVALID',
      message:
        'Le montant de la commande est invalide. Merci de vérifier votre panier.',
    };
  }

  return {
    status: 500,
    code: 'STRIPE_SESSION_ERROR',
    message:
      'Une erreur est survenue lors de la création de la session de paiement.',
  };
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
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        ok: false,
        code: 'INVALID_BODY',
        message: 'La requête de paiement est invalide.',
      });
    }

    const session = getSessionFromRequest(req);
    const authenticatedUserId =
      session?.userId && mongoose.Types.ObjectId.isValid(session.userId)
        ? session.userId
        : null;

    const { items, customer, shipping, deliveryMethod, notes } = req.body;

    const normalizedItems = normalizeIncomingItems(items);

    if (!normalizedItems.length) {
      return res.status(400).json({
        ok: false,
        code: 'EMPTY_CART',
        message: 'Votre panier est vide ou invalide.',
      });
    }

    const normalizedCustomer = {
      firstName: normalizeText(customer?.firstName || ''),
      lastName: normalizeText(customer?.lastName || ''),
      email: normalizeEmail(customer?.email || ''),
      phone: normalizeText(customer?.phone || ''),
    };

    const normalizedShipping = {
      address: normalizeText(shipping?.address || ''),
      city: normalizeText(shipping?.city || ''),
      zip: normalizeText(shipping?.zip || ''),
      country: normalizeText(shipping?.country || '') || 'France',
    };

    const normalizedDeliveryMethod = normalizeDeliveryMethod(deliveryMethod);

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

    if (!isValidEmail(normalizedCustomer.email)) {
      return res.status(400).json({
        ok: false,
        code: 'INVALID_CUSTOMER_EMAIL',
        message: "L'adresse e-mail renseignée est invalide.",
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

    let resolvedItems;
    try {
      resolvedItems = await resolveOrderItemsFromProducts(normalizedItems);
    } catch (stockError) {
      return res.status(400).json({
        ok: false,
        code: 'STOCK_ERROR',
        message:
          stockError?.message ||
          'Certains produits ne sont plus disponibles en quantité suffisante.',
      });
    }

    if (!resolvedItems.length) {
      return res.status(400).json({
        ok: false,
        code: 'INVALID_ITEMS',
        message:
          'Les produits du panier sont introuvables ou ne sont plus disponibles.',
      });
    }

    const subtotalAmount = resolvedItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    const parcelSize = getParcelSizeFromItems(resolvedItems);
    const shippingAmount = computeShippingAmount({
      subtotalAmount,
      deliveryMethod: normalizedDeliveryMethod,
      parcelSize,
    });

    const stripeSecretKey =
      process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET;

    const origin = buildOrigin(req);
    const cancelUrl = `${origin}/panier?checkout=cancel`;

    if (!stripeSecretKey) {
      const simulatedOrder = await Order.create(
        buildOrderPayload({
          userId: authenticatedUserId,
          customer: normalizedCustomer,
          resolvedItems,
          normalizedShipping,
          deliveryMethod: normalizedDeliveryMethod,
          parcelSize,
          shippingAmount,
          notes,
          status: 'pending',
          paymentStatus: 'paid',
          stripeSessionId: 'SIMULATED_SESSION',
          stripePaymentIntentId: 'SIMULATED_PAYMENT',
        })
      );

      const successUrl = `${origin}/commande/confirmation?orderId=${simulatedOrder._id}&session_id=SIMULATED_SESSION`;

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
        userId: authenticatedUserId,
        customer: normalizedCustomer,
        resolvedItems,
        normalizedShipping,
        deliveryMethod: normalizedDeliveryMethod,
        parcelSize,
        shippingAmount,
        notes,
        status: 'pending',
        paymentStatus: 'pending',
      })
    );

    try {
      const stripe = getStripeClient(stripeSecretKey);
      const lineItems = buildStripeLineItems(
        resolvedItems,
        shippingAmount,
        normalizedDeliveryMethod
      );
      const paymentMethodTypes = getEnabledPaymentMethodTypes();

      const successUrl = `${origin}/commande/confirmation?orderId=${pendingOrder._id}&session_id={CHECKOUT_SESSION_ID}`;

      const stripeSession = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: paymentMethodTypes,
        customer_email: normalizedCustomer.email,
        billing_address_collection: 'required',
        phone_number_collection: {
          enabled: true,
        },
        shipping_address_collection: {
          allowed_countries: ['FR'],
        },
        customer_creation: 'always',
        payment_intent_data: {
          receipt_email: normalizedCustomer.email,
          shipping: {
            name: `${normalizedCustomer.firstName} ${normalizedCustomer.lastName}`.trim(),
            phone: normalizedCustomer.phone,
            address: {
              line1: normalizedShipping.address,
              line2: '',
              postal_code: normalizedShipping.zip,
              city: normalizedShipping.city,
              country: 'FR',
            },
          },
        },
        line_items: lineItems,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          order_id: String(pendingOrder._id),
          user_id: authenticatedUserId ? String(authenticatedUserId) : '',
          customer_email: normalizedCustomer.email || '',
          customer_firstname: normalizedCustomer.firstName || '',
          customer_lastname: normalizedCustomer.lastName || '',
          customer_phone: normalizedCustomer.phone || '',
          shipping_address: normalizedShipping.address || '',
          shipping_city: normalizedShipping.city || '',
          shipping_zip: normalizedShipping.zip || '',
          shipping_country: normalizedShipping.country || '',
          delivery_method: normalizedDeliveryMethod,
          parcel_size: parcelSize,
          shipping_amount: String(shippingAmount),
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
      console.error('CHECKOUT_STRIPE_SESSION_ERROR', {
        orderId: String(pendingOrder._id),
        userId: authenticatedUserId ? String(authenticatedUserId) : null,
        errorType: stripeError?.type || null,
        errorCode: stripeError?.code || null,
        errorMessage: stripeError?.message || null,
        raw: stripeError,
      });

      try {
        await Order.deleteOne({ _id: pendingOrder._id });
      } catch (deleteError) {
        console.error('CHECKOUT_PENDING_ORDER_DELETE_ERROR', {
          orderId: String(pendingOrder._id),
          errorMessage: deleteError?.message || null,
          raw: deleteError,
        });
      }

      const stripeErrorResponse = getStripeErrorResponse(stripeError);

      return res.status(stripeErrorResponse.status).json({
        ok: false,
        code: stripeErrorResponse.code,
        message: stripeErrorResponse.message,
      });
    }
  } catch (error) {
    console.error('CHECKOUT_CREATE_SESSION_ERROR', {
      errorMessage: error?.message || null,
      stack: error?.stack || null,
      raw: error,
    });

    return res.status(500).json({
      ok: false,
      code: 'CHECKOUT_ERROR',
      message:
        'Une erreur est survenue lors de la préparation du paiement. Merci de réessayer plus tard.',
    });
  }
}