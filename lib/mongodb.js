/* lib/mongodb.js */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Merci de définir MONGODB_URI dans le fichier .env.local');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectMongo() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    console.log(
      'MONGODB_URI USED BY APP:',
      `${MONGODB_URI.slice(0, 80)}...`
    );

    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 10000,
      })
      .then((mongooseInstance) => {
        console.log('MongoDB connected successfully.');
        return mongooseInstance;
      })
      .catch((error) => {
        console.error('MongoDB connection error:', {
          name: error?.name || null,
          message: error?.message || null,
          code: error?.code || null,
          reason: error?.reason || null,
        });

        cached.promise = null;
        throw error;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}