// pages/api/admin/orders/seed.js


import { connectMongo } from '../../../../lib/mongodb';
import Order from '../../../../models/Order';
import Product from '../../../../models/Product';


function getSafeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}


function getProductImage(product) {
  if (typeof product?.imageUrl === 'string' && product.imageUrl.trim()) {
    return product.imageUrl.trim();
  }


  if (Array.isArray(product?.imageUrls) && typeof product.imageUrls[0] === 'string') {
    return product.imageUrls[0].trim();
  }


  return '';
}


function buildCustomer(index) {
  const customers = [
    {
      firstName: 'Camille',
      lastName: 'Martin',
      email: 'camille.martin@example.com',
      phone: '0612345678',
    },
    {
      firstName: 'Julie',
      lastName: 'Bernard',
      email: 'julie.bernard@example.com',
      phone: '0687654321',
    },
    {
      firstName: 'Sophie',
      lastName: 'Durand',
      email: 'sophie.durand@example.com',
      phone: '0677889900',
    },
  ];


  return customers[index] || customers[0];
}


function buildItems(products, quantitiesByIndex) {
  return products.map((product, index) => ({
    productId: product._id,
    name: product.name || '',
    slug: product.slug || '',
    color: '',
    quantity: quantitiesByIndex[index] || 1,
    unitPrice: getSafeNumber(product.price),
    imageUrl: getProductImage(product),
  }));
}


function computeSubtotal(items) {
  return items.reduce(
    (sum, item) => sum + getSafeNumber(item.unitPrice) * getSafeNumber(item.quantity),
    0
  );
}


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      message: 'Méthode non autorisée.',
    });
  }


  try {
    await connectMongo();


    const { userId } = req.body || {};


    if (!userId) {
      return res.status(400).json({
        ok: false,
        message: "userId est obligatoire pour générer des commandes.",
      });
    }


    const products = await Product.find({}).limit(3).lean();


    if (!products || products.length === 0) {
      return res.status(400).json({
        ok: false,
        message:
          'Aucun produit trouvé en base. Ajoute quelques produits avant de générer des commandes.',
      });
    }


    const now = new Date();


    const deliveredItems = buildItems(products, [1, 2, 2]);
    const deliveredSubtotal = computeSubtotal(deliveredItems);
    const deliveredShippingAmount = 0;


    const preparingItems = buildItems(products.slice(0, 2), [1, 1]);
    const preparingSubtotal = computeSubtotal(preparingItems);
    const preparingShippingAmount = 4.9;


    const secondPreparingItems = buildItems(products.slice(0, 1), [1]);
    const secondPreparingSubtotal = computeSubtotal(secondPreparingItems);
    const secondPreparingShippingAmount = 7.9;


    const fakeOrders = [
      {
        userId,
        isUserDeleted: false,
        anonymizedAt: null,
        orderNumber: '',
        status: 'delivered',
        paymentStatus: 'paid',
        customer: buildCustomer(0),
        subtotalAmount: deliveredSubtotal,
        shippingAmount: deliveredShippingAmount,
        totalAmount: deliveredSubtotal + deliveredShippingAmount,
        currency: 'EUR',
        items: deliveredItems,
        notes: 'Première commande de test pour le compte.',
        stripeSessionId: 'SIMULATED_SESSION',
        stripePaymentIntentId: 'SIMULATED_PAYMENT',
        shippingAddress: {
          addressLine1: '12 rue des Lilas',
          addressLine2: '',
          postalCode: '75011',
          city: 'Paris',
          country: 'France',
        },
        shipping: {
          method: 'relay',
          parcelSize: 'medium',
          carrier: 'colissimo',
          trackingNumber: 'XR123456789FR',
          trackingUrl: 'https://www.laposte.fr/outils/suivre-vos-envois?code=XR123456789FR',
          shippedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5),
          deliveredAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3),
        },
        createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6),
        updatedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3),
      },
      {
        userId,
        isUserDeleted: false,
        anonymizedAt: null,
        orderNumber: '',
        status: 'preparing',
        paymentStatus: 'paid',
        customer: buildCustomer(1),
        subtotalAmount: preparingSubtotal,
        shippingAmount: preparingShippingAmount,
        totalAmount: preparingSubtotal + preparingShippingAmount,
        currency: 'EUR',
        items: preparingItems,
        notes: 'Commande de test en préparation.',
        stripeSessionId: 'SIMULATED_SESSION',
        stripePaymentIntentId: 'SIMULATED_PAYMENT',
        shippingAddress: {
          addressLine1: '4 impasse des Ateliers',
          addressLine2: 'Bâtiment B',
          postalCode: '44200',
          city: 'Nantes',
          country: 'France',
        },
        shipping: {
          method: 'relay',
          parcelSize: 'small',
          carrier: '',
          trackingNumber: '',
          trackingUrl: '',
          shippedAt: null,
          deliveredAt: null,
        },
        createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 20),
        updatedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
      },
      {
        userId,
        isUserDeleted: false,
        anonymizedAt: null,
        orderNumber: '',
        status: 'preparing',
        paymentStatus: 'paid',
        customer: buildCustomer(2),
        subtotalAmount: secondPreparingSubtotal,
        shippingAmount: secondPreparingShippingAmount,
        totalAmount: secondPreparingSubtotal + secondPreparingShippingAmount,
        currency: 'EUR',
        items: secondPreparingItems,
        notes: 'Commande de test payée, en préparation.',
        stripeSessionId: 'SIMULATED_SESSION',
        stripePaymentIntentId: 'SIMULATED_PAYMENT',
        shippingAddress: {
          addressLine1: '8 avenue des Fleurs',
          addressLine2: '',
          postalCode: '13008',
          city: 'Marseille',
          country: 'France',
        },
        shipping: {
          method: 'home',
          parcelSize: 'small',
          carrier: '',
          trackingNumber: '',
          trackingUrl: '',
          shippedAt: null,
          deliveredAt: null,
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
      message: 'Impossible de créer les commandes de test.',
    });
  }
}