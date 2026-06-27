// models/Product.js
import mongoose from "mongoose";

const colorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Le nom de la couleur est obligatoire."],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, "La quantité de la couleur est obligatoire."],
      min: [0, "La quantité ne peut pas être négative."],
      default: 0,
    },
    imageUrl: {
      type: String,
      default: "",
      trim: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Le nom du produit est obligatoire."],
      trim: true,
    },

    slug: {
      type: String,
      required: [true, "Le slug est obligatoire."],
      unique: true,
      trim: true,
      lowercase: true,
    },

    category: {
      type: String,
      required: [true, "La catégorie est obligatoire."],
      enum: ["Couture", "Crochet", "Tricot", "Créations enfant"],
      trim: true,
    },

    price: {
      type: Number,
      required: [true, "Le prix est obligatoire."],
      min: [0, "Le prix ne peut pas être négatif."],
    },

    promoPrice: {
      type: Number,
      default: null,
      min: [0, "Le prix promo ne peut pas être négatif."],
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    imageUrl: {
      type: String,
      required: [true, "L’image principale est obligatoire."],
      trim: true,
    },

    stock: {
      type: Number,
      required: [true, "Le stock est obligatoire."],
      min: [0, "Le stock ne peut pas être négatif."],
      default: 0,
    },

    colors: {
      type: [colorSchema],
      default: [],
    },

    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },

    archivedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.Product ||
  mongoose.model("Product", productSchema);