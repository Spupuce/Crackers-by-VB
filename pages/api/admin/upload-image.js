// pages/api/admin/upload-image.js
import fs from 'fs';
import formidable from 'formidable';
import cloudinary from '../../../lib/services/cloudinary';

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseForm(req) {
  const form = formidable({
    multiples: false,
    keepExtensions: true,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (error, fields, files) => {
      if (error) {
        reject(error);
        return;
      }

      resolve({ fields, files });
    });
  });
}

function getUploadedFile(files) {
  if (!files) {
    return null;
  }

  if (Array.isArray(files.image) && files.image.length > 0) {
    return files.image[0];
  }

  if (files.image) {
    return files.image;
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      message: 'Méthode non autorisée.',
    });
  }

  try {
    const { files } = await parseForm(req);
    const uploadedFile = getUploadedFile(files);

    if (!uploadedFile) {
      return res.status(400).json({
        message: 'Aucune image n’a été envoyée.',
      });
    }

    const filePath = uploadedFile.filepath;

    if (!filePath) {
      return res.status(400).json({
        message: 'Le fichier reçu est invalide.',
      });
    }

    const uploadResult = await cloudinary.uploader.upload(filePath, {
      folder: 'crackers-by-vb/products',
      resource_type: 'image',
    });

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return res.status(200).json({
      message: 'Image téléversée avec succès.',
      imageUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Erreur lors du téléversement de l’image.',
    });
  }
}