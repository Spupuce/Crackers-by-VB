// pages/api/admin/products/[id].js
import { connectMongo } from '../../../../lib/mongodb';
import Product from '../../../../models/Product';
import RestockRequest from '../../../../models/RestockRequest';
import { resolveProductStock } from '../../../../lib/services/stockService';
import { generateUniqueSlug } from '../../../../lib/services/slugService';

const MIN_OFFSET = -80;
const MAX_OFFSET = 80;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function convertLegacyCropToOffset(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return clamp((value - 50) * 1.6, MIN_OFFSET, MAX_OFFSET);
}

function normalizePromoPrice(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalizedValue = Number(value);

  if (Number.isNaN(normalizedValue)) {
    return Number.NaN;
  }

  return normalizedValue;
}

function normalizeImageEntry(image) {
  if (!image) {
    return null;
  }

  if (typeof image === 'string') {
    const trimmedUrl = image.trim();

    if (!trimmedUrl) {
      return null;
    }

    return {
      url: trimmedUrl,
      offsetX: 0,
      offsetY: 0,
      zoom: 1,
    };
  }

  if (typeof image !== 'object') {
    return null;
  }

  const url = typeof image.url === 'string' ? image.url.trim() : '';

  if (!url) {
    return null;
  }

  const offsetX = Number(image.offsetX);
  const offsetY = Number(image.offsetY);
  const cropX = Number(image.cropX);
  const cropY = Number(image.cropY);
  const zoom = Number(image.zoom);

  const hasOffsetCoordinates =
    Number.isFinite(offsetX) || Number.isFinite(offsetY);

  return {
    url,
    offsetX: Number.isFinite(offsetX)
      ? clamp(offsetX, MIN_OFFSET, MAX_OFFSET)
      : hasOffsetCoordinates
      ? 0
      : convertLegacyCropToOffset(cropX),
    offsetY: Number.isFinite(offsetY)
      ? clamp(offsetY, MIN_OFFSET, MAX_OFFSET)
      : hasOffsetCoordinates
      ? 0
      : convertLegacyCropToOffset(cropY),
    zoom: Number.isFinite(zoom) ? clamp(zoom, MIN_ZOOM, MAX_ZOOM) : 1,
  };
}

function normalizeImages(images) {
  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .map(normalizeImageEntry)
    .filter(Boolean);
}

function normalizeColors(colors) {
  if (!Array.isArray(colors)) {
    return [];
  }

  return colors.map((color) => {
    const normalizedImages = normalizeImages(color?.images);
    const fallbackImageUrl =
      typeof color?.imageUrl === 'string' ? color.imageUrl.trim() : '';
    const resolvedImageUrl =
      fallbackImageUrl || normalizedImages[0]?.url || '';

    return {
      ...color,
      name: typeof color?.name === 'string' ? color.name.trim() : '',
      quantity: Number(color?.quantity) || 0,
      imageUrl: resolvedImageUrl,
      images: normalizedImages,
    };
  });
}

function resolveMainImage({ imageUrl, images }) {
  const trimmedImageUrl = typeof imageUrl === 'string' ? imageUrl.trim() : '';
  const normalizedImages = normalizeImages(images);
  const resolvedImageUrl = trimmedImageUrl || normalizedImages[0]?.url || '';

  return {
    imageUrl: resolvedImageUrl,
    images: normalizedImages,
  };
}

function validateProductPayload(payload) {
  const errors = [];
  const numericPrice = Number(payload.price);
  const normalizedPromoPrice = normalizePromoPrice(payload.promoPrice);
  const resolvedMainImage = resolveMainImage({
    imageUrl: payload.imageUrl,
    images: payload.images,
  });

  if (!payload.name || !payload.name.trim()) {
    errors.push('Le nom du produit est obligatoire.');
  }

  if (!payload.category || !payload.category.trim()) {
    errors.push('La catégorie est obligatoire.');
  }

  if (
    payload.price === undefined ||
    payload.price === null ||
    Number.isNaN(numericPrice) ||
    numericPrice < 0
  ) {
    errors.push('Le prix du produit est invalide.');
  }

  if (Number.isNaN(normalizedPromoPrice)) {
    errors.push('Le prix promo est invalide.');
  }

  if (normalizedPromoPrice !== null && normalizedPromoPrice < 0) {
    errors.push('Le prix promo ne peut pas être négatif.');
  }

  if (
    normalizedPromoPrice !== null &&
    !Number.isNaN(numericPrice) &&
    normalizedPromoPrice >= numericPrice
  ) {
    errors.push('Le prix promo doit être inférieur au prix normal.');
  }

  if (!resolvedMainImage.imageUrl) {
    errors.push('L’image principale du produit est obligatoire.');
  }

  return {
    errors,
    promoPrice: normalizedPromoPrice,
    resolvedMainImage,
  };
}

export default async function handler(req, res) {
  await connectMongo();

  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json({
          message: 'Produit introuvable.',
        });
      }

      const pendingRequestsCount = await RestockRequest.countDocuments({
        product: product._id,
        notifiedAt: null,
      });

      return res.status(200).json({
        ...product.toObject(),
        pendingRequestsCount,
      });
    } catch (error) {
      return res.status(500).json({
        message: 'Erreur lors de la récupération du produit.',
      });
    }
  }

  if (req.method === 'PUT') {
    try {
      const {
        name,
        category,
        price,
        promoPrice,
        description,
        imageUrl,
        images,
        stock,
        colors,
      } = req.body;

      const normalizedColors = normalizeColors(colors);

      const validationResult = validateProductPayload({
        name,
        category,
        price,
        promoPrice,
        imageUrl,
        images,
      });

      if (validationResult.errors.length > 0) {
        return res.status(400).json({
          message: 'Le formulaire produit contient des erreurs.',
          errors: validationResult.errors,
        });
      }

      const existingProduct = await Product.findById(id);

      if (!existingProduct) {
        return res.status(404).json({
          message: 'Produit introuvable.',
        });
      }

      const slug = await generateUniqueSlug({
        model: Product,
        value: name,
        currentId: id,
      });

      const stockData = resolveProductStock({
        stock,
        colors: normalizedColors,
      });

      existingProduct.name = name.trim();
      existingProduct.slug = slug;
      existingProduct.category = category.trim();
      existingProduct.price = Number(price);
      existingProduct.promoPrice = validationResult.promoPrice;
      existingProduct.description = description?.trim() || '';
      existingProduct.imageUrl = validationResult.resolvedMainImage.imageUrl;
      existingProduct.images = validationResult.resolvedMainImage.images;
      existingProduct.stock = stockData.stock;
      existingProduct.colors = stockData.colors;

      await existingProduct.save();

      return res.status(200).json(existingProduct);
    } catch (error) {
      return res.status(500).json({
        message: 'Erreur lors de la mise à jour du produit.',
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json({
          message: 'Produit introuvable.',
        });
      }

      if (!product.isArchived) {
        return res.status(403).json({
          message: 'Vous devez d’abord archiver le produit avant de le supprimer définitivement.',
        });
      }

      await Product.findByIdAndDelete(id);

      return res.status(204).end();
    } catch (error) {
      return res.status(500).json({
        message: 'Erreur lors de la suppression définitive du produit.',
      });
    }
  }

  return res.status(405).json({
    message: 'Méthode non autorisée.',
  });
}