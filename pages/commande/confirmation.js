// pages/commande/confirmation.js

import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiArrowLeft } from 'react-icons/fi';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useCart } from '../../context/CartContext';
import internalStyles from '../../styles/InternalPages.module.css';

const MAX_CONFIRMATION_ATTEMPTS = 6;
const CONFIRMATION_RETRY_DELAY = 1500;

function wait(delay) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delay);
  });
}

function getDeliveryMethodLabel(method) {
  if (method === 'relay') {
    return 'Point relais';
  }

  if (method === 'home') {
    return 'Livraison à domicile';
  }

  return 'Livraison';
}

function getParcelSizeLabel(parcelSize) {
  if (parcelSize === 'small') {
    return 'Petit colis';
  }

  if (parcelSize === 'medium') {
    return 'Colis moyen';
  }

  return '';
}

function buildDeliverySummary(orderData) {
  const methodLabel = getDeliveryMethodLabel(orderData?.shipping?.method || '');
  const parcelSizeLabel = getParcelSizeLabel(orderData?.shipping?.parcelSize || '');

  if (methodLabel && parcelSizeLabel) {
    return `${methodLabel} - ${parcelSizeLabel}`;
  }

  if (methodLabel) {
    return methodLabel;
  }

  if (parcelSizeLabel) {
    return parcelSizeLabel;
  }

  return 'Livraison';
}

function getDeliveryFollowUpMessage(orderData) {
  const deliveryMethod = orderData?.shipping?.method || '';

  if (deliveryMethod === 'relay') {
    return 'Votre commande sera préparée puis déposée en point relais dès qu’elle sera prête.';
  }

  if (deliveryMethod === 'home') {
    return 'Votre commande sera préparée puis expédiée à votre adresse dès qu’elle sera prête.';
  }

  return 'Votre commande sera préparée puis confiée au transporteur dès qu’elle sera prête.';
}

function getSingleQueryParam(value) {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : '';
  }

  return typeof value === 'string' ? value : '';
}

function buildConfirmationFetchUrl(orderId, sessionId) {
  const searchParams = new URLSearchParams();

  if (sessionId) {
    searchParams.set('session_id', sessionId);
  }

  const queryString = searchParams.toString();

  return queryString
    ? `/api/orders/${orderId}?${queryString}`
    : `/api/orders/${orderId}`;
}

export default function ConfirmationCommandePage() {
  const router = useRouter();
  const { clearCart } = useCart();

  const hasClearedCartRef = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [confirmationError, setConfirmationError] = useState('');
  const [orderData, setOrderData] = useState(null);
  const [attemptCount, setAttemptCount] = useState(1);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const orderId = getSingleQueryParam(router.query?.orderId);
    const sessionId = getSingleQueryParam(router.query?.session_id);

    if (!orderId) {
      setConfirmationError(
        "Impossible de retrouver cette commande. Merci de vérifier le lien de confirmation."
      );
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function verifyOrder() {
      setIsLoading(true);
      setConfirmationError('');
      setOrderData(null);
      setAttemptCount(1);

      const confirmationUrl = buildConfirmationFetchUrl(orderId, sessionId);

      for (let attempt = 1; attempt <= MAX_CONFIRMATION_ATTEMPTS; attempt += 1) {
        if (!isMounted) {
          return;
        }

        setAttemptCount(attempt);

        try {
          const response = await fetch(confirmationUrl);
          const data = await response.json().catch(() => null);

          if (response.ok && data?.ok && data?.order?.paymentStatus === 'paid') {
            if (!isMounted) {
              return;
            }

            setOrderData(data.order);

            if (!hasClearedCartRef.current) {
              clearCart();
              hasClearedCartRef.current = true;
            }

            setConfirmationError('');
            setIsLoading(false);
            return;
          }

          const shouldRetry =
            data?.code === 'ORDER_NOT_PAID' ||
            data?.code === 'ORDER_NOT_FOUND';

          if (!shouldRetry || attempt === MAX_CONFIRMATION_ATTEMPTS) {
            throw new Error(
              data?.message ||
                "Cette commande n'est pas confirmée pour le moment."
            );
          }
        } catch (error) {
          const errorMessage =
            error?.message ||
            'Une erreur est survenue lors de la vérification de votre commande.';

          const shouldRetry =
            attempt < MAX_CONFIRMATION_ATTEMPTS &&
            (errorMessage.includes("n'est pas encore validée") ||
              errorMessage.includes("n'est pas confirmée") ||
              errorMessage.includes("n'existe pas"));

          if (!shouldRetry) {
            if (!isMounted) {
              return;
            }

            setConfirmationError(errorMessage);
            setIsLoading(false);
            return;
          }
        }

        await wait(CONFIRMATION_RETRY_DELAY);
      }

      if (isMounted) {
        setConfirmationError(
          "La confirmation du paiement prend plus de temps que prévu. Merci de rafraîchir la page dans quelques instants."
        );
        setIsLoading(false);
      }
    }

    verifyOrder();

    return () => {
      isMounted = false;
    };
  }, [router.isReady, router.query, clearCart]);

  const isConfirmed = !isLoading && !confirmationError && orderData;
  const deliverySummary = isConfirmed ? buildDeliverySummary(orderData) : '';
  const deliveryFollowUpMessage = isConfirmed
    ? getDeliveryFollowUpMessage(orderData)
    : '';

  const customerEmail = useMemo(() => {
    const email = orderData?.customer?.email;
    return typeof email === 'string' ? email.trim() : '';
  }, [orderData]);

  const registrationHref = useMemo(() => {
    if (!customerEmail) {
      return '/inscription';
    }

    return `/inscription?email=${encodeURIComponent(customerEmail)}`;
  }, [customerEmail]);

  const shouldShowGuestAccountPrompt = isConfirmed && Boolean(customerEmail);

  return (
    <>
      <Head>
        <title>Commande confirmée - Crackers by VB</title>
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
            <h1 className={internalStyles.pageTitle}>
              {isConfirmed
                ? 'Merci pour votre commande'
                : 'Vérification de votre commande'}
            </h1>

            {isLoading && (
              <p className={internalStyles.pageSubtitle}>
                Nous confirmons actuellement votre paiement auprès de Stripe.
              </p>
            )}

            {!isLoading && confirmationError && (
              <p className={internalStyles.pageSubtitle}>
                Nous n&apos;avons pas pu confirmer cette commande automatiquement.
              </p>
            )}

            {isConfirmed && (
              <p className={internalStyles.pageSubtitle}>
                Votre paiement a bien été enregistré. Votre commande est en cours
                de préparation par la créatrice.
              </p>
            )}
          </header>

          {isLoading && (
            <section className={internalStyles.card}>
              <h2 className={internalStyles.sectionTitle}>
                Validation du paiement
              </h2>
              <p className={internalStyles.text}>
                Vérification de votre paiement en cours...
              </p>
              <p className={internalStyles.text}>
                Tentative {attemptCount} sur {MAX_CONFIRMATION_ATTEMPTS}.
              </p>
            </section>
          )}

          {!isLoading && confirmationError && (
            <section className={internalStyles.card}>
              <h2 className={internalStyles.sectionTitle}>
                Confirmation indisponible
              </h2>
              <p className={internalStyles.text}>{confirmationError}</p>
              <p className={internalStyles.text}>
                Si vous pensez que le paiement a bien été effectué, contactez la
                créatrice depuis la page Contact afin de vérifier votre commande.
              </p>

              <div className={internalStyles.divider}>
                <p className={internalStyles.metaText}>
                  Vous pouvez également retourner à la boutique ou revenir à
                  l&apos;accueil.
                </p>
              </div>

              <div
                style={{
                  marginTop: '24px',
                  display: 'flex',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <Link href="/contact" legacyBehavior>
                  <a className={internalStyles.primaryButton}>Contacter</a>
                </Link>
                <Link href="/boutique" legacyBehavior>
                  <a className={internalStyles.primaryButton}>
                    Retourner à la boutique
                  </a>
                </Link>
              </div>
            </section>
          )}

          {isConfirmed && (
            <>
              <section className={internalStyles.card}>
                <h2 className={internalStyles.sectionTitle}>
                  Confirmation et suivi
                </h2>

                {orderData?.orderNumber ? (
                  <p className={internalStyles.text}>
                    Référence de commande : {orderData.orderNumber}
                  </p>
                ) : null}

                <p className={internalStyles.text}>
                  Mode de livraison choisi : {deliverySummary}
                </p>

                <p className={internalStyles.text}>
                  {deliveryFollowUpMessage}
                </p>

                <p className={internalStyles.text}>
                  Un email de confirmation détaillant votre commande sera envoyé à
                  l&apos;adresse indiquée lors du paiement. Conservez-le, il
                  contiendra les informations utiles pour le suivi et les échanges
                  éventuels avec la créatrice.
                </p>

                <p className={internalStyles.text}>
                  Si vous ne voyez pas l&apos;email arriver dans les prochaines
                  minutes, pensez à vérifier vos courriers indésirables ou votre
                  onglet &quot;Promotions&quot;.
                </p>

                <div className={internalStyles.divider}>
                  <p className={internalStyles.metaText}>
                    En cas de question à propos de votre commande, vous pouvez
                    contacter directement la créatrice via la page&nbsp;
                    <Link href="/contact" legacyBehavior>
                      <a className={internalStyles.contactLink}>Contact</a>
                    </Link>
                    .
                  </p>
                </div>

                <div
                  style={{
                    marginTop: '24px',
                    display: 'flex',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <Link href="/boutique" legacyBehavior>
                    <a className={internalStyles.primaryButton}>
                      Retourner à la boutique
                    </a>
                  </Link>
                  <Link href="/" legacyBehavior>
                    <a className={internalStyles.primaryButton}>
                      Revenir à l&apos;accueil
                    </a>
                  </Link>
                </div>
              </section>

              {shouldShowGuestAccountPrompt && (
                <section className={internalStyles.card}>
                  <h2 className={internalStyles.sectionTitle}>
                    Créer un compte pour vos prochaines commandes
                  </h2>

                  <p className={internalStyles.text}>
                    Votre commande est bien enregistrée. Si vous le souhaitez,
                    vous pouvez aussi créer un compte client pour retrouver plus
                    facilement vos prochaines commandes et gagner du temps lors de
                    vos futurs achats.
                  </p>

                  <p className={internalStyles.text}>
                    Cette étape reste facultative et ne change rien à la commande
                    que vous venez de valider.
                  </p>

                  <div
                    style={{
                      marginTop: '24px',
                      display: 'flex',
                      gap: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <Link href={registrationHref} legacyBehavior>
                      <a className={internalStyles.primaryButton}>
                        Créer mon compte
                      </a>
                    </Link>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}