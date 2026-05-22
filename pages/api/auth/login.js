// pages/api/auth/login.js

import bcrypt from 'bcryptjs';
import { connectMongo } from '../../../lib/mongodb';
import { setSessionCookie } from '../../../lib/session';
import User from '../../../models/User';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      message: 'Méthode non autorisée.',
    });
  }

  try {
    await connectMongo();

    const { email = '', password = '' } = req.body || {};

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPassword = String(password);

    if (!normalizedEmail || !normalizedPassword) {
      return res.status(400).json({
        message: 'Email et mot de passe sont obligatoires.',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        message: 'Adresse e-mail invalide.',
      });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        message: 'Identifiants invalides.',
      });
    }

    const passwordMatches = await bcrypt.compare(
      normalizedPassword,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: 'Identifiants invalides.',
      });
    }

    const userRole = user.role === 'admin' ? 'admin' : 'customer';

    setSessionCookie(res, {
      userId: String(user._id),
      role: userRole,
    });

    return res.status(200).json({
      message: 'Connexion réussie.',
      user: {
        id: String(user._id),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || '',
        addressLine1: user.addressLine1 || '',
        addressLine2: user.addressLine2 || '',
        postalCode: user.postalCode || '',
        city: user.city || '',
        country: user.country || 'France',
        role: userRole,
      },
    });
  } catch (error) {
    console.error('LOGIN API ERROR:', error);

    return res.status(500).json({
      message:
        process.env.NODE_ENV === 'development'
          ? error?.message || 'Erreur inconnue lors de la connexion.'
          : 'Une erreur est survenue lors de la connexion.',
    });
  }
}