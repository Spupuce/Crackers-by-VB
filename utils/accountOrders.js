// utils/accountOrders.js

export function formatOrderDate(value) {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function getStatusClassName(status, stylesObject) {
  switch (status) {
    case 'Livrée':
      return stylesObject.orderStatusDelivered;
    case 'En préparation':
      return stylesObject.orderStatusPreparing;
    case 'Payée':
      return stylesObject.orderStatusPaid;
    case 'En attente':
      return stylesObject.orderStatusPending;
    case 'Expédiée':
    case 'Expédié':
      return stylesObject.orderStatusShipped;
    default:
      return '';
  }
}

export function getOrderDisplayLabel(order) {
  if (typeof order?.orderNumber === 'string' && order.orderNumber.trim()) {
    return order.orderNumber.trim();
  }

  if (typeof order?.id === 'string' && order.id.trim()) {
    return order.id.trim();
  }

  return 'Commande';
}

export function getSafeAmount(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}