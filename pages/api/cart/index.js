// pages/api/cart/index.js

import { connectMongo } from '../../../lib/mongodb';
import { getSessionFromRequest } from '../../../lib/session';
import User from '../../../models/User';
import Product from '../../../models/Product';

function sanitizeIncomingCartItems(input) {
if (!Array.isArray(input)) return [];

return input.reduce((accumulator, item) => {
if (!item || typeof item !== 'object') {
return accumulator;
}

const slug =
typeof item.slug === 'string' && item.slug.trim() ? item.slug.trim() : '';
const quantity = Number(item.quantity);

if (!slug || Number.isNaN(quantity) || quantity <= 0) {
return accumulator;
}

accumulator.push({
slug,
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
const quantity = Number(cartItem?.quantity) || 0;

if (!slug || quantity <= 0) {
// élément invalide, on le laissera nettoyé lors d’une prochaine sauvegarde
continue;
}

const product = productMap.get(slug);

if (!product) {
// produit introuvable ou archivé → on ne l’expose plus dans le panier
continue;
}

const plainProduct = product.toObject();

const baseStock =
typeof plainProduct.stock === 'number' && plainProduct.stock >= 0
? plainProduct.stock
: null;

const safeQuantity =
baseStock === null ? quantity : Math.min(quantity, baseStock);

if (safeQuantity <= 0) {
continue;
}

resolvedItems.push({
slug: plainProduct.slug,
name: plainProduct.name,
price: plainProduct.price,
stock: baseStock,
quantity: safeQuantity,
imageUrl: plainProduct.imageUrl || '',
category: plainProduct.category || '',
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

// PUT : mise à jour du panier utilisateur
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
message: 'Panier mis à jour, mais une erreur est survenue lors de sa résolution.',
items: [],
});
}
} catch (error) {
return res.status(500).json({
message: 'Une erreur est survenue lors de la gestion du panier.',
});
} }