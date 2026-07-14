// lib/services/trackingService.js

const SUPPORTED_CARRIERS = ['mondial relay', 'colissimo', 'chronopost'];
const DELIVERED_STATUSES = ['delivered', 'livre', 'livrée', 'livree'];

export function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeCarrier(value) {
  return normalizeText(value).toLowerCase();
}

export function isSupportedCarrier(value) {
  return SUPPORTED_CARRIERS.includes(normalizeCarrier(value));
}

export function isTrackableOrder(order) {
  const status = normalizeText(order?.status).toLowerCase();
  const carrier = normalizeCarrier(order?.shipping?.carrier);
  const trackingNumber = normalizeText(order?.shipping?.trackingNumber);

  return status === 'shipped' && isSupportedCarrier(carrier) && Boolean(trackingNumber);
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
}) {
  return {
    ok,
    carrier: normalizeCarrier(carrier),
    trackingNumber: normalizeText(trackingNumber),
    externalStatus: normalizeText(externalStatus),
    delivered: Boolean(delivered),
    deliveredAt: deliveredAt || null,
    trackingUrl: normalizeText(trackingUrl),
    message: normalizeText(message),
    raw,
  };
}

export function mapExternalStatusToDelivered(externalStatus) {
  const normalizedStatus = normalizeText(externalStatus).toLowerCase();

  if (!normalizedStatus) {
    return false;
  }

  return DELIVERED_STATUSES.includes(normalizedStatus);
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
    });
  }

  if (!normalizedTrackingNumber) {
    return buildTrackingResult({
      ok: false,
      carrier: normalizedCarrier,
      trackingNumber: '',
      trackingUrl: normalizedTrackingUrl,
      message: 'Numéro de suivi manquant.',
    });
  }

  return buildTrackingResult({
    ok: false,
    carrier: normalizedCarrier,
    trackingNumber: normalizedTrackingNumber,
    trackingUrl: normalizedTrackingUrl,
    message: 'Interrogation API transporteur non implémentée pour le moment.',
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
    });
  }

  return fetchCarrierTracking({
    carrier: order.shipping.carrier,
    trackingNumber: order.shipping.trackingNumber,
    trackingUrl: order.shipping.trackingUrl,
  });
}

export function getSupportedCarriers() {
  return [...SUPPORTED_CARRIERS];
}