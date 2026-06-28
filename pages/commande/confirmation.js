// pages/commande/confirmation.js

import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiArrowLeft } from 'react-icons/fi';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useCart } from '../../context/CartContext';
import internalStyles from '../../styles/InternalPages.module.css';

export default function ConfirmationCommandePage() {
  const router = useRouter();
  const { clearCart } = useCart();

  const hasClearedCartRef = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [confirmationError, setConfirmationError] = useState('');
  const [orderData, setOrderData] = useState(null);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const { orderId } = router.query || {};

    if (!orderId || typeof orderId !== 'string') {
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

      try {
        const response = await fetch(`/api/orders/${orderId}`);
        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.ok || data?.order?.paymentStatus !== 'paid') {
          throw new Error(
            data?.message ||
              "Cette commande n'est pas confirmée pour le moment."
          );
        }

        if (!isMounted) {
          return;
        }

        setOrderData(data.order);

        if (!hasClearedCartRef.current) {
          clearCart();
          hasClearedCartRef.current = true;
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setConfirmationError(
          error?.message ||
            'Une erreur est survenue lors de la vérification de votre commande.'
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    verifyOrder();

    return () => {
      isMounted = false;
    };
  }, [router.isReady, router.query, clearCart]);

  const isConfirmed = !isLoading && !confirmationError && orderData;

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
                Nous vérifions actuellement la confirmation de votre paiement.
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
              <p className={internalStyles.text}>
                Vérification de votre paiement en cours...
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
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}