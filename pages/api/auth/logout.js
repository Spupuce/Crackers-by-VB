// pages/api/auth/logout.js

import { clearSessionCookie } from '../../../lib/session';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      message: 'Méthode non autorisée.',
    });
  }

  try {
    clearSessionCookie(res);

    return res.status(200).json({
      message: 'Déconnexion réussie.',
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Une erreur est survenue lors de la déconnexion.',
    });
  }
}