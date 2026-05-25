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
    logger: true,
    debug: true,
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

function isAcceptedResult(info, email) {
  if (!info) {
    return false;
  }

  const accepted = Array.isArray(info.accepted) ? info.accepted : [];
  const rejected = Array.isArray(info.rejected) ? info.rejected : [];

  if (rejected.includes(email)) {
    return false;
  }

  return accepted.includes(email);
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
      throw new Error('MAIL_FROM_ADDRESS est manquant.');
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
        failedCount: 0,
      });
    }

    const transporter = getTransporter();
    await transporter.verify();

    const sentRequestIds = [];
    const failedEmails = [];

    for (const request of requests) {
      try {
        const info = await transporter.sendMail({
          from: `"${mailFromName}" <${mailFromAddress}>`,
          to: request.email,
          subject: `${product.name} est de nouveau disponible`,
          text: buildMailText(product),
        });

        console.log('RESTOCK_MAIL_RESULT:', {
          productId: String(product._id),
          requestId: String(request._id),
          email: request.email,
          messageId: info?.messageId || null,
          accepted: info?.accepted || [],
          rejected: info?.rejected || [],
          response: info?.response || null,
        });

        if (isAcceptedResult(info, request.email)) {
          sentRequestIds.push(request._id);
        } else {
          failedEmails.push(request.email);
          console.error('RESTOCK_MAIL_NOT_ACCEPTED:', {
            productId: String(product._id),
            requestId: String(request._id),
            email: request.email,
            messageId: info?.messageId || null,
            accepted: info?.accepted || [],
            rejected: info?.rejected || [],
            response: info?.response || null,
          });
        }
      } catch (error) {
        failedEmails.push(request.email);
        console.error('RESTOCK_MAIL_SEND_ERROR:', {
          productId: String(product._id),
          requestId: String(request._id),
          email: request.email,
          error: error?.message || error,
          code: error?.code || null,
          command: error?.command || null,
          response: error?.response || null,
          responseCode: error?.responseCode || null,
        });
      }
    }

    if (sentRequestIds.length > 0) {
      await RestockRequest.updateMany(
        {
          _id: { $in: sentRequestIds },
        },
        {
          $set: { notifiedAt: new Date() },
        }
      );
    }

    const failedCount = failedEmails.length;
    const sentCount = sentRequestIds.length;

    if (sentCount === 0) {
      return res.status(500).json({
        message: "Aucune notification n'a pu être envoyée.",
        sentCount: 0,
        failedCount,
      });
    }

    if (failedCount > 0) {
      return res.status(200).json({
        message: `${sentCount} notification(s) acceptée(s), ${failedCount} en échec.`,
        sentCount,
        failedCount,
      });
    }

    return res.status(200).json({
      message: `${sentCount} notification(s) acceptée(s).`,
      sentCount,
      failedCount: 0,
    });
  } catch (error) {
    console.error('NOTIFY_RESTOCK_ERROR:', {
      message: error?.message || error,
      code: error?.code || null,
      command: error?.command || null,
      response: error?.response || null,
      responseCode: error?.responseCode || null,
    });

    return res.status(500).json({
      message: "Erreur lors de l'envoi des notifications.",
      sentCount: 0,
      failedCount: 0,
    });
  }
}