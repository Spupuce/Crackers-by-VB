// pages/api/admin/products/index.js
import { connectMongo } from "../../../../lib/mongodb";
import { requireAdminSession } from "../../../../lib/session";
import Product from "../../../../models/Product";
import RestockRequest from "../../../../models/RestockRequest";
import { resolveProductStock } from "../../../../lib/services/stockService";
import { generateUniqueSlug } from "../../../../lib/services/slugService";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const MIN_OFFSET_PCT = -50;
const MAX_OFFSET_PCT = 50;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function buildStatusFilter(status) {
  switch (status) {
    case "active":
      return { isArchived: false };
    case "archived":
      return { isArchived: true };
    case "all":
    default:
      return {};
  }
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
    console.error("ADMIN_PRODUCTS_ACCESS_ERROR", error);

    return res.status(500).json({
      ok: false,
      message: "Impossible de traiter la demande administrateur.",
    });
  }

  if (req.method === "GET") {
    try {
      const { status = "active" } = req.query;
      const allowedStatuses = ["active", "archived", "all"];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message:
            "Le paramètre status doit être égal à active, archived ou all.",
        });
      }

      const filter = buildStatusFilter(status);

      const products = await Product.find(filter).sort({ createdAt: -1 });

      const pendingRequests = await RestockRequest.find({
        notifiedAt: null,
      })
        .select("product email color createdAt")
        .lean();

      const pendingRequestsMap = pendingRequests.reduce((acc, request) => {
        const productId = String(request.product);

        if (!acc.has(productId)) {
          acc.set(productId, []);
        }

        acc.get(productId).push({
          _id: request._id,
          email: request.email,
          color: request.color || "",
          createdAt: request.createdAt,
        });

        return acc;
      }, new Map());

      const enrichedProducts = products.map((product) => {
        const plainProduct = product.toObject();
        const productPendingRequests =
          pendingRequestsMap.get(String(product._id)) || [];

        return {
          ...plainProduct,
          pendingRequestsCount: productPendingRequests.length,
          pendingRequests: productPendingRequests,
        };
      });

      return res.status(200).json(enrichedProducts);
    } catch (error) {
      return res.status(500).json({
        message: "Erreur lors de la récupération des produits admin.",
      });
    }
  }

  if (req.method === "POST") {
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
        description,
        imageUrl,
        images,
        stock,
        colors,
      });

      if (validationResult.errors.length > 0) {
        return res.status(400).json({
          message: "Le formulaire produit contient des erreurs.",
          errors: validationResult.errors,
        });
      }

      const slug = await generateUniqueSlug({
        model: Product,
        value: name,
      });

      const stockData = resolveProductStock({
        stock,
        colors: normalizedColors,
      });

      const product = await Product.create({
        name: name.trim(),
        slug,
        category: category.trim(),
        price: Number(price),
        promoPrice: validationResult.promoPrice,
        description: description?.trim() || "",
        imageUrl: validationResult.resolvedMainImage.imageUrl,
        images: validationResult.resolvedMainImage.images,
        stock: stockData.stock,
        colors: stockData.colors,
        isArchived: false,
        archivedAt: null,
        pendingRequestsCount: 0,
      });

      return res.status(201).json(product);
    } catch (error) {
      return res.status(500).json({
        message: "Erreur lors de la création du produit.",
      });
    }
  }

  return res.status(405).json({
    message: "Méthode non autorisée.",
  });
}
