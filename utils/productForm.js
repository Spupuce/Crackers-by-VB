// utils/productForm.js
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
          cropX: 50,
          cropY: 50,
          zoom: 1,
        };
      }

      const url = typeof image.url === "string" ? image.url.trim() : "";

      if (!url) {
        return null;
      }

      const cropX = Number(image.cropX);
      const cropY = Number(image.cropY);
      const zoom = Number(image.zoom);

      return {
        url,
        cropX: Number.isFinite(cropX) ? Math.min(100, Math.max(0, cropX)) : 50,
        cropY: Number.isFinite(cropY) ? Math.min(100, Math.max(0, cropY)) : 50,
        zoom: Number.isFinite(zoom) ? Math.min(3, Math.max(1, zoom)) : 1,
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