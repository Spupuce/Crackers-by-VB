// pages/api/admin/products/[id]/notify-restock.js
import { connectMongo } from '../../../../../lib/mongodb';
import Product from '../../../../../models/Product';
import RestockRequest from '../../../../../models/RestockRequest';
import nodemailer from 'nodemailer';

function normalizeColorName(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getSafeStock(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function getColorStock(color) {
  if (!color || typeof color !== 'object') {
    return 0;
  }

  if (color.stock !== undefined && color.stock !== null) {
    return getSafeStock(color.stock);
  }

  if (color.quantity !== undefined && color.quantity !== null) {
    return getSafeStock(color.quantity);
  }

  return 0;
}

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

function buildMailText(product, color) {
  const shopName = process.env.MAIL_FROM_NAME || 'Crackers by VB';
  const productUrl = getProductUrl(product);
  const normalizedColor = normalizeColorName(color);

  return `Bonjour,

Le produit "${product.name}"${
    normalizedColor ? ` en couleur "${normalizedColor}"` : ''
  } est de nouveau disponible sur la boutique.

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
    const requestedColor = normalizeColorName(req.body?.color);
    const mailFromAddress = process.env.MAIL_FROM_ADDRESS;
    const mailFromName = process.env.MAIL_FROM_NAME || 'Crackers by VB';

    if (!mailFromAddress) {
      throw new Error('MAIL_FROM_ADDRESS est manquant.');
    }

    if (!requestedColor) {
      return res.status(400).json({
        message: 'La couleur à notifier est obligatoire.',
        sentCount: 0,
        failedCount: 0,
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: 'Produit introuvable.' });
    }

    const matchingColor = Array.isArray(product.colors)
      ? product.colors.find(
          (color) =>
            normalizeColorName(color?.name).toLowerCase() ===
            requestedColor.toLowerCase()
        )
      : null;

    if (!matchingColor) {
      return res.status(400).json({
        message: 'Couleur introuvable pour ce produit.',
        sentCount: 0,
        failedCount: 0,
      });
    }

    const colorStock = getColorStock(matchingColor);

    if (colorStock <= 0) {
      return res.status(400).json({
        message: 'La couleur doit être de nouveau en stock avant notification.',
        sentCount: 0,
        failedCount: 0,
      });
    }

    // 1) Vérifier s’il y a au moins une demande en attente (rapide)
    const pendingCount = await RestockRequest.countDocuments({
      product: product._id,
      color: requestedColor,
      notifiedAt: null,
    });

    if (pendingCount === 0) {
      return res.status(200).json({
        message: `Aucune demande en attente pour la couleur ${requestedColor}.`,
        sentCount: 0,
        failedCount: 0,
      });
    }

    const processingDate = new Date();
    const staleProcessingDate = new Date(Date.now() - 15 * 60 * 1000);

    // 2) Libérer les verrous trop anciens
    const staleLockedRequests = await RestockRequest.find({
      product: product._id,
      color: requestedColor,
      notifiedAt: null,
      notificationProcessingAt: { $lt: staleProcessingDate },
    }).select('_id');

    if (staleLockedRequests.length > 0) {
      await RestockRequest.updateMany(
        {
          _id: { $in: staleLockedRequests.map((request) => request._id) },
        },
        {
          $set: { notificationProcessingAt: null },
        }
      );
    }

    // 3) Verrouillage atomique des demandes éligibles
    const lockResult = await RestockRequest.updateMany(
      {
        product: product._id,
        color: requestedColor,
        notifiedAt: null,
        $or: [
          { notificationProcessingAt: null },
          { notificationProcessingAt: { $exists: false } },
        ],
      },
      {
        $set: { notificationProcessingAt: processingDate },
      }
    );

    const claimedCount = lockResult.modifiedCount || 0;

    if (claimedCount === 0) {
      // Soit rien à traiter, soit un autre appel a déjà pris la main
      return res.status(200).json({
        message: 'Une notification est déjà en cours pour cette couleur.',
        sentCount: 0,
        failedCount: 0,
      });
    }

    // 4) Récupérer précisément les demandes claimées dans cette exécution
    const claimedRequests = await RestockRequest.find({
      product: product._id,
      color: requestedColor,
      notifiedAt: null,
      notificationProcessingAt: processingDate,
    });

    if (claimedRequests.length === 0) {
      // Cas très improbable, mais on nettoie au cas où
      await RestockRequest.updateMany(
        {
          product: product._id,
          color: requestedColor,
          notifiedAt: null,
          notificationProcessingAt: processingDate,
        },
        { $set: { notificationProcessingAt: null } }
      );

      return res.status(200).json({
        message: 'Aucune demande à notifier après verrouillage.',
        sentCount: 0,
        failedCount: 0,
      });
    }

    const transporter = getTransporter();
    await transporter.verify();

    const sentRequestIds = [];
    const failedRequestIds = [];
    const failedEmails = [];

    for (const request of claimedRequests) {
      try {
        const info = await transporter.sendMail({
          from: `"${mailFromName}" <${mailFromAddress}>`,
          to: request.email,
          subject: `${product.name} (${requestedColor}) est de nouveau disponible`,
          text: buildMailText(product, requestedColor),
        });

        if (isAcceptedResult(info, request.email)) {
          sentRequestIds.push(request._id);
        } else {
          failedRequestIds.push(request._id);
          failedEmails.push(request.email);
        }
      } catch (error) {
        failedRequestIds.push(request._id);
        failedEmails.push(request.email);
      }
    }

    if (sentRequestIds.length > 0) {
      await RestockRequest.updateMany(
        {
          _id: { $in: sentRequestIds },
        },
        {
          $set: {
            notifiedAt: new Date(),
            notificationProcessingAt: null,
          },
        }
      );
    }

    if (failedRequestIds.length > 0) {
      await RestockRequest.updateMany(
        {
          _id: { $in: failedRequestIds },
        },
        {
          $set: { notificationProcessingAt: null },
        }
      );
    }

    const failedCount = failedEmails.length;
    const sentCount = sentRequestIds.length;

    if (sentCount === 0) {
      return res.status(500).json({
        message: `Aucune notification n'a pu être envoyée pour la couleur ${requestedColor}.`,
        sentCount: 0,
        failedCount,
      });
    }

    if (failedCount > 0) {
      return res.status(200).json({
        message: `${sentCount} notification(s) acceptée(s) pour ${requestedColor}, ${failedCount} en échec.`,
        sentCount,
        failedCount,
      });
    }

    return res.status(200).json({
      message: `${sentCount} notification(s) acceptée(s) pour ${requestedColor}.`,
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