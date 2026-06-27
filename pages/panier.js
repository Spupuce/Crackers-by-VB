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

  const cartLines = useMemo(
    () =>
      items.map((item) => (
        <li key={buildCartLineKey(item)} className={styles.cartLine}>
          <div className={styles.cartLineImageWrapper}>
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                className={styles.cartLineImage}
              />
            ) : (
              <div className={styles.cartLineImagePlaceholder} />
            )}
          </div>
          <div className={styles.cartLineContent}>
            <div className={styles.cartLineHeader}>
              <p className={styles.cartLineTitle}>{item.name}</p>
              <p className={styles.cartLinePrice}>
                {item.price.toFixed(2)} €
              </p>
            </div>
            {item.color && (
              <p className={styles.cartLineMeta}>
                Couleur : <span className={styles.cartLineMetaValue}>{item.color}</span>
              </p>
            )}
            <p className={styles.cartLineMeta}>
              Quantité :{' '}
              <span className={styles.cartLineMetaValue}>{item.quantity}</span>
            </p>
          </div>
        </li>
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
                  <section
                    className={internalStyles.card}
                    aria-labelledby="contact-section-title"
                  >
                    <div className={styles.sectionHeader}>
                      <h2
                        id="contact-section-title"
                        className={internalStyles.cardTitle}
                      >
                        Informations de contact
                      </h2>
                      <p className={internalStyles.cardSubtitle}>
                        Ces informations permettent de vous envoyer les
                        confirmations liées à votre commande.
                      </p>
                    </div>

                    <div className={styles.formGrid}>
                      <div className={styles.formField}>
                        <label
                          htmlFor="contact-firstName"
                          className={styles.label}
                        >
                          Prénom
                        </label>
                        <input
                          id="contact-firstName"
                          name="firstName"
                          type="text"
                          autoComplete="given-name"
                          className={`${styles.input} ${
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

                      <div className={styles.formField}>
                        <label
                          htmlFor="contact-lastName"
                          className={styles.label}
                        >
                          Nom
                        </label>
                        <input
                          id="contact-lastName"
                          name="lastName"
                          type="text"
                          autoComplete="family-name"
                          className={`${styles.input} ${
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

                      <div className={styles.formField}>
                        <label htmlFor="contact-email" className={styles.label}>
                          Adresse email
                        </label>
                        <input
                          id="contact-email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          className={`${styles.input} ${
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

                      <div className={styles.formField}>
                        <label htmlFor="contact-phone" className={styles.label}>
                          Téléphone
                        </label>
                        <input
                          id="contact-phone"
                          name="phone"
                          type="tel"
                          autoComplete="tel"
                          className={`${styles.input} ${
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
                  </section>

                  <section
                    className={internalStyles.card}
                    aria-labelledby="shipping-section-title"
                  >
                    <div className={styles.sectionHeader}>
                      <h2
                        id="shipping-section-title"
                        className={internalStyles.cardTitle}
                      >
                        Adresse de livraison
                      </h2>
                      <p className={internalStyles.cardSubtitle}>
                        Cette adresse sera utilisée pour l&apos;expédition de
                        votre commande.
                      </p>
                    </div>

                    <div className={styles.formGrid}>
                      <div className={styles.formFieldFull}>
                        <label
                          htmlFor="shipping-address"
                          className={styles.label}
                        >
                          Adresse
                        </label>
                        <input
                          id="shipping-address"
                          name="address"
                          type="text"
                          autoComplete="street-address"
                          className={`${styles.input} ${
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

                      <div className={styles.formField}>
                        <label htmlFor="shipping-zip" className={styles.label}>
                          Code postal
                        </label>
                        <input
                          id="shipping-zip"
                          name="zip"
                          type="text"
                          inputMode="numeric"
                          autoComplete="postal-code"
                          className={`${styles.input} ${
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

                      <div className={styles.formField}>
                        <label htmlFor="shipping-city" className={styles.label}>
                          Ville
                        </label>
                        <input
                          id="shipping-city"
                          name="city"
                          type="text"
                          autoComplete="address-level2"
                          className={`${styles.input} ${
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

                      <div className={styles.formField}>
                        <label
                          htmlFor="shipping-country"
                          className={styles.label}
                        >
                          Pays
                        </label>
                        <input
                          id="shipping-country"
                          name="country"
                          type="text"
                          autoComplete="country-name"
                          className={`${styles.input} ${
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
                  </section>

                  <section
                    className={internalStyles.card}
                    aria-labelledby="notes-section-title"
                  >
                    <div className={styles.sectionHeader}>
                      <h2
                        id="notes-section-title"
                        className={internalStyles.cardTitle}
                      >
                        Message pour la créatrice (optionnel)
                      </h2>
                      <p className={internalStyles.cardSubtitle}>
                        Vous pouvez laisser un petit mot ou une précision
                        particulière concernant votre commande.
                      </p>
                    </div>

                    <div className={styles.formFieldFull}>
                      <label htmlFor="order-notes" className={styles.label}>
                        Message
                      </label>
                      <textarea
                        id="order-notes"
                        name="notes"
                        rows={4}
                        className={styles.textarea}
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
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={internalStyles.primaryButton}
                        onClick={handleCheckout}
                        disabled={!canAttemptCheckout}
                      >
                        {isSubmitting
                          ? 'Redirection vers le paiement en cours...'
                          : 'Procéder au paiement'}
                      </button>
                      <p className={styles.paymentHint}>
                        Vous serez redirigée vers une page de paiement sécurisée
                        Stripe.
                      </p>
                    </div>
                  </section>
                </div>

                <aside className={styles.summaryColumn}>
                  <section
                    className={internalStyles.card}
                    aria-labelledby="summary-section-title"
                  >
                    <h2
                      id="summary-section-title"
                      className={internalStyles.cardTitle}
                    >
                      Récapitulatif du panier
                    </h2>

                    <p className={styles.summaryCount}>
                      {totalItems} article{totalItems > 1 ? 's' : ''}
                    </p>

                    <ul className={styles.cartLines}>{cartLines}</ul>

                    <div className={styles.summaryTotals}>
                      <div className={styles.summaryRow}>
                        <span>Sous-total</span>
                        <span>{cartTotal.toFixed(2)} €</span>
                      </div>

                      <div className={styles.summaryRow}>
                        <span>Frais de livraison</span>
                        <span>À définir avant la mise en production</span>
                      </div>

                      <div className={styles.summaryTotalRow}>
                        <span>Total estimé</span>
                        <span>{cartTotal.toFixed(2)} €</span>
                      </div>
                    </div>

                    <p className={styles.summaryNote}>
                      Le montant final incluant les frais de livraison sera
                      précisé lors de la mise en production du site.
                    </p>
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