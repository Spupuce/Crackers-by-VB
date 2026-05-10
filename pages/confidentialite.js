/* pages/confidentialite.js */

import Head from 'next/head';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PageContainer from '../components/PageContainer';
import ContentCard from '../components/ContentCard';
import styles from '../styles/InternalPages.module.css';

export default function ConfidentialitePage() {
  return (
    <>
      <Head>
        <title>Politique de confidentialité - Crackers by VB</title>
        <meta
          name="description"
          content="Consultez la politique de confidentialité de Crackers by VB."
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
          <h1 className={styles.pageTitle}>Politique de Confidentialité</h1>

          <div className={styles.legalSection}>
            <h2 className={styles.sectionTitle}>Collecte des données</h2>
            <p className={styles.text}>
              Crackers by VB collecte les données personnelles suivantes : nom,
              prénom, adresse email, adresse postale, numéro de téléphone. Ces
              informations sont nécessaires pour le traitement de vos commandes
              et la gestion de la relation client.
            </p>
          </div>

          <div className={styles.legalSection}>
            <h2 className={styles.sectionTitle}>Utilisation des données</h2>
            <p className={styles.text}>Les données collectées sont utilisées pour :</p>
            <p className={styles.text}>Le traitement et le suivi de vos commandes</p>
            <p className={styles.text}>La gestion de la relation client</p>
            <p className={styles.text}>
              L’envoi d’informations sur nos produits (avec votre consentement)
            </p>
            <p className={styles.text}>Le respect de nos obligations légales</p>
          </div>

          <div className={styles.legalSection}>
            <h2 className={styles.sectionTitle}>Conservation des données</h2>
            <p className={styles.text}>
              Vos données personnelles sont conservées pendant la durée
              nécessaire aux fins pour lesquelles elles sont traitées,
              conformément aux obligations légales en vigueur.
            </p>
          </div>

          <div className={styles.legalSection}>
            <h2 className={styles.sectionTitle}>Vos droits</h2>
            <p className={styles.text}>
              Conformément au Règlement Général sur la Protection des Données
              (RGPD) et à la loi Informatique et Libertés, vous disposez des
              droits suivants :
            </p>
            <p className={styles.text}>Droit d’accès à vos données personnelles</p>
            <p className={styles.text}>Droit de rectification de vos données</p>
            <p className={styles.text}>Droit à l’effacement de vos données</p>
            <p className={styles.text}>Droit à la limitation du traitement</p>
            <p className={styles.text}>Droit d’opposition au traitement</p>
            <p className={styles.text}>Droit à la portabilité de vos données</p>
            <p className={styles.text}>
              Pour exercer ces droits, vous pouvez nous contacter à l’adresse :
              vbeninca74@outlook.fr
            </p>
          </div>

          <div className={styles.legalSection}>
            <h2 className={styles.sectionTitle}>Sécurité</h2>
            <p className={styles.text}>
              Crackers by VB met en œuvre toutes les mesures techniques et
              organisationnelles appropriées pour assurer la sécurité et la
              confidentialité de vos données personnelles.
            </p>
          </div>

          <div className={styles.legalSection}>
            <h2 className={styles.sectionTitle}>Cookies</h2>
            <p className={styles.text}>
              Ce site utilise des cookies nécessaires à son bon fonctionnement.
              Aucun cookie de suivi ou de publicité n’est utilisé sans votre
              consentement.
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