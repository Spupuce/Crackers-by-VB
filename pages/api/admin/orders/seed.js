// pages/api/admin/orders/seed.js

import dbConnect from '../../../../lib/mongodb';
import Order from '../../../../models/Order';
import Product from '../../../../models/Product';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Méthode non autorisée.' });
  }

  try {
    await dbConnect();

    const { userId } = req.body;

    if (!userId) {
      return res
        .status(400)
        .json({ ok: false, message: "userId est obligatoire pour générer des commandes." });
    }

    const products = await Product.find().limit(3).lean();

    if (!products || products.length === 0) {
      return res.status(400).json({
        ok: false,
        message: 'Aucun produit trouvé en base. Ajoute quelques produits avant de générer des commandes.',
      });
    }

    const sampleItems = products.map((product, index) => ({
      productId: product._id,
      name: product.name,
      slug: product.slug,
      quantity: index === 0 ? 1 : 2,
      unitPrice: product.price,
      imageUrl: product.imageUrls?.[0] || '',
    }));

    const now = new Date();

    const fakeOrders = [
      {
        userId,
        status: 'delivered',
        totalAmount: sampleItems.reduce(
          (sum, item) => sum + item.unitPrice * item.quantity,
          0
        ),
        currency: 'EUR',
        items: sampleItems,
        notes: 'Première commande de test pour le compte.',
        shippingAddress: {
          addressLine1: '12 rue des Lilas',
          addressLine2: '',
          postalCode: '75011',
          city: 'Paris',
          country: 'France',
        },
        createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6),
        updatedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3),
      },
      {
        userId,
        status: 'preparing',
        totalAmount: sampleItems[0].unitPrice * 1 + (sampleItems[1]?.unitPrice || 0),
        currency: 'EUR',
        items: sampleItems.slice(0, 2).map((item, index) => ({
          ...item,
          quantity: index === 0 ? 1 : 1,
        })),
        notes: 'Commande de test en préparation.',
        shippingAddress: {
          addressLine1: '4 impasse des Ateliers',
          addressLine2: 'Bâtiment B',
          postalCode: '44200',
          city: 'Nantes',
          country: 'France',
        },
        createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 20),
        updatedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
      },
      {
        userId,
        status: 'paid',
        totalAmount: sampleItems[0].unitPrice,
        currency: 'EUR',
        items: [
          {
            ...sampleItems[0],
            quantity: 1,
          },
        ],
        notes: 'Commande de test payée, en attente de préparation.',
        shippingAddress: {
          addressLine1: '8 avenue des Fleurs',
          addressLine2: '',
          postalCode: '13008',
          city: 'Marseille',
          country: 'France',
        },
        createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 40),
        updatedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 40),
      },
    ];

    await Order.insertMany(fakeOrders);

    return res.status(201).json({
      ok: true,
      count: fakeOrders.length,
      message: `${fakeOrders.length} commandes de test ont été créées pour cet utilisateur.`,
    });
  } catch (error) {
    console.error('Seed orders error:', error);
    return res.status(500).json({
      ok: false,
      message: "Impossible de créer les commandes de test.",
    });
  }
}