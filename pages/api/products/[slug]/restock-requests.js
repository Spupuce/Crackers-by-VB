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

      if (!isValidEmail(email)) {
        return res.status(400).json({
          message: 'Merci de renseigner une adresse e-mail valide.',
        });
      }

      const existingRequest = await RestockRequest.findOne({
        product: product._id,
        email,
        notifiedAt: null,
      });

      if (existingRequest) {
        return res.status(200).json({
          message: 'Une demande existe déjà pour cette adresse e-mail.',
          alreadyExists: true,
        });
      }

      await RestockRequest.create({
        product: product._id,
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