// pages/api/auth/profile.js

import { connectMongo } from '../../../lib/mongodb';
import User from '../../../models/User';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({
      message: 'Méthode non autorisée.',
    });
  }

  try {
    await connectMongo();

    const {
      id = '',
      firstName = '',
      lastName = '',
      email = '',
      phone = '',
      addressLine1 = '',
      addressLine2 = '',
      postalCode = '',
      city = '',
      country = '',
    } = req.body || {};

    const normalizedId = String(id).trim();
    const normalizedFirstName = String(firstName).trim();
    const normalizedLastName = String(lastName).trim();
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPhone = String(phone).trim();
    const normalizedAddressLine1 = String(addressLine1).trim();
    const normalizedAddressLine2 = String(addressLine2).trim();
    const normalizedPostalCode = String(postalCode).trim();
    const normalizedCity = String(city).trim();
    const normalizedCountry = String(country).trim() || 'France';

    if (!normalizedId) {
      return res.status(400).json({
        message: 'Utilisateur introuvable.',
      });
    }

    if (!normalizedFirstName || !normalizedLastName || !normalizedEmail) {
      return res.status(400).json({
        message: 'Le prénom, le nom et l’email sont obligatoires.',
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
    const phoneRegex = /^(?:(?:\+33|0)[1-9](?:[ .-]?\d{2}){4})$/;
    const postalCodeRegex = /^\d{5}$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        message: 'Adresse e-mail invalide.',
      });
    }

    if (normalizedPhone && !phoneRegex.test(normalizedPhone)) {
      return res.status(400).json({
        message:
          'Le numéro de téléphone doit être un numéro français valide.',
      });
    }

    if (normalizedPostalCode && !postalCodeRegex.test(normalizedPostalCode)) {
      return res.status(400).json({
        message: 'Le code postal doit contenir 5 chiffres.',
      });
    }

    const existingUserWithEmail = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: normalizedId },
    });

    if (existingUserWithEmail) {
      return res.status(409).json({
        message: 'Un autre compte utilise déjà cette adresse e-mail.',
      });
    }

    const user = await User.findByIdAndUpdate(
      normalizedId,
      {
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        email: normalizedEmail,
        phone: normalizedPhone,
        addressLine1: normalizedAddressLine1,
        addressLine2: normalizedAddressLine2,
        postalCode: normalizedPostalCode,
        city: normalizedCity,
        country: normalizedCountry,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!user) {
      return res.status(404).json({
        message: 'Utilisateur introuvable.',
      });
    }

    return res.status(200).json({
      message: 'Profil mis à jour avec succès.',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || '',
        addressLine1: user.addressLine1 || '',
        addressLine2: user.addressLine2 || '',
        postalCode: user.postalCode || '',
        city: user.city || '',
        country: user.country || 'France',
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Une erreur est survenue lors de la mise à jour du profil.',
    });
  }
}