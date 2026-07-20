// lib/services/trackingService.js

const SUPPORTED_CARRIERS = ['mondial relay', 'colissimo', 'chronopost'];
const DELIVERED_STATUSES = ['delivered', 'livre', 'livrée', 'livree'];
const LAPOSTE_API_BASE_URL = 'https://api.laposte.fr/suivi/v2/idships';
const LAPOSTE_TRANSIT_KEYWORDS = [
  'en cours de livraison',
  'en livraison',
  'en transit',
  'en cours d acheminement',
  "en cours d'acheminement",
  'pris en charge',
  'tri',
  'acheminement',
  'site de distribution',
  'préparons pour le mettre en livraison',
  'preparons pour le mettre en livraison',
];
const LAPOSTE_DELIVERED_KEYWORDS = [
  'distribue',
  'distribuée',
  'distribuee',
  'livre',
  'livrée',
  'livree',
  'remis',
  'remise',
  'livraison effectuée',
  'livraison effectuee',
  'livré dans votre boîte aux lettres',
  'livre dans votre boite aux lettres',
  'boîte aux lettres',
  'boite aux lettres',
];

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
  const normalizedStatus = normalizeForMatch(externalStatus);

  if (!normalizedStatus) {
    return false;
  }

  if (DELIVERED_STATUSES.some((status) => normalizedStatus === normalizeForMatch(status))) {
    return true;
  }

  return LAPOSTE_DELIVERED_KEYWORDS.some((keyword) =>
    normalizedStatus.includes(normalizeForMatch(keyword))
  );
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
    trackingNumber: trackingResult?.trackingNumber || currentTrackingNumber,
    trackingUrl: trackingResult?.trackingUrl || currentTrackingUrl,
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

function normalizeForMatch(value) {
  return normalizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function collectStringsDeep(value, results = []) {
  if (typeof value === 'string' && value.trim()) {
    results.push(value.trim());
    return results;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectStringsDeep(item, results);
    }
    return results;
  }

  if (value && typeof value === 'object') {
    for (const nestedValue of Object.values(value)) {
      collectStringsDeep(nestedValue, results);
    }
  }

  return results;
}

function findFirstString(value) {
  const matches = collectStringsDeep(value, []);
  return matches[0] || '';
}

function findFirstDate(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string' || value instanceof Date) {
    const normalizedDate = normalizeDeliveredAt(value);
    if (normalizedDate) {
      return normalizedDate;
    }
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstDate(item);
      if (found) {
        return found;
      }
    }
  }

  if (value && typeof value === 'object') {
    for (const nestedValue of Object.values(value)) {
      const found = findFirstDate(nestedValue);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

function getShipmentRoot(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  if (payload.shipment && typeof payload.shipment === 'object') {
    return payload.shipment;
  }

  if (payload.return && typeof payload.return === 'object') {
    return payload.return;
  }

  if (payload.data && typeof payload.data === 'object') {
    return payload.data;
  }

  return payload;
}

function getShipmentTimeline(root) {
  if (!root || typeof root !== 'object') {
    return [];
  }

  if (Array.isArray(root.event)) {
    return root.event;
  }

  if (Array.isArray(root.events)) {
    return root.events;
  }

  if (Array.isArray(root.timeline)) {
    return root.timeline;
  }

  if (Array.isArray(root.history)) {
    return root.history;
  }

  return [];
}

function getStatusCandidates(root, events, payload) {
  const rootCandidates = [
    root?.label,
    root?.statusLabel,
    root?.shipmentStatus,
    root?.status,
    root?.message,
    root?.wording,
    root?.deliveryStatus,
    root?.latestStatus,
    root?.libelle,
  ];

  const eventCandidates = events.flatMap((event) => [
    event?.label,
    event?.shortLabel,
    event?.status,
    event?.message,
    event?.wording,
    event?.libelle,
    event?.eventLabel,
  ]);

  const payloadCandidates = [
    payload?.label,
    payload?.status,
    payload?.message,
    payload?.wording,
    payload?.return?.message,
  ];

  return [...rootCandidates, ...eventCandidates, ...payloadCandidates]
    .map((value) => findFirstString(value))
    .filter(Boolean);
}

function extractExternalStatus(root, events, payload) {
  const candidates = getStatusCandidates(root, events, payload);

  const deliveredCandidate = candidates.find((candidate) =>
    mapExternalStatusToDelivered(candidate)
  );

  if (deliveredCandidate) {
    return deliveredCandidate;
  }

  const transitCandidate = candidates.find((candidate) => {
    const normalizedCandidate = normalizeForMatch(candidate);
    return LAPOSTE_TRANSIT_KEYWORDS.some((keyword) =>
      normalizedCandidate.includes(normalizeForMatch(keyword))
    );
  });

  if (transitCandidate) {
    return transitCandidate;
  }

  return candidates[0] || '';
}

function extractDeliveredAt(root, events, payload) {
  const rootDate = findFirstDate([
    root?.deliveryDate,
    root?.deliveredAt,
    root?.date,
    root?.dateDelivery,
    root?.delivery?.date,
    root?.latestEvent?.date,
    payload?.deliveryDate,
  ]);

  if (rootDate) {
    return rootDate;
  }

  for (const event of events) {
    const eventLabel = normalizeForMatch(
      findFirstString([
        event?.label,
        event?.shortLabel,
        event?.status,
        event?.message,
        event?.wording,
        event?.libelle,
        event?.eventLabel,
      ])
    );

    const isDeliveredEvent = LAPOSTE_DELIVERED_KEYWORDS.some((keyword) =>
      eventLabel.includes(normalizeForMatch(keyword))
    );

    if (!isDeliveredEvent) {
      continue;
    }

    const eventDate = findFirstDate([
      event?.date,
      event?.dateTime,
      event?.datetime,
      event?.eventDate,
      event?.deliveryDate,
      event?.timestamp,
    ]);

    if (eventDate) {
      return eventDate;
    }
  }

  return null;
}

function resolveLaposteTrackingState(externalStatus, payload) {
  const normalizedStatus = normalizeForMatch(externalStatus);
  const payloadStrings = collectStringsDeep(payload, []).map((value) =>
    normalizeForMatch(value)
  );

  const payloadIndicatesDelivered = payloadStrings.some((value) =>
    LAPOSTE_DELIVERED_KEYWORDS.some((keyword) => value.includes(normalizeForMatch(keyword)))
  );

  if (payloadIndicatesDelivered) {
    return {
      delivered: true,
      trackingStatus: 'delivered',
    };
  }

  if (!normalizedStatus) {
    return {
      delivered: false,
      trackingStatus: 'unknown',
    };
  }

  if (
    LAPOSTE_DELIVERED_KEYWORDS.some((keyword) =>
      normalizedStatus.includes(normalizeForMatch(keyword))
    )
  ) {
    return {
      delivered: true,
      trackingStatus: 'delivered',
    };
  }

  if (
    LAPOSTE_TRANSIT_KEYWORDS.some((keyword) =>
      normalizedStatus.includes(normalizeForMatch(keyword))
    )
  ) {
    return {
      delivered: false,
      trackingStatus: 'in_transit',
    };
  }

  if (mapExternalStatusToDelivered(externalStatus)) {
    return {
      delivered: true,
      trackingStatus: 'delivered',
    };
  }

  return {
    delivered: false,
    trackingStatus: 'in_transit',
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

  const apiKey = normalizeText(process.env.LAPOSTE_TRACKING_API_KEY);

  if (!apiKey) {
    return buildTrackingResult({
      ok: false,
      carrier: normalizedCarrier,
      trackingNumber: normalizedTrackingNumber,
      trackingUrl: normalizedTrackingUrl,
      message: 'Clé API La Poste manquante.',
      trackingStatus: 'missing_api_key',
    });
  }

  try {
    const requestUrl = `${LAPOSTE_API_BASE_URL}/${encodeURIComponent(
      normalizedTrackingNumber
    )}?lang=fr_FR`;

    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Okapi-Key': apiKey,
      },
    });

    const rawText = await response.text();
    let payload = null;

    try {
      payload = rawText ? JSON.parse(rawText) : null;
    } catch (parseError) {
      payload = null;
    }

    if (!response.ok) {
      const errorMessage =
        findFirstString([
          payload?.message,
          payload?.return?.message,
          payload?.error,
          payload?.fault?.faultstring,
        ]) || `Réponse transporteur invalide (${response.status}).`;

      return buildTrackingResult({
        ok: false,
        carrier: normalizedCarrier,
        trackingNumber: normalizedTrackingNumber,
        trackingUrl: resolveTrackingUrlForCarrier(
          normalizedCarrier,
          normalizedTrackingNumber,
          normalizedTrackingUrl
        ),
        message: errorMessage,
        trackingStatus: 'unavailable',
        raw: payload || rawText,
      });
    }

    const shipmentRoot = getShipmentRoot(payload);
    const events = getShipmentTimeline(shipmentRoot);
    const externalStatus = extractExternalStatus(shipmentRoot, events, payload);
    const state = resolveLaposteTrackingState(externalStatus, payload);
    const deliveredAt = state.delivered
      ? extractDeliveredAt(shipmentRoot, events, payload)
      : null;

    return buildTrackingResult({
      ok: true,
      carrier: normalizedCarrier,
      trackingNumber: normalizedTrackingNumber,
      trackingUrl: resolveTrackingUrlForCarrier(
        normalizedCarrier,
        normalizedTrackingNumber,
        normalizedTrackingUrl
      ),
      externalStatus,
      delivered: state.delivered,
      deliveredAt,
      message: externalStatus || 'Statut transporteur récupéré.',
      trackingStatus: state.trackingStatus,
      raw: payload || rawText,
    });
  } catch (error) {
    return buildTrackingResult({
      ok: false,
      carrier: normalizedCarrier,
      trackingNumber: normalizedTrackingNumber,
      trackingUrl: resolveTrackingUrlForCarrier(
        normalizedCarrier,
        normalizedTrackingNumber,
        normalizedTrackingUrl
      ),
      message: error?.message || "Impossible d'interroger l'API La Poste.",
      trackingStatus: 'unavailable',
      raw: {
        error: error?.message || 'unknown_error',
      },
    });
  }
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