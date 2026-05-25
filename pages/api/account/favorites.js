// pages/api/account/favorites.js

import { connectMongo } from '../../../lib/mongodb';
import { getSessionFromRequest } from '../../../lib/session';
import User from '../../../models/User';

function sanitizeFavorites(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .filter((item) => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    ),
  ];
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({
      message: 'Méthode non autorisée.',
    });
  }

  try {
    const session = getSessionFromRequest(req);

    if (!session?.userId) {
      return res.status(401).json({
        message: 'Utilisateur non authentifié.',
      });
    }

    await connectMongo();

    if (req.method === 'GET') {
      const user = await User.findById(session.userId).select('favorites');

      if (!user) {
        return res.status(404).json({
          message: 'Utilisateur introuvable.',
        });
      }

      return res.status(200).json({
        favorites: sanitizeFavorites(user.favorites),
      });
    }

    const nextFavorites = sanitizeFavorites(req.body?.favorites);

    const user = await User.findByIdAndUpdate(
      session.userId,
      {
        favorites: nextFavorites,
      },
      {
        new: true,
        runValidators: true,
      }
    ).select('favorites');

    if (!user) {
      return res.status(404).json({
        message: 'Utilisateur introuvable.',
      });
    }

    return res.status(200).json({
      message: 'Favoris mis à jour avec succès.',
      favorites: sanitizeFavorites(user.favorites),
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Une erreur est survenue lors de la gestion des favoris.',
    });
  }
}