// pages/panier.js

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiArrowLeft } from 'react-icons/fi';
import Header from '../components/Header';
import Footer from '../components/Footer';
import CartContactForm from '../components/CartContactForm';
import CartShippingForm from '../components/CartShippingForm';
import CartSummary from '../components/CartSummary';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import internalStyles from '../styles/InternalPages.module.css';
import styles from '../styles/CartPage.module.css';
import {
  computeShippingAmount,
  getParcelSizeFromItems,
  normalizeDeliveryMethod,
} from '../utils/shipping';
import {
  buildCartLineKey,
  buildInitialContact,
  buildInitialErrors,
  buildInitialShipping,
  buildInitialTouched,
  focusFirstInvalidField,
  getCheckoutErrorMessage,
  getDeliveryMethodLabel,
  getParcelLabel,
  normalizeCountry,
  normalizeEmail,
  normalizePhoneOnBlur,
  normalizePhoneOnChange,
  normalizePostalCode,
  normalizeText,
  parseJsonSafely,
  validateSingleField,
} from '../utils/cartValidation';

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

  // submitError = message visible côté cliente (formulaire, serveur, paiement annulé, etc.)
  const [submitError, setSubmitError] = useState('');
  // submitInfo = message d’information (préparation commande, info non bloquante)
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
      // Cas d’annulation du paiement côté Stripe → message clair pour la cliente
      setSubmitError(
        'Vous avez annulé le paiement. Votre panier est toujours disponible si vous souhaitez finaliser votre commande plus tard.'
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

    // On repart sur une base propre à chaque tentative
    setSubmitError('');
    setSubmitInfo('');

    const { isValid, trimmedContact, trimmedShipping, nextErrors } =
      validateForm();

    if (!isValid) {
      // Cas 1 : erreur de formulaire côté cliente
      setSubmitError(
        'Merci de corriger les champs obligatoires avant de continuer.'
      );
      focusFirstInvalidField(nextErrors);
      return;
    }

    setIsSubmitting(true);
    // Cas 2 : information de préparation de commande avant Stripe
    setSubmitInfo('Préparation de votre commande et du paiement sécurisé...');

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
        // Cas 3 : erreur technique avant la redirection Stripe / incohérence panier
        setSubmitInfo('');
        setSubmitError(getCheckoutErrorMessage(data, response.status));
        return;
      }

      if (data?.ok && data?.url) {
        window.location.href = data.url;
        return;
      }

      // Cas 4 : réponse inattendue de l’API de paiement
      setSubmitInfo('');
      setSubmitError(
        data?.message ||
          'Une erreur inattendue est survenue lors de la préparation du paiement.'
      );
    } catch (error) {
      // Cas 5 : impossibilité de contacter le serveur de paiement
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
                  <CartContactForm
                    contact={contact}
                    fieldErrors={fieldErrors}
                    handleContactChange={handleContactChange}
                    handleContactBlur={handleContactBlur}
                  />

                  <CartShippingForm
                    shipping={shipping}
                    fieldErrors={fieldErrors}
                    handleShippingChange={handleShippingChange}
                    handleShippingBlur={handleShippingBlur}
                  />

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
                          Retrait en point relais, pratique pour les petits
                          envois.
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
                        paiement sécurisée de Stripe pour régler votre
                        commande.
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
                      Le montant final inclut les frais de port sélectionnés
                      avant redirection vers Stripe.
                    </p>
                  </div>
                </div>

                <CartSummary
                  totalItems={totalItems}
                  cartLines={cartLines}
                  cartTotal={cartTotal}
                  normalizedDeliveryMethod={normalizedDeliveryMethod}
                  shippingPrice={shippingPrice}
                  estimatedTotal={estimatedTotal}
                  isFreeShipping={isFreeShipping}
                  parcelSize={parcelSize}
                  getDeliveryMethodLabel={getDeliveryMethodLabel}
                  getParcelLabel={getParcelLabel}
                />
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}