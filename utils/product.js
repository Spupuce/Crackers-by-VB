/* utils/product.js */

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
  return product.stock <= 0;
}

export function isLowStock(product) {
  return product.stock > 0 && product.stock <= 3;
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
  if (isSoldOut(product)) {
    return {
      key: 'sold-out',
      label: 'Article épuisé',
    };
  }

  if (isLowStock(product)) {
    return {
      key: 'low-stock',
      label: `Plus que ${product.stock} !`,
    };
  }

  return {
    key: 'in-stock',
    label: 'En stock',
  };
}