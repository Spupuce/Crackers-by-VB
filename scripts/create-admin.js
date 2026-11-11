// scripts/create-admin.js

/*
 * Crée ou promeut un compte administratrice.
 * Usage : yarn create-admin
 * Lit MONGODB_URI dans .env.local (ou dans les variables d'environnement).
 */

const fs = require('fs');
const path = require('path');
const dns = require('dns');
const readline = require('readline');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;
const BCRYPT_ROUNDS = 10;

function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function createPrompt() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (question) =>
    new Promise((resolve) => {
      rl.question(question, (answer) => resolve(String(answer || '').trim()));
    });

  return { rl, ask };
}

function isYes(answer) {
  return ['o', 'oui', 'y', 'yes'].includes(String(answer).toLowerCase());
}

async function askPassword(ask) {
  const password = await ask(
    `Mot de passe (${MIN_PASSWORD_LENGTH} caractères minimum, affiché à l'écran) : `
  );

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`
    );
  }

  const confirmPassword = await ask('Confirmez le mot de passe : ');

  if (password !== confirmPassword) {
    throw new Error('Les mots de passe ne correspondent pas.');
  }

  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function main() {
  loadEnvFile();

  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI est introuvable dans .env.local.');
  }

  const { rl, ask } = createPrompt();

  try {
    const email = (await ask('Adresse e-mail de l’administratrice : ')).toLowerCase();

    if (!EMAIL_REGEX.test(email)) {
      throw new Error('Adresse e-mail invalide.');
    }

    dns.setServers(['1.1.1.1', '8.8.8.8']);

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      family: 4,
    });

    const users = mongoose.connection.collection('users');
    const existingUser = await users.findOne({ email });
    const now = new Date();

    if (existingUser && existingUser.role === 'admin') {
      console.log('Ce compte est déjà administratrice.');

      const resetAnswer = await ask('Changer son mot de passe ? (o/N) : ');

      if (!isYes(resetAnswer)) {
        console.log('Aucune modification effectuée.');
        return;
      }

      const passwordHash = await askPassword(ask);

      await users.updateOne(
        { _id: existingUser._id },
        { $set: { passwordHash, updatedAt: now } }
      );

      console.log('Mot de passe mis à jour.');
      return;
    }

    if (existingUser) {
      const promoteAnswer = await ask(
        'Un compte client existe avec cette adresse. Le passer administratrice ? (o/N) : '
      );

      if (!isYes(promoteAnswer)) {
        console.log('Aucune modification effectuée.');
        return;
      }

      await users.updateOne(
        { _id: existingUser._id },
        { $set: { role: 'admin', favorites: [], cart: [], updatedAt: now } }
      );

      console.log('Compte passé administratrice. Mot de passe inchangé.');
      return;
    }

    const firstName = await ask('Prénom : ');
    const lastName = await ask('Nom : ');

    if (firstName.length < 2 || lastName.length < 2) {
      throw new Error('Le prénom et le nom doivent contenir au moins 2 caractères.');
    }

    const passwordHash = await askPassword(ask);

    await users.insertOne({
      firstName,
      lastName,
      email,
      phone: '',
      addressLine1: '',
      addressLine2: '',
      postalCode: '',
      city: '',
      country: 'France',
      role: 'admin',
      favorites: [],
      cart: [],
      passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    console.log('Compte administratrice créé.');
  } finally {
    rl.close();
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(`Erreur : ${error.message}`);
  process.exitCode = 1;
});