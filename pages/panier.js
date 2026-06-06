// pages/panier.js

import { useEffect, useMemo, useRef, useState } from 'react';
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

const phoneRegex = /^(?:(?:\+33|0)[1-9](?:[ .-]?\d{2}){4})$/;
const postalCodeRegex = /^\d{5}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

export default function PanierPage() {
  const router = useRouter();
  const { items, cartTotal, clearCart } = useCart();
  const { user, isAuthenticated, updateUser } = useAuth();

  const hasHandledCheckoutSuccessRef = useRef(false);

  const hasItems = Array.isArray(items) && items.length > 0;

  const [contact, setContact] = useState(buildInitialContact(user));
  const [shipping, setShipping] = useState(buildInitialShipping(user));
  const [notes, setNotes] = useState('');
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

    if (checkoutStatus === 'success') {
      if (!hasHandledCheckoutSuccessRef.current) {
        clearCart();
        hasHandledCheckoutSuccessRef.current = true;
      }

      setSubmitInfo(
        'Votre paiement a bien été enregistré. Merci pour votre commande !'
      );
      setSubmitError('');
    }

    if (checkoutStatus === 'cancel') {
      setSubmitError(
        'Le paiement a été interrompu avant validation. Vous pouvez réessayer à tout moment.'
      );
      setSubmitInfo('');
    }

    if (checkoutStatus !== 'success') {
      hasHandledCheckoutSuccessRef.current = false;
    }

    if (checkoutStatus === 'success' || checkoutStatus === 'cancel') {
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
  }, [router.isReady, router.pathname, router.query, router, clearCart]);

  const canAttemptCheckout = useMemo(
    () => hasItems && !isSubmitting,
    [hasItems, isSubmitting]
  );

  const totalItems = useMemo(
    () =>
      items.reduce((accumulator, item) => accumulator + (item.quantity || 0), 0),
    [items]
  );

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

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        data?.message ||
          'Impossible de mettre à jour les informations du compte.'
      );
    }

    if (data?.user) {
      updateUser(data.user);
    }
  }

  async function handleCheckout() {
    if (!canAttemptCheckout) return;

    if (!isAuthenticated || !user?.id) {
      setSubmitInfo('');
      setSubmitError(
        'Vous devez être connectée pour finaliser votre commande.'
      );

      router.push('/connexion');
      return;
    }

    setSubmitError('');
    setSubmitInfo('');

    const { isValid, trimmedContact, trimmedShipping, nextErrors } = validateForm();

    if (!isValid) {
      setSubmitError(
        'Merci de corriger les champs obligatoires avant de continuer.'
      );
      focusFirstInvalidField(nextErrors);
      return;
    }

    setIsSubmitting(true);

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
          notes: notes.trim(),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setSubmitError(
          data?.message ||
            'Une erreur est survenue lors de la préparation du paiement.'
        );
        return;
      }

      if (data?.ok && data?.url) {
        window.location.href = data.url;
        return;
      }

      setSubmitError(
        data?.message ||
          'Une erreur inattendue est survenue lors de la préparation du paiement.'
      );
    } catch (error) {
      setSubmitError(
        error?.message ||
          'Impossible de contacter le serveur de paiement. Merci de réessayer plus tard.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Head>
        <title>Panier - Crackers by VB</title>
      </Head>

      <Header />

      <main className={internalStyles.page}>
        <div className={internalStyles.container}>
          <Link href="/" legacyBehavior>
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
                              className={`${internalStyles.input} ${
                                fieldErrors.firstName ? styles.inputError : ''
                              }`}
                              type="text"
                              autoComplete="given-name"
                              value={contact.firstName}
                              onChange={handleContactChange}
                              onBlur={handleContactBlur}
                              aria-invalid={Boolean(fieldErrors.firstName)}
                              aria-describedby={
                                fieldErrors.firstName
                                  ? 'contact-firstName-error'
                                  : undefined
                              }
                            />
                            {fieldErrors.firstName && (
                              <p
                                id="contact-firstName-error"
                                className={styles.fieldError}
                                role="alert"
                              >
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
                              className={`${internalStyles.input} ${
                                fieldErrors.lastName ? styles.inputError : ''
                              }`}
                              type="text"
                              autoComplete="family-name"
                              value={contact.lastName}
                              onChange={handleContactChange}
                              onBlur={handleContactBlur}
                              aria-invalid={Boolean(fieldErrors.lastName)}
                              aria-describedby={
                                fieldErrors.lastName
                                  ? 'contact-lastName-error'
                                  : undefined
                              }
                            />
                            {fieldErrors.lastName && (
                              <p
                                id="contact-lastName-error"
                                className={styles.fieldError}
                                role="alert"
                              >
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
                            Email
                          </label>
                          <input
                            id="contact-email"
                            name="email"
                            className={`${internalStyles.input} ${
                              fieldErrors.email ? styles.inputError : ''
                            }`}
                            type="email"
                            autoComplete="email"
                            value={contact.email}
                            onChange={handleContactChange}
                            onBlur={handleContactBlur}
                            aria-invalid={Boolean(fieldErrors.email)}
                            aria-describedby={
                              fieldErrors.email
                                ? 'contact-email-error'
                                : undefined
                            }
                          />
                          {fieldErrors.email && (
                            <p
                              id="contact-email-error"
                              className={styles.fieldError}
                              role="alert"
                            >
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
                            className={`${internalStyles.input} ${
                              fieldErrors.phone ? styles.inputError : ''
                            }`}
                            type="tel"
                            autoComplete="tel"
                            value={contact.phone}
                            onChange={handleContactChange}
                            onBlur={handleContactBlur}
                            aria-invalid={Boolean(fieldErrors.phone)}
                            aria-describedby={
                              fieldErrors.phone
                                ? 'contact-phone-error'
                                : undefined
                            }
                          />
                          {fieldErrors.phone && (
                            <p
                              id="contact-phone-error"
                              className={styles.fieldError}
                              role="alert"
                            >
                              {fieldErrors.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className={internalStyles.card}>
                    <h2 className={styles.sectionTitle}>
                      Adresse de livraison
                    </h2>

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
                            className={`${internalStyles.input} ${
                              fieldErrors.address ? styles.inputError : ''
                            }`}
                            type="text"
                            autoComplete="street-address"
                            value={shipping.address}
                            onChange={handleShippingChange}
                            onBlur={handleShippingBlur}
                            aria-invalid={Boolean(fieldErrors.address)}
                            aria-describedby={
                              fieldErrors.address
                                ? 'shipping-address-error'
                                : undefined
                            }
                          />
                          {fieldErrors.address && (
                            <p
                              id="shipping-address-error"
                              className={styles.fieldError}
                              role="alert"
                            >
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
                              className={`${internalStyles.input} ${
                                fieldErrors.zip ? styles.inputError : ''
                              }`}
                              type="text"
                              inputMode="numeric"
                              autoComplete="postal-code"
                              value={shipping.zip}
                              onChange={handleShippingChange}
                              onBlur={handleShippingBlur}
                              aria-invalid={Boolean(fieldErrors.zip)}
                              aria-describedby={
                                fieldErrors.zip
                                  ? 'shipping-zip-error'
                                  : undefined
                              }
                            />
                            {fieldErrors.zip && (
                              <p
                                id="shipping-zip-error"
                                className={styles.fieldError}
                                role="alert"
                              >
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
                              className={`${internalStyles.input} ${
                                fieldErrors.city ? styles.inputError : ''
                              }`}
                              type="text"
                              autoComplete="address-level2"
                              value={shipping.city}
                              onChange={handleShippingChange}
                              onBlur={handleShippingBlur}
                              aria-invalid={Boolean(fieldErrors.city)}
                              aria-describedby={
                                fieldErrors.city
                                  ? 'shipping-city-error'
                                  : undefined
                              }
                            />
                            {fieldErrors.city && (
                              <p
                                id="shipping-city-error"
                                className={styles.fieldError}
                                role="alert"
                              >
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
                            className={`${internalStyles.input} ${
                              fieldErrors.country ? styles.inputError : ''
                            }`}
                            type="text"
                            value={shipping.country}
                            onChange={handleShippingChange}
                            onBlur={handleShippingBlur}
                            aria-invalid={Boolean(fieldErrors.country)}
                            aria-describedby={
                              fieldErrors.country
                                ? 'shipping-country-error'
                                : undefined
                            }
                          />
                          {fieldErrors.country && (
                            <p
                              id="shipping-country-error"
                              className={styles.fieldError}
                              role="alert"
                            >
                              {fieldErrors.country}
                            </p>
                          )}
                        </div>
                      </div>
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
                        paiement sécurisée de Stripe pour régler votre
                        commande.
                      </p>
                    </div>
                  </section>

                  <section className={internalStyles.card}>
                    <h2 className={styles.sectionTitle}>
                      Notes de commande{' '}
                      <span className={styles.sectionOptional}>
                        (optionnel)
                      </span>
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
                        onChange={(e) => setNotes(e.target.value)}
                      />
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
                        : `Confirmer la commande · ${cartTotal.toFixed(2)} €`}
                    </button>
                    <p className={styles.submitHint}>
                      Le montant final et les frais de port seront confirmés sur
                      la page de paiement Stripe.
                    </p>
                  </div>
                </div>

                <aside className={styles.summaryColumn}>
                  <section className={`${internalStyles.card} ${styles.summaryCard}`}>
                    <div className={styles.summaryHeader}>
                      <h2 className={styles.sectionTitle}>Récapitulatif</h2>
                      <span className={styles.summaryBadge}>
                        {totalItems} article{totalItems > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className={styles.itemsList}>
                      {items.map((item) => (
                        <div key={item.slug} className={styles.itemRow}>
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
                                <span className={styles.itemImageFallbackText}>
                                  VB
                                </span>
                              </div>
                            )}
                          </div>

                          <div className={styles.itemContent}>
                            <p className={styles.itemName}>{item.name}</p>
                            <p className={styles.itemMeta}>
                              Quantité : {item.quantity}
                            </p>
                          </div>

                          <p className={styles.itemPrice}>
                            {(item.price * item.quantity).toFixed(2)} €
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className={styles.summaryTotals}>
                      <div className={styles.summaryRow}>
                        <span>Sous-total</span>
                        <span>{cartTotal.toFixed(2)} €</span>
                      </div>
                      <div className={styles.summaryRow}>
                        <span>Frais de port</span>
                        <span>Calculés à l’étape Stripe</span>
                      </div>
                      <div className={styles.summaryRowTotal}>
                        <span>Total estimé</span>
                        <span>{cartTotal.toFixed(2)} €</span>
                      </div>
                    </div>

                    <div className={styles.summaryBottomNote}>
                      Paiement sécurisé et confirmation finale sur Stripe.
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