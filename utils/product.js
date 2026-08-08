// utils/product.js
function getSafeStock(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function getColorStock(color) {
  if (!color || typeof color !== 'object') return 0;

  if (color.isArchived) {
    return 0;
  }

  if (color.quantity !== undefined && color.quantity !== null) {
    return getSafeStock(color.quantity);
  }

  if (color.stock !== undefined && color.stock !== null) {
    return getSafeStock(color.stock);
  }

  return 0;
}

function getTotalStock(product) {
  if (!product) return 0;

  if (Array.isArray(product.colors) && product.colors.length > 0) {
    return product.colors.reduce((sum, color) => sum + getColorStock(color), 0);
  }

  return getSafeStock(product.stock);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeImageUrl(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function hasFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const MIN_OFFSET = -100;
const MAX_OFFSET = 100;

function getNormalizedOffset(offset, zoom) {
  if (zoom <= 1) {
    return 0;
  }

  const zoomOverflowRatio = (zoom - 1) / (MAX_ZOOM - 1);
  const dynamicLimit = clamp(zoomOverflowRatio * 50, 0, 50);

  return clamp(offset, -dynamicLimit, dynamicLimit);
}

function resolveOffsetPercent(percentValue, pixelValue) {
  const hasPercent = hasFiniteNumber(percentValue);
  const hasPixel = hasFiniteNumber(pixelValue);

  const safePercent = hasPercent ? clamp(Number(percentValue), -50, 50) : 0;
  const safePixel = hasPixel ? clamp(Number(pixelValue), MIN_OFFSET, MAX_OFFSET) : 0;

  if (!hasPercent && hasPixel) {
    return safePixel;
  }

  if (hasPercent && safePercent === 0 && hasPixel && safePixel !== 0) {
    return safePixel;
  }

  return safePercent;
}

export function getSafeProductImage(image) {
  if (!image || typeof image !== 'object') {
    return {
      url: '',
      publicId: '',
      offsetX: 0,
      offsetY: 0,
      offsetXPct: 0,
      offsetYPct: 0,
      zoom: 1,
    };
  }

  const offsetX = hasFiniteNumber(image.offsetX)
    ? clamp(Number(image.offsetX), MIN_OFFSET, MAX_OFFSET)
    : 0;

  const offsetY = hasFiniteNumber(image.offsetY)
    ? clamp(Number(image.offsetY), MIN_OFFSET, MAX_OFFSET)
    : 0;

  const offsetXPct = resolveOffsetPercent(image.offsetXPct, offsetX);
  const offsetYPct = resolveOffsetPercent(image.offsetYPct, offsetY);

  return {
    url: normalizeImageUrl(image.url),
    publicId: typeof image.publicId === 'string' ? image.publicId.trim() : '',
    offsetX,
    offsetY,
    offsetXPct,
    offsetYPct,
    zoom: hasFiniteNumber(image.zoom)
      ? clamp(Number(image.zoom), MIN_ZOOM, MAX_ZOOM)
      : 1,
  };
}

export function getMainProductImage(product) {
  const mainImageUrl = normalizeImageUrl(product?.imageUrl);

  if (!mainImageUrl) {
    return getSafeProductImage(null);
  }

  const matchingImage = Array.isArray(product?.images)
    ? product.images.find(
        (image) => normalizeImageUrl(image?.url) === mainImageUrl
      )
    : null;

  if (matchingImage) {
    return getSafeProductImage(matchingImage);
  }

  return getSafeProductImage({
    url: mainImageUrl,
    publicId: '',
    offsetX: 0,
    offsetY: 0,
    offsetXPct: 0,
    offsetYPct: 0,
    zoom: 1,
  });
}

export function getProductImageTransformStyle(image) {
  const safeImage = getSafeProductImage(image);

  const translateXPercent = getNormalizedOffset(
    safeImage.offsetXPct,
    safeImage.zoom
  );
  const translateYPercent = getNormalizedOffset(
    safeImage.offsetYPct,
    safeImage.zoom
  );

  return {
    transform: `translate(${translateXPercent}%, ${translateYPercent}%) scale(${safeImage.zoom})`,
    transformOrigin: 'center center',
  };
}

export function isDisplayableProduct(product) {
  if (!product) {
    return false;
  }

  if (typeof product.isArchived === 'boolean') {
    return !product.isArchived;
  }

  return Boolean(product.isActive);
}

export function isSoldOut(product) {
  return getTotalStock(product) <= 0;
}

export function isLowStock(product) {
  const total = getTotalStock(product);
  return total > 0 && total <= 3;
}

export function hasValidPromoPrice(product) {
  if (!product) {
    return false;
  }

  const price = Number(product.price);
  const rawPromoPrice = product.promoPrice;

  if (
    rawPromoPrice === undefined ||
    rawPromoPrice === null ||
    rawPromoPrice === ''
  ) {
    return false;
  }

  const promoPrice = Number(rawPromoPrice);

  if (Number.isNaN(price) || Number.isNaN(promoPrice)) {
    return false;
  }

  return promoPrice >= 0 && promoPrice < price;
}

export function getActiveProductPrice(product) {
  if (hasValidPromoPrice(product)) {
    return Number(product.promoPrice);
  }

  return Number(product?.price) || 0;
}

export function getProductBasePrice(product) {
  return Number(product?.price) || 0;
}

export function getProductStatus(product) {
  const total = getTotalStock(product);

  if (total <= 0) {
    return {
      key: 'sold-out',
      label: 'Article épuisé',
    };
  }

  if (total <= 3) {
    return {
      key: 'low-stock',
      label: `Plus que ${total} !`,
    };
  }

  return {
    key: 'in-stock',
    label: 'En stock',
  };
}

export { getTotalStock };