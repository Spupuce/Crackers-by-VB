// models/RestockRequest.js
import mongoose from 'mongoose';

const restockRequestSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    color: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    notifiedAt: {
      type: Date,
      default: null,
    },
    notificationProcessingAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

restockRequestSchema.index(
  { product: 1, color: 1, email: 1, notifiedAt: 1 },
  { unique: true }
);

export default mongoose.models.RestockRequest ||
  mongoose.model('RestockRequest', restockRequestSchema);