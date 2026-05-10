// pages/api/admin/products/[id]/restock-requests.js

import { connectMongo } from '../../../../../lib/mongodb';
import Product from '../../../../../models/Product';
import RestockRequest from '../../../../../models/RestockRequest';

export default async function handler(req, res) {
  await connectMongo();
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json({ message: 'Produit introuvable.' });
      }

      const requests = await RestockRequest.find({
        product: product._id,
        notifiedAt: null,
      })
        .sort({ createdAt: 1 })
        .lean();

      return res.status(200).json(requests);
    } catch (error) {
      return res.status(500).json({
        message: 'Erreur lors de la récupération des demandes de réassort.',
      });
    }
  }

  return res.status(405).json({ message: 'Méthode non autorisée.' });
}