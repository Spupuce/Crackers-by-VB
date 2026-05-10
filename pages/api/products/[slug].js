/* pages/api/products/[slug].js */

import { connectMongo } from '../../../lib/mongodb';
import Product from '../../../models/Product';

export default async function handler(req, res) {
  await connectMongo();

  const { slug } = req.query;

  if (req.method === 'GET') {
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

      return res.status(200).json(product);
    } catch (error) {
      return res.status(500).json({
        message: 'Erreur lors de la récupération du produit.',
      });
    }
  }

  return res.status(405).json({
    message: 'Méthode non autorisée.',
  });
}