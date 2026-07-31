// utils/productForm.js
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const MIN_OFFSET_PCT = -50;
const MAX_OFFSET_PCT = 50;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function convertLegacyCropToPercent(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return clamp(value - 50, MIN_OFFSET_PCT, MAX_OFFSET_PCT);
}

export function createEmptyColorDraft() {
  return {
    name: "",
    quantity: "",
    imageUrl: "",
    images: [],
  };
}

export function normalizeColorName(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function sanitizeImages(images) {
  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .map((image) => {
      if (!image) {
        return null;
      }

      if (typeof image === "string") {
        const url = image.trim();

        if (!url) {
          return null;
        }

        return {
          url,
          publicId: "",
          offsetX: 0,
          offsetY: 0,
          offsetXPct: 0,
          offsetYPct: 0,
          zoom: 1,
        };
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
      const cropX = Number(image.cropX);
      const cropY = Number(image.cropY);
      const zoom = Number(image.zoom);

      const resolvedOffsetX = Number.isFinite(offsetX) ? offsetX : 0;
      const resolvedOffsetY = Number.isFinite(offsetY) ? offsetY : 0;

      const resolvedOffsetXPct = Number.isFinite(offsetXPct)
        ? clamp(offsetXPct, MIN_OFFSET_PCT, MAX_OFFSET_PCT)
        : Number.isFinite(cropX)
        ? convertLegacyCropToPercent(cropX)
        : 0;

      const resolvedOffsetYPct = Number.isFinite(offsetYPct)
        ? clamp(offsetYPct, MIN_OFFSET_PCT, MAX_OFFSET_PCT)
        : Number.isFinite(cropY)
        ? convertLegacyCropToPercent(cropY)
        : 0;

      return {
        url,
        publicId,
        offsetX: resolvedOffsetX,
        offsetY: resolvedOffsetY,
        offsetXPct: resolvedOffsetXPct,
        offsetYPct: resolvedOffsetYPct,
        zoom: Number.isFinite(zoom) ? clamp(zoom, MIN_ZOOM, MAX_ZOOM) : 1,
      };
    })
    .filter(Boolean);
}

export function sanitizeColors(colors) {
  if (!Array.isArray(colors)) {
    return [];
  }

  return colors.map((color) => {
    const normalizedImages = sanitizeImages(color?.images);
    const fallbackImageUrl =
      typeof color?.imageUrl === "string" ? color.imageUrl.trim() : "";
    const resolvedImageUrl = fallbackImageUrl || normalizedImages[0]?.url || "";

    return {
      name: color?.name || "",
      quantity: Math.max(0, Number(color?.quantity) || 0),
      imageUrl: resolvedImageUrl,
      images: normalizedImages,
      isArchived: Boolean(color?.isArchived),
      archivedAt: color?.isArchived
        ? color?.archivedAt || new Date().toISOString()
        : null,
    };
  });
}

export function buildInitialFormValues(initialValues) {
  return {
    name: initialValues?.name || "",
    category: initialValues?.category || "",
    price: initialValues?.price ?? "",
    promoPrice: initialValues?.promoPrice ?? "",
    description: initialValues?.description || "",
    imageUrl: initialValues?.imageUrl || "",
    images: sanitizeImages(initialValues?.images),
    stock: initialValues?.stock ?? "",
  };
}

export function serializeProductSnapshot(values) {
  return JSON.stringify({
    name: values.name || "",
    category: values.category || "",
    price: values.price === "" ? "" : Number(values.price),
    promoPrice:
      values.promoPrice === "" || values.promoPrice === null
        ? ""
        : Number(values.promoPrice),
    description: values.description || "",
    imageUrl: values.imageUrl || "",
    images: sanitizeImages(values.images || []),
    stock: values.stock === "" ? "" : Number(values.stock),
    colors: sanitizeColors(values.colors || []),
  });
}

export function getFileLabel(file) {
  if (!file?.name) {
    return "Aucun fichier choisi";
  }

  return file.name;
}