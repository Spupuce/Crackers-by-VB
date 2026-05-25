// pages/api/products/[slug]/restock-requests.js

import { connectMongo } from '../../../../lib/mongodb';
import Product from '../../../../models/Product';
import RestockRequest from '../../../../models/RestockRequest';

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée.' });
  }

  try {
    await connectMongo();

    const { slug } = req.query;
    const email =
      typeof req.body?.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : '';

    if (!slug) {
      return res.status(400).json({ message: 'Slug produit manquant.' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Adresse e-mail invalide.' });
    }

    const product = await Product.findOne({
      slug,
      isArchived: false,
    });

    if (!product) {
      return res.status(404).json({ message: 'Produit introuvable.' });
    }

    const existingRequest = await RestockRequest.findOne({
      product: product._id,
      email,
      notifiedAt: null,
    });

    if (existingRequest) {
      return res.status(200).json({
        message: 'Une demande existe déjà pour cette adresse e-mail.',
        alreadyExists: true,
      });
    }

    const request = await RestockRequest.create({
      product: product._id,
      email,
    });

    return res.status(201).json({
      message: 'Demande de réassort enregistrée.',
      requestId: request._id,
      alreadyExists: false,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(200).json({
        message: 'Une demande existe déjà pour cette adresse e-mail.',
        alreadyExists: true,
      });
    }

    console.error('POST /api/products/[slug]/restock-requests error:', error);

    return res.status(500).json({
      message: "Erreur lors de l'enregistrement de la demande de réassort.",
    });
  }
}