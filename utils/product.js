/* utils/product.js */

export function isSoldOut(product) {
  return product.stock <= 0;
}

export function isLowStock(product) {
  return product.stock > 0 && product.stock <= 3;
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