// scripts/create-admin.js

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { connectMongo } = require('../lib/mongodb');
const User = require('../models/User');

const ADMIN_USER = {
  firstName: 'Virginie',
  lastName: 'Beninca',
  email: 'spupucemail@gmail.com',
  password: 'test1234',
  role: 'admin',
};

async function createOrUpdateAdmin() {
  try {
    await connectMongo();

    const normalizedEmail = ADMIN_USER.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(ADMIN_USER.password, 10);

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      existingUser.firstName = ADMIN_USER.firstName;
      existingUser.lastName = ADMIN_USER.lastName;
      existingUser.email = normalizedEmail;
      existingUser.passwordHash = passwordHash;
      existingUser.role = ADMIN_USER.role;

      await existingUser.save();

      console.log('Compte administrateur mis à jour avec succès.');
      return;
    }

    await User.create({
      firstName: ADMIN_USER.firstName,
      lastName: ADMIN_USER.lastName,
      email: normalizedEmail,
      passwordHash,
      role: ADMIN_USER.role,
    });

    console.log('Compte administrateur créé avec succès.');
  } catch (error) {
    console.error('Erreur lors de la création du compte administrateur :', error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

createOrUpdateAdmin();