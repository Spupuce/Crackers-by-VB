// utils/shipping.js

function getSafeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeDeliveryMethod(value) {
  return value === 'home' ? 'home' : 'relay';
}

export function getParcelSizeFromItems(items) {
  const safeItems = Array.isArray(items) ? items : [];

  const totalItems = safeItems.reduce(
    (sum, item) => sum + getSafeNumber(item?.quantity),
    0
  );

  return totalItems > 2 ? 'medium' : 'small';
}

export function computeShippingAmount({
  subtotalAmount,
  deliveryMethod,
  parcelSize,
}) {
  const safeSubtotalAmount = getSafeNumber(subtotalAmount);
  const normalizedDeliveryMethod = normalizeDeliveryMethod(deliveryMethod);
  const normalizedParcelSize = parcelSize === 'medium' ? 'medium' : 'small';

  if (safeSubtotalAmount >= 69) {
    return 0;
  }

  if (normalizedParcelSize === 'medium') {
    return normalizedDeliveryMethod === 'home' ? 8.9 : 5.9;
  }

  return normalizedDeliveryMethod === 'home' ? 7.9 : 4.9;
}