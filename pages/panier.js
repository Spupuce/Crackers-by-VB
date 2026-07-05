// pages/panier.js

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiArrowLeft } from 'react-icons/fi';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import internalStyles from '../styles/InternalPages.module.css';
import styles from '../styles/CartPage.module.css';
import {
  computeShippingAmount,
  getParcelSizeFromItems,
  normalizeDeliveryMethod,
} from '../utils/shipping';

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

function buildInitialContact(user) {
  return {
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  };
}

function buildInitialShipping(user) {
  return {
    address: user?.addressLine1 || '',
    city: user?.city || '',
    zip: user?.postalCode || '',
    country: user?.country || 'France',
  };
}

function buildInitialErrors() {
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

function buildInitialTouched() {
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

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function normalizePostalCode(value) {
  return value.replace(/\D/g, '').slice(0, 5);
}

function normalizePhoneOnChange(value) {
  return value.replace(/[^\d+ .-]/g, '');
}

function normalizePhoneOnBlur(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeText(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeCountry(value) {
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

function validateSingleField(fieldName, fieldValue) {
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

function focusFirstInvalidField(errorsObject) {
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

function buildCartLineKey(item) {
  if (item?.cartItemKey) {
    return item.cartItemKey;
  }

  const slug = typeof item?.slug === 'string' ? item.slug : '';
  const color = typeof item?.color === 'string' ? item.color.trim() : '';

  return `${slug}::${color || 'default'}`;
}

function getParcelLabel(parcelSize) {
  return parcelSize === 'medium' ? 'Colis moyen' : 'Petit colis';
}

function getDeliveryMethodLabel(deliveryMethod) {
  return deliveryMethod === 'home' ? 'Livraison à domicile' : 'Point relais';
}

function getCheckoutErrorMessage(data, responseStatus) {
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

async function parseJsonSafely(response) {
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    return null;
  }

  return response.json().catch(() => null);
}

export default function PanierPage() {
  const router = useRouter();
  const { items, cartTotal } = useCart();
  const { user, isAuthenticated, updateUser } = useAuth();

  const hasItems = Array.isArray(items) && items.length > 0;

  const [contact, setContact] = useState(buildInitialContact(user));
  const [shipping, setShipping] = useState(buildInitialShipping(user));
  const [notes, setNotes] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('relay');
  const [fieldErrors, setFieldErrors] = useState(buildInitialErrors());
  const [touchedFields, setTouchedFields] = useState(buildInitialTouched());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitInfo, setSubmitInfo] = useState('');

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    setContact((prev) => ({
      firstName: prev.firstName?.trim() ? prev.firstName : user.firstName || '',
      lastName: prev.lastName?.trim() ? prev.lastName : user.lastName || '',
      email: prev.email?.trim() ? prev.email : user.email || '',
      phone: prev.phone?.trim() ? prev.phone : user.phone || '',
    }));

    setShipping((prev) => ({
      address: prev.address?.trim() ? prev.address : user.addressLine1 || '',
      zip: prev.zip?.trim() ? prev.zip : user.postalCode || '',
      city: prev.city?.trim() ? prev.city : user.city || '',
      country: prev.country?.trim() ? prev.country : user.country || 'France',
    }));
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!router.isReady) return;

    const checkoutStatus = router.query.checkout;

    if (checkoutStatus === 'cancel') {
      setSubmitError(
        'Le paiement a été interrompu avant validation. Vous pouvez réessayer à tout moment.'
      );
      setSubmitInfo('');

      const { checkout, ...restQuery } = router.query;

      router.replace(
        {
          pathname: router.pathname,
          query: restQuery,
        },
        undefined,
        { shallow: true }
      );
    }
  }, [router.isReady, router.pathname, router.query, router]);

  const canAttemptCheckout = useMemo(
    () => hasItems && !isSubmitting,
    [hasItems, isSubmitting]
  );

  const totalItems = useMemo(
    () =>
      items.reduce((accumulator, item) => accumulator + (item.quantity || 0), 0),
    [items]
  );

  const normalizedDeliveryMethod = useMemo(
    () => normalizeDeliveryMethod(deliveryMethod),
    [deliveryMethod]
  );

  const parcelSize = useMemo(
    () => getParcelSizeFromItems(items),
    [items]
  );

  const shippingPrice = useMemo(
    () =>
      computeShippingAmount({
        subtotalAmount: cartTotal,
        deliveryMethod: normalizedDeliveryMethod,
        parcelSize,
      }),
    [cartTotal, normalizedDeliveryMethod, parcelSize]
  );

  const estimatedTotal = useMemo(
    () => cartTotal + shippingPrice,
    [cartTotal, shippingPrice]
  );

  const isFreeShipping = cartTotal >= 69;

  function setFieldTouched(fieldName) {
    setTouchedFields((prev) => ({
      ...prev,
      [fieldName]: true,
    }));
  }

  function setSingleFieldError(fieldName, value) {
    const nextError = validateSingleField(fieldName, value);

    setFieldErrors((prev) => ({
      ...prev,
      [fieldName]: nextError,
    }));

    return nextError;
  }

  function handleContactChange(event) {
    const { name, value } = event.target;

    let nextValue = value;

    if (name === 'email') {
      nextValue = value.replace(/\s+/g, '');
    }

    if (name === 'phone') {
      nextValue = normalizePhoneOnChange(value);
    }

    setContact((prev) => ({ ...prev, [name]: nextValue }));

    if (touchedFields[name]) {
      setSingleFieldError(name, nextValue);
    }

    setSubmitError('');
    setSubmitInfo('');
  }

  function handleShippingChange(event) {
    const { name, value } = event.target;

    let nextValue = value;

    if (name === 'zip') {
      nextValue = normalizePostalCode(value);
    }

    setShipping((prev) => ({ ...prev, [name]: nextValue }));

    if (touchedFields[name]) {
      setSingleFieldError(name, nextValue);
    }

    setSubmitError('');
    setSubmitInfo('');
  }

  function handleContactBlur(event) {
    const { name, value } = event.target;

    setFieldTouched(name);

    let normalizedValue = value;

    if (name === 'firstName' || name === 'lastName') {
      normalizedValue = normalizeText(value);
    }

    if (name === 'email') {
      normalizedValue = normalizeEmail(value);
    }

    if (name === 'phone') {
      normalizedValue = normalizePhoneOnBlur(value);
    }

    setContact((prev) => ({
      ...prev,
      [name]: normalizedValue,
    }));

    setSingleFieldError(name, normalizedValue);
  }

  function handleShippingBlur(event) {
    const { name, value } = event.target;

    setFieldTouched(name);

    let normalizedValue = value;

    if (name === 'address' || name === 'city') {
      normalizedValue = normalizeText(value);
    }

    if (name === 'zip') {
      normalizedValue = normalizePostalCode(value);
    }

    if (name === 'country') {
      normalizedValue = normalizeCountry(value);
    }

    setShipping((prev) => ({
      ...prev,
      [name]: normalizedValue,
    }));

    setSingleFieldError(name, normalizedValue);
  }

  function validateForm() {
    const trimmedContact = {
      firstName: normalizeText(contact.firstName),
      lastName: normalizeText(contact.lastName),
      email: normalizeEmail(contact.email),
      phone: normalizePhoneOnBlur(contact.phone),
    };

    const trimmedShipping = {
      address: normalizeText(shipping.address),
      zip: normalizePostalCode(shipping.zip),
      city: normalizeText(shipping.city),
      country: normalizeCountry(shipping.country),
    };

    const nextErrors = {
      firstName: validateSingleField('firstName', trimmedContact.firstName),
      lastName: validateSingleField('lastName', trimmedContact.lastName),
      email: validateSingleField('email', trimmedContact.email),
      phone: validateSingleField('phone', trimmedContact.phone),
      address: validateSingleField('address', trimmedShipping.address),
      zip: validateSingleField('zip', trimmedShipping.zip),
      city: validateSingleField('city', trimmedShipping.city),
      country: validateSingleField('country', trimmedShipping.country),
    };

    setContact(trimmedContact);
    setShipping(trimmedShipping);
    setFieldErrors(nextErrors);
    setTouchedFields({
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      address: true,
      zip: true,
      city: true,
      country: true,
    });

    return {
      isValid: !Object.values(nextErrors).some(Boolean),
      trimmedContact,
      trimmedShipping,
      nextErrors,
    };
  }

  async function syncProfileIfNeeded(trimmedContact, trimmedShipping) {
    if (!isAuthenticated || !user?.id) {
      return;
    }

    const normalizedCurrent = {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
      addressLine1: user.addressLine1 || '',
      postalCode: user.postalCode || '',
      city: user.city || '',
      country: user.country || 'France',
    };

    const normalizedNext = {
      firstName: trimmedContact.firstName,
      lastName: trimmedContact.lastName,
      email: trimmedContact.email,
      phone: trimmedContact.phone,
      addressLine1: trimmedShipping.address,
      postalCode: trimmedShipping.zip,
      city: trimmedShipping.city,
      country: trimmedShipping.country,
    };

    const hasChanges =
      normalizedCurrent.firstName !== normalizedNext.firstName ||
      normalizedCurrent.lastName !== normalizedNext.lastName ||
      normalizedCurrent.email !== normalizedNext.email ||
      normalizedCurrent.phone !== normalizedNext.phone ||
      normalizedCurrent.addressLine1 !== normalizedNext.addressLine1 ||
      normalizedCurrent.postalCode !== normalizedNext.postalCode ||
      normalizedCurrent.city !== normalizedNext.city ||
      normalizedCurrent.country !== normalizedNext.country;

    if (!hasChanges) {
      return;
    }

    const response = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: user.id,
        firstName: normalizedNext.firstName,
        lastName: normalizedNext.lastName,
        email: normalizedNext.email,
        phone: normalizedNext.phone,
        addressLine1: normalizedNext.addressLine1,
        addressLine2: user.addressLine2 || '',
        postalCode: normalizedNext.postalCode,
        city: normalizedNext.city,
        country: normalizedNext.country,
      }),
    });

    const data = await parseJsonSafely(response);

    if (!response.ok) {
      throw new Error(
        data?.message ||
          'Impossible de mettre à jour les informations du compte avant le paiement.'
      );
    }

    if (data?.user) {
      updateUser(data.user);
    }
  }

  async function handleCheckout() {
    if (!canAttemptCheckout) return;

    setSubmitError('');
    setSubmitInfo('');

    const { isValid, trimmedContact, trimmedShipping, nextErrors } =
      validateForm();

    if (!isValid) {
      setSubmitError(
        'Merci de corriger les champs obligatoires avant de continuer.'
      );
      focusFirstInvalidField(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitInfo('Préparation de votre commande...');

    try {
      await syncProfileIfNeeded(trimmedContact, trimmedShipping);

      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items.map((item) => ({
            slug: item.slug,
            name: item.name,
            color: item.color || '',
            quantity: item.quantity,
            price: item.price,
          })),
          customer: {
            firstName: trimmedContact.firstName,
            lastName: trimmedContact.lastName,
            email: trimmedContact.email,
            phone: trimmedContact.phone,
          },
          shipping: {
            address: trimmedShipping.address,
            city: trimmedShipping.city,
            zip: trimmedShipping.zip,
            country: trimmedShipping.country,
          },
          deliveryMethod: normalizedDeliveryMethod,
          parcelSize,
          notes: notes.trim(),
        }),
      });

      const data = await parseJsonSafely(response);

      if (!response.ok) {
        setSubmitInfo('');
        setSubmitError(getCheckoutErrorMessage(data, response.status));
        return;
      }

      if (data?.ok && data?.url) {
        window.location.href = data.url;
        return;
      }

      setSubmitInfo('');
      setSubmitError(
        data?.message ||
          'Une erreur inattendue est survenue lors de la préparation du paiement.'
      );
    } catch (error) {
      setSubmitInfo('');
      setSubmitError(
        error?.message ||
          'Impossible de contacter le serveur de paiement. Merci de réessayer plus tard.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const cartLines = useMemo(
    () =>
      items.map((item) => (
        <div key={buildCartLineKey(item)} className={styles.itemRow}>
          <div className={styles.itemImageWrapper}>
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                className={styles.itemImage}
              />
            ) : (
              <div
                className={styles.itemImageFallback}
                aria-label={item.name}
                role="img"
              >
                <span className={styles.itemImageFallbackText}>VB</span>
              </div>
            )}
          </div>

          <div className={styles.itemContent}>
            <p className={styles.itemName}>{item.name}</p>
            {item.color && (
              <p className={styles.itemMeta}>Couleur : {item.color}</p>
            )}
            <p className={styles.itemMeta}>Quantité : {item.quantity}</p>
          </div>

          <p className={styles.itemPrice}>
            {(item.price * item.quantity).toFixed(2)} €
          </p>
        </div>
      )),
    [items]
  );

  return (
    <>
      <Head>
        <title>Panier - Crackers by VB</title>
      </Head>

      <Header />

      <main className={internalStyles.page}>
        <div className={internalStyles.container}>
          <Link href="/boutique" legacyBehavior>
            <a className={internalStyles.backLink}>
              <span className={internalStyles.backLinkContent}>
                <FiArrowLeft aria-hidden="true" />
                Retour à la boutique
              </span>
            </a>
          </Link>

          <header className={internalStyles.pageIntro}>
            <h1 className={internalStyles.pageTitle}>Finaliser ma commande</h1>
          </header>

          {!hasItems && (
            <section className={internalStyles.card}>
              <p className={styles.emptyTitle}>Votre panier est vide</p>
              <p className={styles.emptyText}>
                Ajoutez quelques créations à votre panier avant de passer à la
                commande.
              </p>
              <Link href="/boutique" legacyBehavior>
                <a className={internalStyles.primaryButton}>
                  Découvrir la boutique
                </a>
              </Link>
            </section>
          )}

          {hasItems && (
            <>
              {(submitError || submitInfo) && (
                <section className={internalStyles.card}>
                  {submitError && (
                    <p className={styles.errorMessage} role="alert">
                      {submitError}
                    </p>
                  )}
                  {submitInfo && (
                    <p className={styles.infoMessage}>{submitInfo}</p>
                  )}
                </section>
              )}

              <div className={styles.layout}>
                <div className={styles.mainColumn}>
                  <section className={internalStyles.card}>
                    <h2 className={styles.sectionTitle}>
                      Informations de contact
                    </h2>

                    <div className={styles.formStack}>
                      <div className={styles.formBlock}>
                        <div className={styles.gridTwo}>
                          <div className={internalStyles.formGroup}>
                            <label
                              htmlFor="contact-firstName"
                              className={internalStyles.label}
                            >
                              Prénom
                            </label>
                            <input
                              id="contact-firstName"
                              name="firstName"
                              type="text"
                              autoComplete="given-name"
                              className={`${internalStyles.input} ${
                                fieldErrors.firstName ? styles.inputError : ''
                              }`}
                              value={contact.firstName}
                              onChange={handleContactChange}
                              onBlur={handleContactBlur}
                            />
                            {fieldErrors.firstName && (
                              <p className={styles.fieldError} role="alert">
                                {fieldErrors.firstName}
                              </p>
                            )}
                          </div>

                          <div className={internalStyles.formGroup}>
                            <label
                              htmlFor="contact-lastName"
                              className={internalStyles.label}
                            >
                              Nom
                            </label>
                            <input
                              id="contact-lastName"
                              name="lastName"
                              type="text"
                              autoComplete="family-name"
                              className={`${internalStyles.input} ${
                                fieldErrors.lastName ? styles.inputError : ''
                              }`}
                              value={contact.lastName}
                              onChange={handleContactChange}
                              onBlur={handleContactBlur}
                            />
                            {fieldErrors.lastName && (
                              <p className={styles.fieldError} role="alert">
                                {fieldErrors.lastName}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className={styles.formBlock}>
                        <div className={internalStyles.formGroup}>
                          <label
                            htmlFor="contact-email"
                            className={internalStyles.label}
                          >
                            Adresse email
                          </label>
                          <input
                            id="contact-email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            className={`${internalStyles.input} ${
                              fieldErrors.email ? styles.inputError : ''
                            }`}
                            value={contact.email}
                            onChange={handleContactChange}
                            onBlur={handleContactBlur}
                          />
                          {fieldErrors.email && (
                            <p className={styles.fieldError} role="alert">
                              {fieldErrors.email}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className={styles.formBlock}>
                        <div className={internalStyles.formGroup}>
                          <label
                            htmlFor="contact-phone"
                            className={internalStyles.label}
                          >
                            Téléphone
                          </label>
                          <input
                            id="contact-phone"
                            name="phone"
                            type="tel"
                            autoComplete="tel"
                            className={`${internalStyles.input} ${
                              fieldErrors.phone ? styles.inputError : ''
                            }`}
                            value={contact.phone}
                            onChange={handleContactChange}
                            onBlur={handleContactBlur}
                          />
                          {fieldErrors.phone && (
                            <p className={styles.fieldError} role="alert">
                              {fieldErrors.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className={internalStyles.card}>
                    <h2 className={styles.sectionTitle}>Adresse de livraison</h2>

                    <div className={styles.formStack}>
                      <div className={styles.formBlock}>
                        <div className={internalStyles.formGroup}>
                          <label
                            htmlFor="shipping-address"
                            className={internalStyles.label}
                          >
                            Adresse
                          </label>
                          <input
                            id="shipping-address"
                            name="address"
                            type="text"
                            autoComplete="street-address"
                            className={`${internalStyles.input} ${
                              fieldErrors.address ? styles.inputError : ''
                            }`}
                            value={shipping.address}
                            onChange={handleShippingChange}
                            onBlur={handleShippingBlur}
                          />
                          {fieldErrors.address && (
                            <p className={styles.fieldError} role="alert">
                              {fieldErrors.address}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className={styles.formBlock}>
                        <div className={styles.gridTwo}>
                          <div className={internalStyles.formGroup}>
                            <label
                              htmlFor="shipping-zip"
                              className={internalStyles.label}
                            >
                              Code postal
                            </label>
                            <input
                              id="shipping-zip"
                              name="zip"
                              type="text"
                              inputMode="numeric"
                              autoComplete="postal-code"
                              className={`${internalStyles.input} ${
                                fieldErrors.zip ? styles.inputError : ''
                              }`}
                              value={shipping.zip}
                              onChange={handleShippingChange}
                              onBlur={handleShippingBlur}
                            />
                            {fieldErrors.zip && (
                              <p className={styles.fieldError} role="alert">
                                {fieldErrors.zip}
                              </p>
                            )}
                          </div>

                          <div className={internalStyles.formGroup}>
                            <label
                              htmlFor="shipping-city"
                              className={internalStyles.label}
                            >
                              Ville
                            </label>
                            <input
                              id="shipping-city"
                              name="city"
                              type="text"
                              autoComplete="address-level2"
                              className={`${internalStyles.input} ${
                                fieldErrors.city ? styles.inputError : ''
                              }`}
                              value={shipping.city}
                              onChange={handleShippingChange}
                              onBlur={handleShippingBlur}
                            />
                            {fieldErrors.city && (
                              <p className={styles.fieldError} role="alert">
                                {fieldErrors.city}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className={styles.formBlock}>
                        <div className={internalStyles.formGroup}>
                          <label
                            htmlFor="shipping-country"
                            className={internalStyles.label}
                          >
                            Pays
                          </label>
                          <input
                            id="shipping-country"
                            name="country"
                            type="text"
                            autoComplete="country-name"
                            className={`${internalStyles.input} ${
                              fieldErrors.country ? styles.inputError : ''
                            }`}
                            value={shipping.country}
                            onChange={handleShippingChange}
                            onBlur={handleShippingBlur}
                          />
                          {fieldErrors.country && (
                            <p className={styles.fieldError} role="alert">
                              {fieldErrors.country}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className={internalStyles.card}>
                    <h2 className={styles.sectionTitle}>Mode de livraison</h2>

                    <div className={styles.deliveryMethods}>
                      <button
                        type="button"
                        className={`${styles.deliveryOption} ${
                          normalizedDeliveryMethod === 'relay'
                            ? styles.deliveryOptionActive
                            : ''
                        }`}
                        onClick={() => {
                          setDeliveryMethod('relay');
                          setSubmitError('');
                          setSubmitInfo('');
                        }}
                      >
                        <span className={styles.deliveryOptionTop}>
                          <span className={styles.deliveryOptionTitle}>
                            Point relais
                          </span>
                          <span className={styles.deliveryOptionPrice}>
                            {isFreeShipping
                              ? 'Offert'
                              : parcelSize === 'medium'
                              ? '5,90 €'
                              : '4,90 €'}
                          </span>
                        </span>
                        <span className={styles.deliveryOptionText}>
                          Retrait en point relais, pratique pour les petits envois.
                        </span>
                      </button>

                      <button
                        type="button"
                        className={`${styles.deliveryOption} ${
                          normalizedDeliveryMethod === 'home'
                            ? styles.deliveryOptionActive
                            : ''
                        }`}
                        onClick={() => {
                          setDeliveryMethod('home');
                          setSubmitError('');
                          setSubmitInfo('');
                        }}
                      >
                        <span className={styles.deliveryOptionTop}>
                          <span className={styles.deliveryOptionTitle}>
                            Livraison à domicile
                          </span>
                          <span className={styles.deliveryOptionPrice}>
                            {isFreeShipping
                              ? 'Offert'
                              : parcelSize === 'medium'
                              ? '8,90 €'
                              : '7,90 €'}
                          </span>
                        </span>
                        <span className={styles.deliveryOptionText}>
                          Livraison directement à l’adresse indiquée.
                        </span>
                      </button>
                    </div>

                    <div className={styles.deliveryInfoBox}>
                      <p className={styles.deliveryInfoTitle}>
                        Règles de livraison
                      </p>
                      <p className={styles.deliveryInfoText}>
                        {getParcelLabel(parcelSize)} pour ce panier ({totalItems}{' '}
                        article{totalItems > 1 ? 's' : ''}).
                      </p>
                      <p className={styles.deliveryInfoText}>
                        Livraison offerte dès 69,00 € d’achat.
                      </p>
                    </div>
                  </section>

                  <section className={internalStyles.card}>
                    <h2 className={styles.sectionTitle}>
                      Notes de commande{' '}
                      <span className={styles.sectionOptional}>(optionnel)</span>
                    </h2>

                    <div className={internalStyles.formGroup}>
                      <label
                        htmlFor="order-notes"
                        className={internalStyles.label}
                      >
                        Instructions spéciales, préférences de livraison...
                      </label>
                      <textarea
                        id="order-notes"
                        name="order-notes"
                        className={internalStyles.textarea}
                        rows={4}
                        value={notes}
                        onChange={(event) => {
                          setNotes(event.target.value);
                          setSubmitError('');
                          setSubmitInfo('');
                        }}
                      />
                    </div>
                  </section>

                  <section className={internalStyles.card}>
                    <h2 className={styles.sectionTitle}>Mode de paiement</h2>
                    <div className={styles.paymentInfoBox}>
                      <p className={styles.paymentTitle}>
                        Paiement sécurisé par Stripe
                      </p>
                      <p className={styles.paymentText}>
                        Après validation, vous serez redirigée vers la page de
                        paiement sécurisée de Stripe pour régler votre commande.
                      </p>
                    </div>
                  </section>

                  <div className={styles.submitWrapper}>
                    <button
                      type="button"
                      className={`${internalStyles.primaryButton} ${styles.submitButton}`}
                      onClick={handleCheckout}
                      disabled={isSubmitting || !hasItems}
                    >
                      {isSubmitting
                        ? 'Préparation du paiement...'
                        : `Confirmer la commande · ${estimatedTotal.toFixed(2)} €`}
                    </button>
                    <p className={styles.submitHint}>
                      Le montant final inclut les frais de port sélectionnés avant
                      redirection vers Stripe.
                    </p>
                  </div>
                </div>

                <aside className={styles.summaryColumn}>
                  <section
                    className={`${internalStyles.card} ${styles.summaryCard}`}
                  >
                    <div className={styles.summaryHeader}>
                      <h2 className={styles.sectionTitle}>Récapitulatif</h2>
                      <span className={styles.summaryBadge}>
                        {totalItems} article{totalItems > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className={styles.itemsList}>{cartLines}</div>

                    <div className={styles.summaryTotals}>
                      <div className={styles.summaryRow}>
                        <span>Sous-total</span>
                        <span>{cartTotal.toFixed(2)} €</span>
                      </div>

                      <div className={styles.summaryRow}>
                        <span>
                          Frais de port ({getDeliveryMethodLabel(normalizedDeliveryMethod)})
                        </span>
                        <span>
                          {isFreeShipping
                            ? 'Offert'
                            : `${shippingPrice.toFixed(2)} €`}
                        </span>
                      </div>

                      <div className={styles.summaryRowTotal}>
                        <span>Total estimé</span>
                        <span>{estimatedTotal.toFixed(2)} €</span>
                      </div>
                    </div>

                    <div className={styles.summaryBottomNote}>
                      {isFreeShipping
                        ? 'La livraison est offerte pour cette commande.'
                        : `${getParcelLabel(parcelSize)} appliqué pour ce panier.`}
                    </div>
                  </section>
                </aside>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}