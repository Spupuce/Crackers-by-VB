// pages/commande/confirmation.js

import Head from 'next/head';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import internalStyles from '../../styles/InternalPages.module.css';

export default function ConfirmationCommandePage() {
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
              Merci pour votre commande
            </h1>
            <p className={internalStyles.pageSubtitle}>
              Votre paiement a bien été enregistré. Votre commande est en cours
              de préparation par la créatrice.
            </p>
          </header>

          <section className={internalStyles.card}>
            <h2 className={internalStyles.sectionTitle}>
              Confirmation et suivi
            </h2>
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
        </div>
      </main>

      <Footer />
    </>
  );
}