// models/Order.js

import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    imageUrl: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Identifiant lisible de commande (pour front / admin)
    orderNumber: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },

    // Statut métier (logistique)
    status: {
      type: String,
      enum: ['pending', 'preparing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
      index: true,
    },

    // Statut de paiement séparé
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },

    // Snapshot des infos client au moment de la commande
    customer: {
      firstName: { type: String, required: true, trim: true },
      lastName: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
    },

    // Montants
    subtotalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'EUR',
      trim: true,
    },

    // Articles commandés
    items: {
      type: [OrderItemSchema],
      validate: (value) => Array.isArray(value) && value.length > 0,
    },

    // Notes client ou internes
    notes: {
      type: String,
      default: '',
      trim: true,
    },

    // Références Stripe
    stripeSessionId: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    stripePaymentIntentId: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },

    // Adresse de livraison (snapshot)
    shippingAddress: {
      addressLine1: { type: String, required: true, trim: true },
      addressLine2: { type: String, default: '', trim: true },
      postalCode: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      country: {
        type: String,
        required: true,
        trim: true,
        default: 'France',
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);