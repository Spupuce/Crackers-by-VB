// pages/api/admin/products/index.js

import { connectMongo } from '../../../../lib/mongodb';
import Product from '../../../../models/Product';
import RestockRequest from '../../../../models/RestockRequest';
import { resolveProductStock } from '../../../../lib/services/stockService';
import { generateUniqueSlug } from '../../../../lib/services/slugService';

function buildStatusFilter(status) {
  switch (status) {
    case 'active':
      return { isArchived: false };
    case 'archived':
      return { isArchived: true };
    case 'all':
    default:
      return {};
  }
}

function validateProductPayload(payload) {
  const errors = [];

  if (!payload.name || !payload.name.trim()) {
    errors.push('Le nom du produit est obligatoire.');
  }

  if (!payload.category || !payload.category.trim()) {
    errors.push('La catégorie est obligatoire.');
  }

  if (
    payload.price === undefined ||
    payload.price === null ||
    Number(payload.price) < 0
  ) {
    errors.push('Le prix du produit est invalide.');
  }

  if (!payload.imageUrl || !payload.imageUrl.trim()) {
    errors.push('L’image principale du produit est obligatoire.');
  }

  return errors;
}

export default async function handler(req, res) {
  await connectMongo();

  if (req.method === 'GET') {
    try {
      const { status = 'active' } = req.query;
      const allowedStatuses = ['active', 'archived', 'all'];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: 'Le paramètre status doit être égal à active, archived ou all.',
        });
      }

      const filter = buildStatusFilter(status);

      const products = await Product.find(filter).sort({ createdAt: -1 });

      const pendingRequests = await RestockRequest.aggregate([
        {
          $match: {
            notifiedAt: null,
          },
        },
        {
          $group: {
            _id: '$product',
            count: { $sum: 1 },
          },
        },
      ]);

      const pendingRequestsMap = new Map(
        pendingRequests.map((item) => [String(item._id), item.count])
      );

      const enrichedProducts = products.map((product) => {
        const plainProduct = product.toObject();

        return {
          ...plainProduct,
          pendingRequestsCount:
            pendingRequestsMap.get(String(product._id)) || 0,
        };
      });

      return res.status(200).json(enrichedProducts);
    } catch (error) {
      return res.status(500).json({
        message: 'Erreur lors de la récupération des produits admin.',
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        name,
        category,
        price,
        description,
        imageUrl,
        stock,
        colors,
      } = req.body;

      const validationErrors = validateProductPayload({
        name,
        category,
        price,
        imageUrl,
      });

      if (validationErrors.length > 0) {
        return res.status(400).json({
          message: 'Le formulaire produit contient des erreurs.',
          errors: validationErrors,
        });
      }

      const slug = await generateUniqueSlug({
        model: Product,
        value: name,
      });

      const stockData = resolveProductStock({
        stock,
        colors,
      });

      const product = await Product.create({
        name: name.trim(),
        slug,
        category: category.trim(),
        price: Number(price),
        description: description?.trim() || '',
        imageUrl: imageUrl.trim(),
        stock: stockData.stock,
        colors: stockData.colors,
        isArchived: false,
        archivedAt: null,
        pendingRequestsCount: 0,
      });

      return res.status(201).json(product);
    } catch (error) {
      return res.status(500).json({
        message: 'Erreur lors de la création du produit.',
      });
    }
  }

  return res.status(405).json({
    message: 'Méthode non autorisée.',
  });
}