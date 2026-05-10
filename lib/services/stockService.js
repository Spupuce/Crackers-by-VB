// lib/services/stockService.js

export function sanitizeColors(colors = []) {
  if (!Array.isArray(colors)) {
    return [];
  }

  return colors
    .map((color) => ({
      name: typeof color.name === 'string' ? color.name.trim() : '',
      quantity: Number.isFinite(Number(color.quantity)) ? Number(color.quantity) : 0,
      imageUrl: typeof color.imageUrl === 'string' ? color.imageUrl.trim() : '',
    }))
    .filter((color) => color.name.length > 0);
}

export function hasColors(colors = []) {
  return Array.isArray(colors) && colors.length > 0;
}

export function calculateStockFromColors(colors = []) {
  const sanitizedColors = sanitizeColors(colors);

  return sanitizedColors.reduce((total, color) => {
    return total + Math.max(0, color.quantity);
  }, 0);
}

export function normalizeManualStock(stock) {
  const normalizedStock = Number(stock);

  if (!Number.isFinite(normalizedStock) || normalizedStock < 0) {
    return 0;
  }

  return Math.floor(normalizedStock);
}

export function resolveProductStock({ stock, colors = [] }) {
  const sanitizedColors = sanitizeColors(colors);

  if (hasColors(sanitizedColors)) {
    return {
      stock: calculateStockFromColors(sanitizedColors),
      colors: sanitizedColors,
      stockMode: 'colors',
    };
  }

  return {
    stock: normalizeManualStock(stock),
    colors: [],
    stockMode: 'manual',
  };
}