// lib/services/cloudinary.js
import { v2 as cloudinary } from "cloudinary";

const requiredEnvVars = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

const missingEnvVars = requiredEnvVars.filter(
  (key) => !process.env[key] || !String(process.env[key]).trim()
);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Variables Cloudinary manquantes : ${missingEnvVars.join(", ")}`
  );
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export default cloudinary;