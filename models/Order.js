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
    color: {
      type: String,
      default: '',
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

const StatusEmailSchema = new mongoose.Schema(
  {
    sent: {
      type: Boolean,
      default: false,
    },
    sentForStatus: {
      type: String,
      enum: ['', 'pending', 'preparing', 'shipped', 'delivered', 'cancelled'],
      default: '',
      trim: true,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    recipient: {
      type: String,
      default: '',
      trim: true,
    },
    messageId: {
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
      required: false,
      default: null,
      index: true,
    },

    isUserDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    anonymizedAt: {
      type: Date,
      default: null,
      index: true,
    },

    orderNumber: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['pending', 'preparing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },

    customer: {
      firstName: { type: String, required: true, trim: true },
      lastName: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
    },

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
      trim: true,
      index: true,
    },
    stripePaymentIntentId: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },

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

    shipping: {
      method: {
        type: String,
        enum: ['', 'relay', 'home'],
        default: '',
        trim: true,
      },
      parcelSize: {
        type: String,
        enum: ['', 'small', 'medium'],
        default: '',
        trim: true,
      },
      carrier: {
        type: String,
        default: '',
        trim: true,
      },
      trackingNumber: {
        type: String,
        default: '',
        trim: true,
      },
      trackingUrl: {
        type: String,
        default: '',
        trim: true,
      },
      shippedAt: {
        type: Date,
        default: null,
      },
      deliveredAt: {
        type: Date,
        default: null,
      },
    },

    statusEmail: {
      type: StatusEmailSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);