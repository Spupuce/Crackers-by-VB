// pages/api/cart/index.js

import { connectMongo } from '../../../lib/mongodb';
import { getSessionFromRequest } from '../../../lib/session';
import User from '../../../models/User';
import Product from '../../../models/Product';

function normalizeColorName(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function sanitizeIncomingCartItems(input) {
  if (!Array.isArray(input)) return [];

  return input.reduce((accumulator, item) => {
    if (!item || typeof item !== 'object') {
      return accumulator;
    }

    const slug =
      typeof item.slug === 'string' && item.slug.trim() ? item.slug.trim() : '';
    const color = normalizeColorName(item.color);
    const quantity = Number(item.quantity);

    if (!slug || Number.isNaN(quantity) || quantity <= 0) {
      return accumulator;
    }

    accumulator.push({
      slug,
      color,
      quantity: Math.max(1, Math.floor(quantity)),
    });

    return accumulator;
  }, []);
}

async function buildResolvedCartForUser(userId) {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error('Utilisateur introuvable.');
  }

  const sanitizedCart = Array.isArray(user.cart) ? user.cart : [];

  if (!sanitizedCart.length) {
    return {
      user,
      items: [],
    };
  }

  const slugs = sanitizedCart
    .map((item) => (item && typeof item.slug === 'string' ? item.slug.trim() : ''))
    .filter(Boolean);

  if (!slugs.length) {
    return {
      user,
      items: [],
    };
  }

  const products = await Product.find({
    slug: { $in: slugs },
    isArchived: false,
  });

  const productMap = new Map(products.map((product) => [product.slug, product]));
  const resolvedItems = [];

  for (const cartItem of sanitizedCart) {
    const slug = cartItem?.slug;
    const color = normalizeColorName(cartItem?.color);
    const quantity = Number(cartItem?.quantity) || 0;

    if (!slug || quantity <= 0) {
      continue;
    }

    const product = productMap.get(slug);

    if (!product) {
      continue;
    }

    const plainProduct = product.toObject();
    const hasColorVariants = Array.isArray(plainProduct.colors) && plainProduct.colors.length > 0;

    let resolvedStock = null;
    let resolvedImageUrl = plainProduct.imageUrl || '';
    let resolvedColor = color;

    if (hasColorVariants) {
      const matchingColor =
        plainProduct.colors.find(
          (variant) => normalizeColorName(variant?.name) === color
        ) || null;

      if (!matchingColor) {
        continue;
      }

      resolvedStock =
        typeof matchingColor.quantity === 'number' && matchingColor.quantity >= 0
          ? matchingColor.quantity
          : 0;

      resolvedImageUrl = matchingColor.imageUrl || plainProduct.imageUrl || '';
      resolvedColor = normalizeColorName(matchingColor.name);
    } else {
      resolvedStock =
        typeof plainProduct.stock === 'number' && plainProduct.stock >= 0
          ? plainProduct.stock
          : null;
      resolvedColor = '';
    }

    const safeQuantity =
      resolvedStock === null ? quantity : Math.min(quantity, resolvedStock);

    if (safeQuantity <= 0) {
      continue;
    }

    resolvedItems.push({
      slug: plainProduct.slug,
      name: plainProduct.name,
      price: plainProduct.price,
      stock: resolvedStock,
      quantity: safeQuantity,
      imageUrl: resolvedImageUrl,
      category: plainProduct.category || '',
      color: resolvedColor,
      cartItemKey: `${plainProduct.slug}::${resolvedColor || 'default'}`,
    });
  }

  return {
    user,
    items: resolvedItems,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'PUT') {
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

    if (req.method === 'GET') {
      try {
        const { user, items } = await buildResolvedCartForUser(session.userId);

        return res.status(200).json({
          items,
          rawCart: Array.isArray(user.cart)
            ? user.cart.map((cartItem) => ({
                slug: cartItem?.slug || '',
                color: normalizeColorName(cartItem?.color),
                quantity: Number(cartItem?.quantity) || 0,
                addedAt: cartItem?.addedAt || null,
              }))
            : [],
        });
      } catch (error) {
        return res.status(500).json({
          message: "Erreur lors de la récupération du panier de l'utilisateur.",
        });
      }
    }

    const { items: incomingItems = [] } = req.body || {};
    const sanitizedItems = sanitizeIncomingCartItems(incomingItems);
    const user = await User.findById(session.userId);

    if (!user) {
      return res.status(404).json({
        message: 'Utilisateur introuvable.',
      });
    }

    user.cart =
      sanitizedItems.length > 0
        ? sanitizedItems.map((item) => ({
            slug: item.slug,
            color: item.color,
            quantity: item.quantity,
            addedAt: new Date(),
          }))
        : [];

    await user.save();

    try {
      const { items: resolvedItems } = await buildResolvedCartForUser(
        session.userId
      );

      return res.status(200).json({
        message: 'Panier mis à jour avec succès.',
        items: resolvedItems,
      });
    } catch (error) {
      return res.status(200).json({
        message:
          'Panier mis à jour, mais une erreur est survenue lors de sa résolution.',
        items: [],
      });
    }
  } catch (error) {
    return res.status(500).json({
      message: 'Une erreur est survenue lors de la gestion du panier.',
    });
  }
}