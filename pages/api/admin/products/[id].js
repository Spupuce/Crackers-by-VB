// pages/api/admin/products/[id].js
import { connectMongo } from "../../../../lib/mongodb";
import { requireAdminSession } from "../../../../lib/session";
import Product from "../../../../models/Product";
import RestockRequest from "../../../../models/RestockRequest";
import cloudinary from "../../../../lib/services/cloudinary";
import { resolveProductStock } from "../../../../lib/services/stockService";
import { generateUniqueSlug } from "../../../../lib/services/slugService";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const MIN_OFFSET_PCT = -50;
const MAX_OFFSET_PCT = 50;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizePromoPrice(value) {
  if (value === undefined || value === null || value === "") {
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

  if (typeof image === "string") {
    const trimmedUrl = image.trim();

    if (!trimmedUrl) {
      return null;
    }

    return {
      url: trimmedUrl,
      publicId: "",
      offsetX: 0,
      offsetY: 0,
      offsetXPct: 0,
      offsetYPct: 0,
      zoom: 1,
    };
  }

  if (typeof image !== "object") {
    return null;
  }

  const url = typeof image.url === "string" ? image.url.trim() : "";

  if (!url) {
    return null;
  }

  const publicId =
    typeof image.publicId === "string" ? image.publicId.trim() : "";

  const offsetX = Number(image.offsetX);
  const offsetY = Number(image.offsetY);
  const offsetXPct = Number(image.offsetXPct);
  const offsetYPct = Number(image.offsetYPct);
  const zoom = Number(image.zoom);

  return {
    url,
    publicId,
    offsetX: Number.isFinite(offsetX) ? offsetX : 0,
    offsetY: Number.isFinite(offsetY) ? offsetY : 0,
    offsetXPct: Number.isFinite(offsetXPct)
      ? clamp(offsetXPct, MIN_OFFSET_PCT, MAX_OFFSET_PCT)
      : 0,
    offsetYPct: Number.isFinite(offsetYPct)
      ? clamp(offsetYPct, MIN_OFFSET_PCT, MAX_OFFSET_PCT)
      : 0,
    zoom: Number.isFinite(zoom) ? clamp(zoom, MIN_ZOOM, MAX_ZOOM) : 1,
  };
}

function normalizeImages(images) {
  if (!Array.isArray(images)) {
    return [];
  }

  return images.map(normalizeImageEntry).filter(Boolean);
}

function normalizeColors(colors) {
  if (!Array.isArray(colors)) {
    return [];
  }

  return colors.map((color) => {
    const normalizedImages = normalizeImages(color?.images);
    const fallbackImageUrl =
      typeof color?.imageUrl === "string" ? color.imageUrl.trim() : "";
    const resolvedImageUrl = fallbackImageUrl || normalizedImages[0]?.url || "";

    return {
      ...color,
      name: typeof color?.name === "string" ? color.name.trim() : "",
      quantity: Number(color?.quantity) || 0,
      imageUrl: resolvedImageUrl,
      images: normalizedImages,
    };
  });
}

function resolveMainImage({ imageUrl, images }) {
  const trimmedImageUrl = typeof imageUrl === "string" ? imageUrl.trim() : "";
  const normalizedImages = normalizeImages(images);
  const resolvedImageUrl = trimmedImageUrl || normalizedImages[0]?.url || "";

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
    errors.push("Le nom du produit est obligatoire.");
  }

  if (!payload.category || !payload.category.trim()) {
    errors.push("La catégorie est obligatoire.");
  }

  if (
    payload.price === undefined ||
    payload.price === null ||
    Number.isNaN(numericPrice) ||
    numericPrice < 0
  ) {
    errors.push("Le prix du produit est invalide.");
  }

  if (Number.isNaN(normalizedPromoPrice)) {
    errors.push("Le prix promo est invalide.");
  }

  if (normalizedPromoPrice !== null && normalizedPromoPrice < 0) {
    errors.push("Le prix promo ne peut pas être négatif.");
  }

  if (
    normalizedPromoPrice !== null &&
    !Number.isNaN(numericPrice) &&
    normalizedPromoPrice >= numericPrice
  ) {
    errors.push("Le prix promo doit être inférieur au prix normal.");
  }

  if (!resolvedMainImage.imageUrl) {
    errors.push("L’image principale du produit est obligatoire.");
  }

  return {
    errors,
    promoPrice: normalizedPromoPrice,
    resolvedMainImage,
  };
}

function collectImagePublicIds(images) {
  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .map((image) =>
      typeof image?.publicId === "string" ? image.publicId.trim() : "",
    )
    .filter(Boolean);
}

function collectProductPublicIds(productLikeObject) {
  if (!productLikeObject) {
    return [];
  }

  const publicIds = [...collectImagePublicIds(productLikeObject.images)];

  if (Array.isArray(productLikeObject.colors)) {
    productLikeObject.colors.forEach((color) => {
      publicIds.push(...collectImagePublicIds(color?.images));
    });
  }

  return publicIds;
}

async function deleteCloudinaryImagesByPublicIds(publicIds) {
  const normalizedPublicIds = [...new Set((publicIds || []).filter(Boolean))];

  if (normalizedPublicIds.length === 0) {
    return;
  }

  await Promise.allSettled(
    normalizedPublicIds.map((publicId) =>
      cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
      }),
    ),
  );
}

async function deleteRemovedCloudinaryImages(previousProduct, nextProductData) {
  const previousPublicIds = new Set(collectProductPublicIds(previousProduct));
  const nextPublicIds = new Set(collectProductPublicIds(nextProductData));

  const publicIdsToDelete = [...previousPublicIds].filter(
    (publicId) => !nextPublicIds.has(publicId),
  );

  await deleteCloudinaryImagesByPublicIds(publicIdsToDelete);
}

export default async function handler(req, res) {
  try {
    const adminSession = requireAdminSession(req);

    if (!adminSession) {
      return res.status(401).json({
        ok: false,
        message: "Accès administrateur requis.",
      });
    }

    await connectMongo();
  } catch (error) {
    console.error("ADMIN_PRODUCT_ACCESS_ERROR", error);

    return res.status(500).json({
      ok: false,
      message: "Impossible de traiter la demande administrateur.",
    });
  }

  const { id } = req.query;

  if (req.method === "GET") {
    try {
      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json({
          message: "Produit introuvable.",
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
        message: "Erreur lors de la récupération du produit.",
      });
    }
  }

  if (req.method === "PUT") {
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
          message: "Le formulaire produit contient des erreurs.",
          errors: validationResult.errors,
        });
      }

      const existingProduct = await Product.findById(id);

      if (!existingProduct) {
        return res.status(404).json({
          message: "Produit introuvable.",
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

      const nextProductData = {
        imageUrl: validationResult.resolvedMainImage.imageUrl,
        images: validationResult.resolvedMainImage.images,
        colors: stockData.colors,
      };

      const previousProductData = existingProduct.toObject();

      existingProduct.name = name.trim();
      existingProduct.slug = slug;
      existingProduct.category = category.trim();
      existingProduct.price = Number(price);
      existingProduct.promoPrice = validationResult.promoPrice;
      existingProduct.description = description?.trim() || "";
      existingProduct.imageUrl = nextProductData.imageUrl;
      existingProduct.images = nextProductData.images;
      existingProduct.stock = stockData.stock;
      existingProduct.colors = nextProductData.colors;

      await existingProduct.save();
      await deleteRemovedCloudinaryImages(previousProductData, nextProductData);

      return res.status(200).json(existingProduct);
    } catch (error) {
      return res.status(500).json({
        message: "Erreur lors de la mise à jour du produit.",
      });
    }
  }

  if (req.method === "DELETE") {
    try {
      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json({
          message: "Produit introuvable.",
        });
      }

      if (!product.isArchived) {
        return res.status(403).json({
          message:
            "Vous devez d’abord archiver le produit avant de le supprimer définitivement.",
        });
      }

      const productData = product.toObject();
      const publicIdsToDelete = collectProductPublicIds(productData);

      await Product.findByIdAndDelete(id);
      await deleteCloudinaryImagesByPublicIds(publicIdsToDelete);

      return res.status(204).end();
    } catch (error) {
      return res.status(500).json({
        message: "Erreur lors de la suppression définitive du produit.",
      });
    }
  }

  return res.status(405).json({
    message: "Méthode non autorisée.",
  });
}
