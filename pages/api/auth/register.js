// pages/api/auth/register.js

import bcrypt from 'bcryptjs';
import { connectMongo } from '../../../lib/mongodb';
import User from '../../../models/User';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      message: 'Méthode non autorisée.',
    });
  }

  try {
    await connectMongo();

    const {
      firstName = '',
      lastName = '',
      email = '',
      password = '',
      confirmPassword = '',
    } = req.body || {};

    const normalizedFirstName = String(firstName).trim();
    const normalizedLastName = String(lastName).trim();
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPassword = String(password);
    const normalizedConfirmPassword = String(confirmPassword);

    if (
      !normalizedFirstName ||
      !normalizedLastName ||
      !normalizedEmail ||
      !normalizedPassword ||
      !normalizedConfirmPassword
    ) {
      return res.status(400).json({
        message: 'Tous les champs sont obligatoires.',
      });
    }

    if (normalizedFirstName.length < 2) {
      return res.status(400).json({
        message: 'Le prénom doit contenir au moins 2 caractères.',
      });
    }

    if (normalizedLastName.length < 2) {
      return res.status(400).json({
        message: 'Le nom doit contenir au moins 2 caractères.',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        message: 'Adresse e-mail invalide.',
      });
    }

    if (normalizedPassword.length < 6) {
      return res.status(400).json({
        message: 'Le mot de passe doit contenir au moins 6 caractères.',
      });
    }

    if (normalizedPassword !== normalizedConfirmPassword) {
      return res.status(400).json({
        message: 'Les mots de passe ne correspondent pas.',
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        message: 'Un compte existe déjà avec cette adresse e-mail.',
      });
    }

    const passwordHash = await bcrypt.hash(normalizedPassword, 10);

    const user = await User.create({
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      email: normalizedEmail,
      passwordHash,
      favorites: [],
    });

    return res.status(201).json({
      message: 'Compte créé avec succès.',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        favorites: user.favorites || [],
      },
    });
  } catch (error) {
    console.error('REGISTER API ERROR:', error);

    if (error?.name === 'ValidationError') {
      return res.status(400).json({
        message: Object.values(error.errors)
          .map((item) => item.message)
          .join(' '),
      });
    }

    if (error?.code === 11000) {
      return res.status(409).json({
        message: 'Un compte existe déjà avec cette adresse e-mail.',
      });
    }

    return res.status(500).json({
      message:
        process.env.NODE_ENV === 'development'
          ? error?.message || 'Erreur serveur inconnue.'
          : 'Une erreur est survenue lors de la création du compte.',
    });
  }
}