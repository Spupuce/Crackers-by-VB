// pages/api/admin/products/[id]/notify-restock.js

import { connectMongo } from '../../../../../lib/mongodb';
import Product from '../../../../../models/Product';
import RestockRequest from '../../../../../models/RestockRequest';
import nodemailer from 'nodemailer';

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    throw new Error('Configuration SMTP incomplète.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

function getProductUrl(product) {
  const baseUrl = process.env.SITE_BASE_URL || '';

  if (!product?.slug) {
    return baseUrl || '';
  }

  return baseUrl
    ? `${baseUrl}/boutique/${product.slug}`
    : `/boutique/${product.slug}`;
}

function buildMailText(product) {
  const shopName = process.env.MAIL_FROM_NAME || 'Crackers by VB';
  const productUrl = getProductUrl(product);

  return `Bonjour,

Le produit "${product.name}" est de nouveau disponible sur la boutique.

Vous pouvez le retrouver ici :
${productUrl}

Attention : cet e-mail vous informe uniquement du retour en stock. Il ne garantit pas la réservation du produit, qui peut redevenir indisponible entre-temps.

À bientôt,
${shopName}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée.' });
  }

  try {
    await connectMongo();

    const { id } = req.query;
    const mailFromAddress = process.env.MAIL_FROM_ADDRESS;
    const mailFromName = process.env.MAIL_FROM_NAME || 'Crackers by VB';

    if (!mailFromAddress) {
      throw new Error("MAIL_FROM_ADDRESS est manquant.");
    }

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
        sentCount: 0,
      });
    }

    const transporter = getTransporter();

    await Promise.all(
      requests.map((request) =>
        transporter.sendMail({
          from: `"${mailFromName}" <${mailFromAddress}>`,
          to: request.email,
          subject: `${product.name} est de nouveau disponible`,
          text: buildMailText(product),
        })
      )
    );

    const now = new Date();

    await RestockRequest.updateMany(
      {
        _id: { $in: requests.map((request) => request._id) },
      },
      {
        $set: { notifiedAt: now },
      }
    );

    return res.status(200).json({
      message: `${requests.length} notification(s) envoyée(s).`,
      sentCount: requests.length,
    });
  } catch (error) {
    console.error('NOTIFY_RESTOCK_ERROR:', error);

    return res.status(500).json({
      message: "Erreur lors de l'envoi des notifications.",
    });
  }
}