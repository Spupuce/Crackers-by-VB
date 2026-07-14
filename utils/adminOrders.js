// utils/adminOrders.js

import {
  FiCheckCircle,
  FiClock,
  FiPackage,
  FiTruck,
} from 'react-icons/fi';

export const ORDER_STATUSES = [
  { value: 'all', label: 'Toutes', icon: null },
  { value: 'pending', label: 'En attente', icon: FiClock },
  { value: 'preparing', label: 'En préparation', icon: FiPackage },
  { value: 'shipped', label: 'Expédiée', icon: FiTruck },
  { value: 'delivered', label: 'Livrée', icon: FiCheckCircle },
];

export const STATUS_OPTIONS = [
  { value: 'pending', label: 'En attente', icon: FiClock },
  { value: 'preparing', label: 'En préparation', icon: FiPackage },
  { value: 'shipped', label: 'Expédiée', icon: FiTruck },
  { value: 'delivered', label: 'Livrée', icon: FiCheckCircle },
];

export const CARRIER_OPTIONS = [
  { value: '', label: 'Sélectionner un transporteur' },
  { value: 'Mondial Relay', label: 'Mondial Relay' },
  { value: 'Colissimo', label: 'Colissimo' },
  { value: 'Chronopost', label: 'Chronopost' },
  { value: 'Lettre Suivie', label: 'Lettre Suivie' },
  { value: 'Colis Privé', label: 'Colis Privé' },
  { value: 'Autre', label: 'Autre' },
];

export const AUTO_TRACKING_CARRIERS = ['Mondial Relay', 'Colissimo', 'Chronopost'];

export function formatPrice(value) {
  return `${Number(value || 0).toFixed(2)} €`;
}

export function getStatusLabel(status) {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label || status;
}

export function getCustomerFullName(order) {
  return `${order.customer.firstName} ${order.customer.lastName}`.trim();
}

export function getAddressLabel(order) {
  const { addressLine1, addressLine2, postalCode, city, country } = order.shippingAddress;

  return [addressLine1, addressLine2, `${postalCode} ${city}`, country]
    .filter(Boolean)
    .join(', ');
}

export function getDefaultEmailMessage(order) {
  const statusLabel = getStatusLabel(order.status);

  if (order.status === 'shipped') {
    return `Bonjour ${getCustomerFullName(order)},\n\nVotre commande ${order.id} a bien été expédiée.\n${
      order.trackingNumber ? `Votre numéro de suivi : ${order.trackingNumber}\n` : ''
    }${order.trackingUrl ? `Suivre mon colis : ${order.trackingUrl}\n` : ''}\nBelle journée,\nCrackers by VB`;
  }

  if (order.status === 'delivered') {
    return `Bonjour ${getCustomerFullName(
      order
    )},\n\nVotre commande ${order.id} a bien été livrée.\nNous espérons qu'elle vous plaît.\n\nBelle journée,\nCrackers by VB`;
  }

  return `Bonjour ${getCustomerFullName(
    order
  )},\n\nNous vous contactons au sujet de votre commande ${
    order.id
  }.\nStatut actuel : ${statusLabel}.\n\nBelle journée,\nCrackers by VB`;
}

export function formatOrderDate(value) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('fr-FR');
}

export function formatPlacedAtLabel(value) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `Passée le ${date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`;
}

export function formatEmailSentAt(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getPaymentMethodLabel(order) {
  if (order.paymentStatus === 'paid') {
    return 'Carte bancaire';
  }

  if (order.paymentStatus === 'pending') {
    return 'Paiement en attente';
  }

  if (order.paymentStatus === 'failed') {
    return 'Paiement échoué';
  }

  if (order.paymentStatus === 'refunded') {
    return 'Paiement remboursé';
  }

  return 'Paiement';
}

export function isAutoTrackingCarrier(carrier) {
  return AUTO_TRACKING_CARRIERS.includes(carrier);
}

export function getStatusEmailInfo(order) {
  const statusEmail = order?.statusEmail || {};
  const sentForStatus = statusEmail?.sentForStatus || '';
  const sent = Boolean(statusEmail?.sent) && sentForStatus === order.status;
  const sentAt = statusEmail?.sentAt || '';

  return {
    sent,
    sentAt,
    sentForStatus,
  };
}

export function getStatusEmailLabel(order) {
  const { sent, sentAt } = getStatusEmailInfo(order);

  if (!sent) {
    return `Mail "${getStatusLabel(order.status)}" non envoyé`;
  }

  const formattedSentAt = formatEmailSentAt(sentAt);

  if (!formattedSentAt) {
    return `Mail "${getStatusLabel(order.status)}" envoyé`;
  }

  return `Mail "${getStatusLabel(order.status)}" envoyé le ${formattedSentAt}`;
}

export function normalizeAdminOrder(apiOrder) {
  const items = Array.isArray(apiOrder?.items)
    ? apiOrder.items.map((item) => ({
        name: item.name || '',
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
        lineTotal: Number(item.unitPrice || 0) * Number(item.quantity || 0),
        imageUrl: item.imageUrl || '',
        color: item.color || '',
      }))
    : [];

  return {
    id: apiOrder.orderNumber || apiOrder._id || '',
    sourceId: apiOrder._id || '',
    customer: {
      firstName: apiOrder.customer?.firstName || '',
      lastName: apiOrder.customer?.lastName || '',
      email: apiOrder.customer?.email || '',
      phone: apiOrder.customer?.phone || '',
    },
    shippingAddress: {
      addressLine1: apiOrder.shippingAddress?.addressLine1 || '',
      addressLine2: apiOrder.shippingAddress?.addressLine2 || '',
      postalCode: apiOrder.shippingAddress?.postalCode || '',
      city: apiOrder.shippingAddress?.city || '',
      country: apiOrder.shippingAddress?.country || '',
    },
    date: formatOrderDate(apiOrder.createdAt),
    placedAtLabel: formatPlacedAtLabel(apiOrder.createdAt),
    itemsCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: Number(apiOrder.subtotalAmount || 0),
    shippingAmount: Number(apiOrder.shippingAmount || 0),
    total: Number(apiOrder.totalAmount || 0),
    paymentMethod: getPaymentMethodLabel(apiOrder),
    paymentStatus: apiOrder.paymentStatus || 'pending',
    status: apiOrder.status || 'pending',
    trackingNumber: apiOrder.shipping?.trackingNumber || '',
    trackingUrl: apiOrder.shipping?.trackingUrl || '',
    shippingCarrier: apiOrder.shipping?.carrier || '',
    shippingMethod: apiOrder.shipping?.method || apiOrder.shipping?.carrier || 'Livraison',
    notes: apiOrder.notes || '',
    statusEmail: {
      sent: Boolean(apiOrder.statusEmail?.sent),
      sentAt: apiOrder.statusEmail?.sentAt || '',
      sentForStatus: apiOrder.statusEmail?.sentForStatus || '',
    },
    items,
  };
}