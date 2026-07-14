// lib/services/trackingService.js

const SUPPORTED_CARRIERS = ['mondial relay', 'colissimo', 'chronopost'];
const DELIVERED_STATUSES = ['delivered', 'livre', 'livrée', 'livree'];

export function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeCarrier(value) {
  return normalizeText(value).toLowerCase();
}

export function normalizeOrderStatus(value) {
  return normalizeText(value).toLowerCase();
}

export function isSupportedCarrier(value) {
  return SUPPORTED_CARRIERS.includes(normalizeCarrier(value));
}

export function isTrackableOrder(order) {
  const status = normalizeOrderStatus(order?.status);
  const carrier = normalizeCarrier(order?.shipping?.carrier);
  const trackingNumber = normalizeText(order?.shipping?.trackingNumber);

  return status === 'shipped' && isSupportedCarrier(carrier) && Boolean(trackingNumber);
}

export function normalizeDeliveredAt(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export function resolveTrackingStatus({ ok, delivered, externalStatus }) {
  if (!ok) {
    return 'unavailable';
  }

  if (delivered) {
    return 'delivered';
  }

  if (normalizeText(externalStatus)) {
    return 'in_transit';
  }

  return 'unknown';
}

export function buildTrackingResult({
  ok = false,
  carrier = '',
  trackingNumber = '',
  externalStatus = '',
  delivered = false,
  deliveredAt = null,
  trackingUrl = '',
  message = '',
  raw = null,
  shouldUpdateOrder = false,
  nextOrderStatus = '',
  nextDeliveredAt = null,
  shouldClearDeliveredAt = false,
  trackingStatus = 'unknown',
}) {
  return {
    ok,
    carrier: normalizeCarrier(carrier),
    trackingNumber: normalizeText(trackingNumber),
    externalStatus: normalizeText(externalStatus),
    delivered: Boolean(delivered),
    deliveredAt: normalizeDeliveredAt(deliveredAt),
    trackingUrl: normalizeText(trackingUrl),
    message: normalizeText(message),
    raw,
    shouldUpdateOrder: Boolean(shouldUpdateOrder),
    nextOrderStatus: normalizeOrderStatus(nextOrderStatus),
    nextDeliveredAt: normalizeDeliveredAt(nextDeliveredAt),
    shouldClearDeliveredAt: Boolean(shouldClearDeliveredAt),
    trackingStatus: normalizeText(trackingStatus) || 'unknown',
  };
}

export function mapExternalStatusToDelivered(externalStatus) {
  const normalizedStatus = normalizeText(externalStatus).toLowerCase();

  if (!normalizedStatus) {
    return false;
  }

  return DELIVERED_STATUSES.includes(normalizedStatus);
}

export function buildOrderTrackingUpdate(order, trackingResult) {
  const currentStatus = normalizeOrderStatus(order?.status);
  const currentDeliveredAt = normalizeDeliveredAt(order?.shipping?.deliveredAt);
  const deliveredAt = normalizeDeliveredAt(trackingResult?.deliveredAt);
  const delivered = Boolean(trackingResult?.delivered);
  const nextOrderStatus = delivered ? 'delivered' : currentStatus;
  const nextDeliveredAt = delivered ? deliveredAt || currentDeliveredAt || new Date() : null;
  const shouldClearDeliveredAt = currentStatus === 'delivered' && !delivered;
  const shouldUpdateOrder =
    (delivered && currentStatus !== 'delivered') ||
    (delivered && !currentDeliveredAt && Boolean(nextDeliveredAt)) ||
    shouldClearDeliveredAt;

  return {
    shouldUpdateOrder,
    nextOrderStatus,
    nextDeliveredAt,
    shouldClearDeliveredAt,
    trackingStatus: resolveTrackingStatus({
      ok: trackingResult?.ok,
      delivered,
      externalStatus: trackingResult?.externalStatus,
    }),
  };
}

export async function fetchCarrierTracking({
  carrier,
  trackingNumber,
  trackingUrl = '',
}) {
  const normalizedCarrier = normalizeCarrier(carrier);
  const normalizedTrackingNumber = normalizeText(trackingNumber);
  const normalizedTrackingUrl = normalizeText(trackingUrl);

  if (!isSupportedCarrier(normalizedCarrier)) {
    return buildTrackingResult({
      ok: false,
      carrier: normalizedCarrier,
      trackingNumber: normalizedTrackingNumber,
      trackingUrl: normalizedTrackingUrl,
      message: 'Transporteur non pris en charge.',
      trackingStatus: 'unsupported',
    });
  }

  if (!normalizedTrackingNumber) {
    return buildTrackingResult({
      ok: false,
      carrier: normalizedCarrier,
      trackingNumber: '',
      trackingUrl: normalizedTrackingUrl,
      message: 'Numéro de suivi manquant.',
      trackingStatus: 'missing_tracking_number',
    });
  }

  return buildTrackingResult({
    ok: false,
    carrier: normalizedCarrier,
    trackingNumber: normalizedTrackingNumber,
    trackingUrl: normalizedTrackingUrl,
    message: 'Interrogation API transporteur non implémentée pour le moment.',
    trackingStatus: 'not_implemented',
  });
}

export async function refreshOrderTracking(order) {
  if (!isTrackableOrder(order)) {
    return buildTrackingResult({
      ok: false,
      carrier: order?.shipping?.carrier || '',
      trackingNumber: order?.shipping?.trackingNumber || '',
      trackingUrl: order?.shipping?.trackingUrl || '',
      message: 'Commande non éligible à une actualisation de suivi.',
      trackingStatus: 'not_trackable',
    });
  }

  const trackingResult = await fetchCarrierTracking({
    carrier: order.shipping.carrier,
    trackingNumber: order.shipping.trackingNumber,
    trackingUrl: order.shipping.trackingUrl,
  });

  const orderTrackingUpdate = buildOrderTrackingUpdate(order, trackingResult);

  return buildTrackingResult({
    ...trackingResult,
    ...orderTrackingUpdate,
  });
}

export function getSupportedCarriers() {
  return [...SUPPORTED_CARRIERS];
}