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

export function normalizeShippedAt(value) {
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
  nextShippedAt = null,
  shouldClearDeliveredAt = false,
  shouldClearShippedAt = false,
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
    nextShippedAt: normalizeShippedAt(nextShippedAt),
    shouldClearDeliveredAt: Boolean(shouldClearDeliveredAt),
    shouldClearShippedAt: Boolean(shouldClearShippedAt),
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

export function resolveTrackingUrlForCarrier(carrier, trackingNumber, trackingUrl = '') {
  const normalizedCarrier = normalizeCarrier(carrier);
  const normalizedTrackingNumber = normalizeText(trackingNumber);
  const normalizedTrackingUrl = normalizeText(trackingUrl);

  if (!normalizedCarrier || !normalizedTrackingNumber) {
    return normalizedTrackingUrl;
  }

  const encodedTrackingNumber = encodeURIComponent(normalizedTrackingNumber);

  if (normalizedCarrier === 'colissimo') {
    return `https://www.laposte.fr/outils/suivre-vos-envois?code=${encodedTrackingNumber}`;
  }

  if (normalizedCarrier === 'chronopost') {
    return `https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=${encodedTrackingNumber}`;
  }

  if (normalizedCarrier === 'mondial relay') {
    return `https://www.mondialrelay.fr/suivi-de-colis/?numeroExpedition=${encodedTrackingNumber}`;
  }

  return normalizedTrackingUrl;
}

export function resolveOrderShippingConsistency({
  status,
  shippedAt,
  deliveredAt,
  trackingNumber,
  trackingUrl,
  carrier,
  now = new Date(),
}) {
  const normalizedStatus = normalizeOrderStatus(status);
  const normalizedTrackingNumber = normalizeText(trackingNumber);
  const normalizedCarrier = normalizeCarrier(carrier);
  const currentShippedAt = normalizeShippedAt(shippedAt);
  const currentDeliveredAt = normalizeDeliveredAt(deliveredAt);
  const resolvedTrackingUrl = resolveTrackingUrlForCarrier(
    normalizedCarrier,
    normalizedTrackingNumber,
    trackingUrl
  );

  let nextStatus = normalizedStatus;
  let nextShippedAt = currentShippedAt;
  let nextDeliveredAt = currentDeliveredAt;

  if ((nextStatus === 'pending' || nextStatus === 'preparing') && normalizedTrackingNumber) {
    nextStatus = 'shipped';
  }

  if (nextStatus === 'pending' || nextStatus === 'preparing') {
    if (!normalizedTrackingNumber) {
      nextShippedAt = null;
    }
    nextDeliveredAt = null;
  }

  if (nextStatus === 'shipped') {
    if (normalizedTrackingNumber && !nextShippedAt) {
      nextShippedAt = now;
    }
    nextDeliveredAt = null;
  }

  if (nextStatus === 'delivered') {
    if (normalizedTrackingNumber && !nextShippedAt) {
      nextShippedAt = now;
    }
    if (!nextDeliveredAt) {
      nextDeliveredAt = now;
    }
  }

  if (nextStatus === 'cancelled') {
    nextDeliveredAt = null;
  }

  return {
    status: nextStatus,
    trackingNumber: normalizedTrackingNumber,
    trackingUrl: resolvedTrackingUrl,
    carrier: normalizedCarrier,
    shippedAt: nextShippedAt,
    deliveredAt: nextDeliveredAt,
  };
}

export function buildOrderTrackingUpdate(order, trackingResult) {
  const currentStatus = normalizeOrderStatus(order?.status);
  const currentShippedAt = normalizeShippedAt(order?.shipping?.shippedAt);
  const currentDeliveredAt = normalizeDeliveredAt(order?.shipping?.deliveredAt);
  const currentTrackingNumber = normalizeText(order?.shipping?.trackingNumber);
  const currentTrackingUrl = normalizeText(order?.shipping?.trackingUrl);
  const currentCarrier = normalizeCarrier(order?.shipping?.carrier);

  const delivered = Boolean(trackingResult?.delivered);
  const trackingStatus = resolveTrackingStatus({
    ok: trackingResult?.ok,
    delivered,
    externalStatus: trackingResult?.externalStatus,
  });

  const nextStatus = delivered ? 'delivered' : currentStatus;
  const consistency = resolveOrderShippingConsistency({
    status: nextStatus,
    shippedAt: currentShippedAt,
    deliveredAt: delivered ? trackingResult?.deliveredAt || currentDeliveredAt : currentDeliveredAt,
    trackingNumber:
      trackingResult?.trackingNumber || currentTrackingNumber,
    trackingUrl:
      trackingResult?.trackingUrl || currentTrackingUrl,
    carrier: trackingResult?.carrier || currentCarrier,
  });

  const shouldUpdateOrder =
    consistency.status !== currentStatus ||
    String(consistency.shippedAt || '') !== String(currentShippedAt || '') ||
    String(consistency.deliveredAt || '') !== String(currentDeliveredAt || '') ||
    consistency.trackingNumber !== currentTrackingNumber ||
    consistency.trackingUrl !== currentTrackingUrl ||
    consistency.carrier !== currentCarrier;

  return {
    shouldUpdateOrder,
    nextOrderStatus: consistency.status,
    nextDeliveredAt: consistency.deliveredAt,
    nextShippedAt: consistency.shippedAt,
    nextTrackingNumber: consistency.trackingNumber,
    nextTrackingUrl: consistency.trackingUrl,
    nextCarrier: consistency.carrier,
    shouldClearDeliveredAt: false,
    shouldClearShippedAt: false,
    trackingStatus,
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