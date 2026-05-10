/* pages/api/products/index.js */

import { connectMongo } from '../../../lib/mongodb';
import Product from '../../../models/Product';

export default async function handler(req, res) {
  await connectMongo();

  if (req.method === 'GET') {
    try {
      const products = await Product.find({ isArchived: false }).sort({ createdAt: -1 });

      return res.status(200).json(products);
    } catch (error) {
      return res.status(500).json({
        message: 'Erreur lors de la récupération des produits.',
      });
    }
  }

  return res.status(405).json({
    message: 'Méthode non autorisée.',
  });
}