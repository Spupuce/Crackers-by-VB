// pages/api/admin/products/[id]/notify-restock.js

import { connectMongo } from '../../../../../lib/mongodb';
import Product from '../../../../../models/Product';
import RestockRequest from '../../../../../models/RestockRequest';
import nodemailer from 'nodemailer';

async function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export default async function handler(req, res) {
  await connectMongo();
  const { id } = req.query;

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée.' });
  }

  try {
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: 'Produit introuvable.' });
    }

    const requests = await RestockRequest.find({
      product: product._id,
      notifiedAt: null,
    });

    if (requests.length === 0) {
      return res.status(200).json({
        message: 'Aucune demande en attente pour ce produit.',
      });
    }

    const transporter = await createTransport();

    const sendPromises = requests.map((request) =>
      transporter.sendMail({
        from: `"${process.env.MAIL_FROM_NAME || 'Votre boutique'}" <${process.env.MAIL_FROM_ADDRESS}>`,
        to: request.email,
        subject: `${product.name} est de nouveau disponible`,
        text: `Bonjour,\n\nLe produit "${product.name}" est à nouveau disponible sur la boutique.\n\nVous pouvez le retrouver ici : ${process.env.SITE_BASE_URL}/boutique/${product.slug}\n\nÀ bientôt,\n${process.env.MAIL_FROM_NAME || 'La boutique'}`,
      })
    );

    await Promise.all(sendPromises);

    const now = new Date();

    await RestockRequest.updateMany(
      { _id: { $in: requests.map((r) => r._id) } },
      { $set: { notifiedAt: now } }
    );

    product.pendingRequestsCount = 0;
    await product.save();

    return res.status(200).json({
      message: `${requests.length} notification(s) envoyée(s).`,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Erreur lors de l’envoi des notifications.',
    });
  }
}