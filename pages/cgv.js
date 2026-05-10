/* pages/cgv.js */

import Head from 'next/head';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PageContainer from '../components/PageContainer';
import ContentCard from '../components/ContentCard';
import styles from '../styles/InternalPages.module.css';

export default function CgvPage() {
  return (
    <>
      <Head>
        <title>CGV - Crackers by VB</title>
        <meta
          name="description"
          content="Consultez les conditions générales de vente de Crackers by VB."
        />
      </Head>

      <Header />

      <PageContainer narrow>
        <Link href="/" className={styles.backLink}>
          <span className={styles.backLinkContent}>
            <FiArrowLeft />
            Retour
          </span>
        </Link>

        <ContentCard>
          <h1 className={styles.pageTitle}>Conditions Générales de Vente</h1>

          <div className={styles.legalSection}>
            <h2 className={styles.sectionTitle}>Article 1 - Objet</h2>
            <p className={styles.text}>
              Les présentes conditions générales de vente (CGV) régissent les
              ventes de créations artisanales (tricot, crochet, couture)
              réalisées par Crackers by VB.
            </p>
          </div>

          <div className={styles.legalSection}>
            <h2 className={styles.sectionTitle}>Article 2 - Prix</h2>
            <p className={styles.text}>
              Les prix sont indiqués en euros (€) toutes taxes comprises (TTC).
              Crackers by VB se réserve le droit de modifier ses prix à tout
              moment, étant entendu que le prix figurant au catalogue le jour de
              la commande sera le seul applicable à l’acheteur.
            </p>
            <p className={styles.text}>
              Les frais de livraison sont à la charge du client et s’ajoutent au
              prix des produits :
            </p>
            <p className={styles.text}>Petits colis : 4,90 € en point relais, 7,90 € à domicile</p>
            <p className={styles.text}>Colis moyens : 5,90 € en point relais, 8,90 € à domicile</p>
            <p className={styles.text}>Livraison gratuite dès 69 € d’achat</p>
          </div>

          <div className={styles.legalSection}>
            <h2 className={styles.sectionTitle}>Article 3 - Commande</h2>
            <p className={styles.text}>
              Toute commande effectuée sur le site vaut acceptation des
              présentes CGV. Le vendeur se réserve le droit de refuser toute
              commande qui ne serait pas conforme aux CGV.
            </p>
          </div>

          <div className={styles.legalSection}>
            <h2 className={styles.sectionTitle}>Article 4 - Paiement</h2>
            <p className={styles.text}>
              Le paiement s’effectue selon les modalités convenues avec le
              vendeur. Les modalités de paiement seront confirmées par email
              après validation de la commande.
            </p>
          </div>

          <div className={styles.legalSection}>
            <h2 className={styles.sectionTitle}>Article 5 - Livraison</h2>
            <p className={styles.text}>
              Les délais de livraison varient en fonction de la disponibilité
              des produits et du mode de livraison choisi. Les délais indicatifs
              seront communiqués lors de la confirmation de commande.
            </p>
          </div>

          <div className={styles.legalSection}>
            <h2 className={styles.sectionTitle}>Article 6 - Droit de rétractation</h2>
            <p className={styles.text}>
              Conformément à l’article L221-28 du Code de la consommation, le
              droit de rétractation ne peut être exercé pour les biens
              confectionnés selon les spécifications du consommateur ou
              nettement personnalisés. Pour les autres produits, vous disposez
              d’un délai de 14 jours à compter de la réception de votre commande
              pour exercer votre droit de rétractation.
            </p>
          </div>

          <div className={styles.legalSection}>
            <h2 className={styles.sectionTitle}>Article 7 - Garanties</h2>
            <p className={styles.text}>
              Tous les produits vendus bénéficient de la garantie légale de
              conformité et de la garantie contre les vices cachés prévues par
              le Code de la consommation.
            </p>
          </div>

          <div className={styles.divider}>
            <p className={styles.metaText}>Dernière mise à jour : Mai 2026</p>
          </div>
        </ContentCard>
      </PageContainer>

      <Footer />
    </>
  );
}