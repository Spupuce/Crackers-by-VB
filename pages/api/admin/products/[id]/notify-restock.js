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

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: 'Produit introuvable.' });
    }

    const productColors = Array.isArray(product.colors) ? product.colors : [];
    const hasColorVariants = productColors.some(
      (color) => color && normalizeColorName(color.name)
    );

    let targetColor = '';

    if (hasColorVariants) {
      if (!requestedColor) {
        return res.status(400).json({
          message: 'La couleur à notifier est obligatoire.',
          sentCount: 0,
          failedCount: 0,
        });
      }

      const matchingColor = productColors.find(
        (color) =>
          normalizeColorName(color?.name).toLowerCase() ===
          requestedColor.toLowerCase()
      );

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

      targetColor = normalizeColorName(matchingColor.name);
    } else {
      const productStock = getSafeStock(product?.stock);

      if (productStock <= 0) {
        return res.status(400).json({
          message: 'Le produit doit être de nouveau en stock avant notification.',
          sentCount: 0,
          failedCount: 0,
        });
      }
    }

    const pendingCount = await RestockRequest.countDocuments({
      product: product._id,
      color: targetColor,
      notifiedAt: null,
    });

    if (pendingCount === 0) {
      return res.status(200).json({
        message: hasColorVariants
          ? `Aucune demande en attente pour la couleur ${targetColor}.`
          : 'Aucune demande en attente pour ce produit.',
        sentCount: 0,
        failedCount: 0,
      });
    }

    const processingDate = new Date();
    const staleProcessingDate = new Date(Date.now() - 15 * 60 * 1000);

    const staleLockedRequests = await RestockRequest.find({
      product: product._id,
      color: targetColor,
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

    const lockResult = await RestockRequest.updateMany(
      {
        product: product._id,
        color: targetColor,
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
      return res.status(200).json({
        message: hasColorVariants
          ? 'Une notification est déjà en cours pour cette couleur.'
          : 'Une notification est déjà en cours pour ce produit.',
        sentCount: 0,
        failedCount: 0,
      });
    }

    const claimedRequests = await RestockRequest.find({
      product: product._id,
      color: targetColor,
      notifiedAt: null,
      notificationProcessingAt: processingDate,
    });

    if (claimedRequests.length === 0) {
      await RestockRequest.updateMany(
        {
          product: product._id,
          color: targetColor,
          notifiedAt: null,
          notificationProcessingAt: processingDate,
        },
        { $set: { notificationProcessingAt: null } }
      );

      return res.status(200).json({
        message: hasColorVariants
          ? 'Aucune demande à notifier après verrouillage pour cette couleur.'
          : 'Aucune demande à notifier après verrouillage pour ce produit.',
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
          subject: hasColorVariants
            ? `${product.name} (${targetColor}) est de nouveau disponible`
            : `${product.name} est de nouveau disponible`,
          text: buildMailText(product, targetColor),
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
        message: hasColorVariants
          ? `Aucune notification n'a pu être envoyée pour la couleur ${targetColor}.`
          : "Aucune notification n'a pu être envoyée pour ce produit.",
        sentCount: 0,
        failedCount,
      });
    }

    if (failedCount > 0) {
      return res.status(200).json({
        message: hasColorVariants
          ? `${sentCount} notification(s) acceptée(s) pour ${targetColor}, ${failedCount} en échec.`
          : `${sentCount} notification(s) acceptée(s) pour ce produit, ${failedCount} en échec.`,
        sentCount,
        failedCount,
      });
    }

    return res.status(200).json({
      message: hasColorVariants
        ? `${sentCount} notification(s) acceptée(s) pour ${targetColor}.`
        : `${sentCount} notification(s) acceptée(s) pour ce produit.`,
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