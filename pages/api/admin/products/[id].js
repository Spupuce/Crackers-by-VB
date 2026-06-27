// pages/api/admin/products/[id].js
import { connectMongo } from '../../../../lib/mongodb';
import Product from '../../../../models/Product';
import RestockRequest from '../../../../models/RestockRequest';
import { resolveProductStock } from '../../../../lib/services/stockService';
import { generateUniqueSlug } from '../../../../lib/services/slugService';

function normalizePromoPrice(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalizedValue = Number(value);

  if (Number.isNaN(normalizedValue)) {
    return Number.NaN;
  }

  return normalizedValue;
}

function validateProductPayload(payload) {
  const errors = [];
  const numericPrice = Number(payload.price);
  const normalizedPromoPrice = normalizePromoPrice(payload.promoPrice);

  if (!payload.name || !payload.name.trim()) {
    errors.push('Le nom du produit est obligatoire.');
  }

  if (!payload.category || !payload.category.trim()) {
    errors.push('La catégorie est obligatoire.');
  }

  if (
    payload.price === undefined ||
    payload.price === null ||
    Number.isNaN(numericPrice) ||
    numericPrice < 0
  ) {
    errors.push('Le prix du produit est invalide.');
  }

  if (Number.isNaN(normalizedPromoPrice)) {
    errors.push('Le prix promo est invalide.');
  }

  if (normalizedPromoPrice !== null && normalizedPromoPrice < 0) {
    errors.push('Le prix promo ne peut pas être négatif.');
  }

  if (
    normalizedPromoPrice !== null &&
    !Number.isNaN(numericPrice) &&
    normalizedPromoPrice >= numericPrice
  ) {
    errors.push('Le prix promo doit être inférieur au prix normal.');
  }

  if (!payload.imageUrl || !payload.imageUrl.trim()) {
    errors.push('L’image principale du produit est obligatoire.');
  }

  return {
    errors,
    promoPrice: normalizedPromoPrice,
  };
}

export default async function handler(req, res) {
  await connectMongo();

  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json({
          message: 'Produit introuvable.',
        });
      }

      const pendingRequestsCount = await RestockRequest.countDocuments({
        product: product._id,
        notifiedAt: null,
      });

      return res.status(200).json({
        ...product.toObject(),
        pendingRequestsCount,
      });
    } catch (error) {
      return res.status(500).json({
        message: 'Erreur lors de la récupération du produit.',
      });
    }
  }

  if (req.method === 'PUT') {
    try {
      const {
        name,
        category,
        price,
        promoPrice,
        description,
        imageUrl,
        stock,
        colors,
      } = req.body;

      const validationResult = validateProductPayload({
        name,
        category,
        price,
        promoPrice,
        imageUrl,
      });

      if (validationResult.errors.length > 0) {
        return res.status(400).json({
          message: 'Le formulaire produit contient des erreurs.',
          errors: validationResult.errors,
        });
      }

      const existingProduct = await Product.findById(id);

      if (!existingProduct) {
        return res.status(404).json({
          message: 'Produit introuvable.',
        });
      }

      const slug = await generateUniqueSlug({
        model: Product,
        value: name,
        currentId: id,
      });

      const stockData = resolveProductStock({
        stock,
        colors,
      });

      existingProduct.name = name.trim();
      existingProduct.slug = slug;
      existingProduct.category = category.trim();
      existingProduct.price = Number(price);
      existingProduct.promoPrice = validationResult.promoPrice;
      existingProduct.description = description?.trim() || '';
      existingProduct.imageUrl = imageUrl.trim();
      existingProduct.stock = stockData.stock;
      existingProduct.colors = stockData.colors;

      await existingProduct.save();

      return res.status(200).json(existingProduct);
    } catch (error) {
      return res.status(500).json({
        message: 'Erreur lors de la mise à jour du produit.',
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json({
          message: 'Produit introuvable.',
        });
      }

      if (!product.isArchived) {
        return res.status(403).json({
          message: 'Vous devez d’abord archiver le produit avant de le supprimer définitivement.',
        });
      }

      await Product.findByIdAndDelete(id);

      return res.status(204).end();
    } catch (error) {
      return res.status(500).json({
        message: 'Erreur lors de la suppression définitive du produit.',
      });
    }
  }

  return res.status(405).json({
    message: 'Méthode non autorisée.',
  });
}