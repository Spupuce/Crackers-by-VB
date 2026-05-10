// pages/api/admin/products/[id]/archive.js
import { connectMongo } from '../../../../../lib/mongodb';
import Product from '../../../../../models/Product';

export default async function handler(req, res) {
  await connectMongo();

  const { id } = req.query;

  if (req.method === 'PATCH') {
    try {
      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json({
          message: 'Produit introuvable.',
        });
      }

      if (product.isArchived) {
        return res.status(200).json(product);
      }

      product.isArchived = true;
      product.archivedAt = new Date();

      await product.save();

      return res.status(200).json(product);
    } catch (error) {
      return res.status(500).json({
        message: 'Erreur lors de l’archivage du produit.',
      });
    }
  }

  return res.status(405).json({
    message: 'Méthode non autorisée.',
  });
}