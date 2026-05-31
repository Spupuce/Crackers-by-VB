// models/User.js

import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
{ slug: {
type: String,
required: [true, 'Le produit associé au panier est obligatoire.'],
trim: true,
},
quantity: {
type: Number,
required: [true, 'La quantité est obligatoire.'],
min: [1, 'La quantité doit être au minimum de 1.'],
},
addedAt: {
type: Date,
default: Date.now,
},
},
{ _id: false,
} );

const userSchema = new mongoose.Schema(
{ firstName: {
type: String,
required: [true, 'Le prénom est obligatoire.'],
trim: true,
minlength: [2, 'Le prénom doit contenir au moins 2 caractères.'],
},
lastName: {
type: String,
required: [true, 'Le nom est obligatoire.'],
trim: true,
minlength: [2, 'Le nom doit contenir au moins 2 caractères.'],
},
email: {
type: String,
required: [true, 'L’adresse e-mail est obligatoire.'],
unique: true,
trim: true,
lowercase: true,
},
phone: {
type: String,
trim: true,
default: '',
},
addressLine1: {
type: String,
trim: true,
default: '',
},
addressLine2: {
type: String,
trim: true,
default: '',
},
postalCode: {
type: String,
trim: true,
default: '',
},
city: {
type: String,
trim: true,
default: '',
},
country: {
type: String,
trim: true,
default: 'France',
},
role: {
type: String,
enum: ['customer', 'admin'],
default: 'customer',
},
favorites: {
type: [String],
default: [],
},
cart: {
type: [cartItemSchema],
default: [],
},
passwordHash: {
type: String,
required: [true, 'Le mot de passe est obligatoire.'],
},
},
{ timestamps: true,
} );

export default mongoose.models.User || mongoose.model('User', userSchema);