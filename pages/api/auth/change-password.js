// pages/api/auth/change-password.js

import bcrypt from 'bcryptjs';
import { connectMongo } from '../../../lib/mongodb';
import { getSessionFromRequest } from '../../../lib/session';
import User from '../../../models/User';

const MIN_PASSWORD_LENGTH = 8;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
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

    const {
      currentPassword = '',
      newPassword = '',
      confirmPassword = '',
    } = req.body || {};

    const normalizedCurrentPassword = String(currentPassword);
    const normalizedNewPassword = String(newPassword);
    const normalizedConfirmPassword = String(confirmPassword);

    if (
      !normalizedCurrentPassword ||
      !normalizedNewPassword ||
      !normalizedConfirmPassword
    ) {
      return res.status(400).json({
        message: 'Tous les champs mot de passe sont obligatoires.',
      });
    }

    if (normalizedNewPassword.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        message: 'Le nouveau mot de passe doit contenir au moins 8 caractères.',
      });
    }

    if (normalizedNewPassword !== normalizedConfirmPassword) {
      return res.status(400).json({
        message: 'La confirmation du nouveau mot de passe ne correspond pas.',
      });
    }

    if (normalizedCurrentPassword === normalizedNewPassword) {
      return res.status(400).json({
        message: 'Le nouveau mot de passe doit être différent de l’ancien.',
      });
    }

    const user = await User.findById(session.userId);

    if (!user) {
      return res.status(404).json({
        message: 'Utilisateur introuvable.',
      });
    }

    const passwordMatches = await bcrypt.compare(
      normalizedCurrentPassword,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: 'Le mot de passe actuel est incorrect.',
      });
    }

    const nextPasswordHash = await bcrypt.hash(normalizedNewPassword, 10);

    user.passwordHash = nextPasswordHash;
    await user.save();

    return res.status(200).json({
      message: 'Mot de passe mis à jour avec succès.',
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Une erreur est survenue lors du changement de mot de passe.',
    });
  }
}