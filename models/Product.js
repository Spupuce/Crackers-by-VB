// models/Product.js
import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: [true, "L’URL de l’image est obligatoire."],
      trim: true,
    },
    offsetX: {
      type: Number,
      default: 0,
      min: [-80, "La position horizontale ne peut pas être inférieure à -80."],
      max: [80, "La position horizontale ne peut pas dépasser 80."],
    },
    offsetY: {
      type: Number,
      default: 0,
      min: [-80, "La position verticale ne peut pas être inférieure à -80."],
      max: [80, "La position verticale ne peut pas dépasser 80."],
    },
    zoom: {
      type: Number,
      default: 1,
      min: [1, "Le zoom ne peut pas être inférieur à 1."],
      max: [3, "Le zoom ne peut pas dépasser 3."],
    },
  },
  { _id: false }
);

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
    images: {
      type: [imageSchema],
      default: [],
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
  { _id: false }
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

    images: {
      type: [imageSchema],
      default: [],
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
  }
);

export default mongoose.models.Product ||
  mongoose.model("Product", productSchema);