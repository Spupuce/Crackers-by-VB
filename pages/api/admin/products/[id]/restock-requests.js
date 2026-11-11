// pages/api/admin/products/[id]/restock-requests.js
import { connectMongo } from '../../../../../lib/mongodb';
import { requireAdminSession } from '../../../../../lib/session';
import Product from '../../../../../models/Product';
import RestockRequest from '../../../../../models/RestockRequest';

export default async function handler(req, res) {
  try {
    const adminSession = requireAdminSession(req);

    if (!adminSession) {
      return res.status(401).json({
        ok: false,
        message: 'Accès administrateur requis.',
      });
    }

    await connectMongo();
  } catch (error) {
    console.error('ADMIN_PRODUCT_RESTOCK_REQUESTS_ACCESS_ERROR', error);

    return res.status(500).json({
      ok: false,
      message: 'Impossible de traiter la demande administrateur.',
    });
  }

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