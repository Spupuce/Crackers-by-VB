// models/Order.js

import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
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
    status: {
      type: String,
      enum: ['pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
      index: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'EUR',
    },
    items: {
      type: [OrderItemSchema],
      validate: (value) => Array.isArray(value) && value.length > 0,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    stripeSessionId: {
      type: String,
      default: '',
      index: true,
    },
    stripePaymentIntentId: {
      type: String,
      default: '',
      index: true,
    },
    shippingAddress: {
      addressLine1: { type: String, required: true, trim: true },
      addressLine2: { type: String, default: '', trim: true },
      postalCode: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      country: { type: String, required: true, trim: true, default: 'France' },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);