// pages/api/auth/delete-account.js

import bcrypt from 'bcryptjs';
import { connectMongo } from '../../../lib/mongodb';
import { getSessionFromRequest, clearSessionCookie } from '../../../lib/session';
import User from '../../../models/User';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({
      message: 'Méthode non autorisée.',
    });
  }

  try {
    await connectMongo();

    const session = getSessionFromRequest(req);

    if (!session?.userId) {
      return res.status(401).json({
        message: 'Utilisateur non authentifié.',
      });
    }

    const { password = '' } = req.body || {};
    const normalizedPassword = String(password);

    if (!normalizedPassword) {
      return res.status(400).json({
        message: 'Le mot de passe actuel est obligatoire.',
      });
    }

    const user = await User.findById(session.userId);

    if (!user) {
      clearSessionCookie(res);

      return res.status(404).json({
        message: 'Utilisateur introuvable.',
      });
    }

    const passwordMatches = await bcrypt.compare(
      normalizedPassword,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: 'Le mot de passe actuel est incorrect.',
      });
    }

    await User.findByIdAndDelete(user._id);

    clearSessionCookie(res);

    return res.status(200).json({
      message: 'Votre compte a bien été supprimé.',
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Une erreur est survenue lors de la suppression du compte.',
    });
  }
}