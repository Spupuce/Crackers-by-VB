// utils/cartValidation.js

const phoneRegex = /^(?:(?:\+33|0)[1-9](?:[ .-]?\d{2}){4})$/;
const postalCodeRegex = /^\d{5}$/;
const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const nameRegex = /^[A-Za-zÀ-ÿ' -]{2,}$/;

const fieldOrder = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'address',
  'zip',
  'city',
  'country',
];

const fieldIdMap = {
  firstName: 'contact-firstName',
  lastName: 'contact-lastName',
  email: 'contact-email',
  phone: 'contact-phone',
  address: 'shipping-address',
  zip: 'shipping-zip',
  city: 'shipping-city',
  country: 'shipping-country',
};

export function buildInitialContact(user) {
  return {
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  };
}

export function buildInitialShipping(user) {
  return {
    address: user?.addressLine1 || '',
    city: user?.city || '',
    zip: user?.postalCode || '',
    country: user?.country || 'France',
  };
}

export function buildInitialErrors() {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    zip: '',
    city: '',
    country: '',
  };
}

export function buildInitialTouched() {
  return {
    firstName: false,
    lastName: false,
    email: false,
    phone: false,
    address: false,
    zip: false,
    city: false,
    country: false,
  };
}

export function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

export function normalizePostalCode(value) {
  return value.replace(/\D/g, '').slice(0, 5);
}

export function normalizePhoneOnChange(value) {
  return value.replace(/[^\d+ .-]/g, '');
}

export function normalizePhoneOnBlur(value) {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeText(value) {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeCountry(value) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return '';
  }

  const lowerValue = normalizedValue.toLowerCase();

  if (lowerValue === 'france') {
    return 'France';
  }

  return normalizedValue;
}

export function validateSingleField(fieldName, fieldValue) {
  const value = typeof fieldValue === 'string' ? fieldValue.trim() : '';

  switch (fieldName) {
    case 'firstName':
      if (!value) return 'Le prénom est obligatoire.';
      if (!nameRegex.test(value)) {
        return 'Le prénom doit contenir au moins 2 caractères valides.';
      }
      return '';

    case 'lastName':
      if (!value) return 'Le nom est obligatoire.';
      if (!nameRegex.test(value)) {
        return 'Le nom doit contenir au moins 2 caractères valides.';
      }
      return '';

    case 'email':
      if (!value) return "L'email est obligatoire.";
      if (!emailRegex.test(value)) {
        return "L'adresse email n'est pas valide.";
      }
      return '';

    case 'phone':
      if (!value) return 'Le téléphone est obligatoire.';
      if (!phoneRegex.test(value)) {
        return 'Le numéro de téléphone doit être un numéro français valide.';
      }
      return '';

    case 'address':
      if (!value) return "L'adresse est obligatoire.";
      if (value.length < 5) {
        return "L'adresse saisie semble trop courte.";
      }
      return '';

    case 'zip':
      if (!value) return 'Le code postal est obligatoire.';
      if (!postalCodeRegex.test(value)) {
        return 'Le code postal doit contenir exactement 5 chiffres.';
      }
      return '';

    case 'city':
      if (!value) return 'La ville est obligatoire.';
      if (value.length < 2) {
        return 'La ville doit contenir au moins 2 caractères.';
      }
      return '';

    case 'country':
      if (!value) return 'Le pays est obligatoire.';
      return '';

    default:
      return '';
  }
}

export function focusFirstInvalidField(errorsObject) {
  const firstInvalidFieldName = fieldOrder.find((fieldName) =>
    Boolean(errorsObject[fieldName])
  );

  if (!firstInvalidFieldName) {
    return;
  }

  const targetId = fieldIdMap[firstInvalidFieldName];
  const targetElement = document.getElementById(targetId);

  if (!targetElement) {
    return;
  }

  const headerOffset = 140;
  const elementTop =
    targetElement.getBoundingClientRect().top + window.pageYOffset;
  const targetTop = Math.max(elementTop - headerOffset, 0);

  window.scrollTo({
    top: targetTop,
    behavior: 'smooth',
  });

  window.setTimeout(() => {
    targetElement.focus({ preventScroll: true });
  }, 250);
}

export function buildCartLineKey(item) {
  if (item?.cartItemKey) {
    return item.cartItemKey;
  }

  const slug = typeof item?.slug === 'string' ? item.slug : '';
  const color = typeof item?.color === 'string' ? item.color.trim() : '';

  return `${slug}::${color || 'default'}`;
}

export function getParcelLabel(parcelSize) {
  return parcelSize === 'medium' ? 'Colis moyen' : 'Petit colis';
}

export function getDeliveryMethodLabel(deliveryMethod) {
  return deliveryMethod === 'home'
    ? 'Livraison à domicile'
    : 'Point relais';
}

export function getCheckoutErrorMessage(data, responseStatus) {
  const code = typeof data?.code === 'string' ? data.code : '';

  if (code === 'EMPTY_CART') {
    return 'Votre panier est vide. Ajoutez au moins un produit avant de continuer.';
  }

  if (
    code === 'INVALID_BODY' ||
    code === 'INVALID_CUSTOMER' ||
    code === 'INVALID_CUSTOMER_EMAIL' ||
    code === 'INVALID_SHIPPING' ||
    code === 'INVALID_ITEMS'
  ) {
    return (
      data?.message ||
      'Certaines informations de la commande sont invalides. Merci de vérifier le formulaire.'
    );
  }

  if (code === 'STOCK_ERROR') {
    return (
      data?.message ||
      'Certains produits ne sont plus disponibles en quantité suffisante.'
    );
  }

  if (code === 'STRIPE_AMOUNT_INVALID') {
    return (
      data?.message ||
      'Le montant de la commande est invalide. Merci de vérifier votre panier.'
    );
  }

  if (code === 'STRIPE_IDEMPOTENCY_ERROR' || responseStatus === 409) {
    return (
      data?.message ||
      'Une tentative de paiement en double a été détectée. Merci de réessayer.'
    );
  }

  if (code === 'STRIPE_UNAVAILABLE' || responseStatus === 502) {
    return (
      data?.message ||
      'Le service de paiement est momentanément indisponible. Merci de réessayer dans quelques instants.'
    );
  }

  if (code === 'STRIPE_RATE_LIMIT' || responseStatus === 503) {
    return (
      data?.message ||
      'Le service de paiement est temporairement saturé. Merci de réessayer dans quelques instants.'
    );
  }

  if (
    code === 'STRIPE_INVALID_REQUEST' ||
    code === 'STRIPE_AUTH_ERROR' ||
    code === 'STRIPE_SESSION_ERROR' ||
    code === 'CHECKOUT_ERROR' ||
    responseStatus >= 500
  ) {
    return (
      data?.message ||
      'Une erreur serveur est survenue lors de la préparation du paiement. Merci de réessayer plus tard.'
    );
  }

  return (
    data?.message ||
    'Une erreur inattendue est survenue lors de la préparation du paiement.'
  );
}

export async function parseJsonSafely(response) {
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    return null;
  }

  return response.json().catch(() => null);
}