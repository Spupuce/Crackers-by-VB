// pages/api/products/[slug]/restock-requests.js
import { connectMongo } from '../../../../lib/mongodb';
import Product from '../../../../models/Product';
import RestockRequest from '../../../../models/RestockRequest';

function isValidEmail(value) {
  if (typeof value !== 'string') {
    return false;
  }

  const email = value.trim().toLowerCase();

  if (!email) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeColor(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

export default async function handler(req, res) {
  await connectMongo();

  const { slug } = req.query;

  if (req.method === 'POST') {
    try {
      const product = await Product.findOne({
        slug,
        isArchived: false,
      });

      if (!product) {
        return res.status(404).json({
          message: 'Produit introuvable.',
        });
      }

      const email = req.body?.email?.trim().toLowerCase();
      const color = normalizeColor(req.body?.color);

      if (!isValidEmail(email)) {
        return res.status(400).json({
          message: 'Merci de renseigner une adresse e-mail valide.',
        });
      }

      if (!color) {
        return res.status(400).json({
          message: 'Merci de sélectionner une couleur.',
        });
      }

      const productColors = Array.isArray(product.colors) ? product.colors : [];
      const matchingColor = productColors.find(
        (entry) => typeof entry?.name === 'string' && entry.name.trim() === color
      );

      if (!matchingColor) {
        return res.status(400).json({
          message: 'Couleur invalide pour ce produit.',
        });
      }

      const existingRequest = await RestockRequest.findOne({
        product: product._id,
        color,
        email,
        notifiedAt: null,
      });

      if (existingRequest) {
        return res.status(200).json({
          message: 'Une demande existe déjà pour cette couleur et cette adresse e-mail.',
          alreadyExists: true,
        });
      }

      await RestockRequest.create({
        product: product._id,
        color,
        email,
      });

      return res.status(201).json({
        message: 'Votre demande a bien été enregistrée.',
        alreadyExists: false,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Erreur lors de l'enregistrement de la demande.",
      });
    }
  }

  return res.status(405).json({
    message: 'Méthode non autorisée.',
  });
}