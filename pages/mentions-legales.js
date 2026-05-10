/* pages/mentions-legales.js */

import Head from "next/head";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import Header from "../components/Header";
import Footer from "../components/Footer";
import PageContainer from "../components/PageContainer";
import ContentCard from "../components/ContentCard";
import styles from "../styles/InternalPages.module.css";

export default function MentionsLegalesPage() {
  return (
    <>
      <Head>
        <title>Mentions légales - Crackers by VB</title>
        <meta
          name="description"
          content="Consultez les mentions légales du site Crackers by VB."
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
          <h1 className={styles.pageTitle}>Mentions Légales</h1>

          <div className={styles.legalSection}>
            <h2 className={styles.sectionTitle}>Éditeur du site</h2>
            <p className={styles.text}>
              <span className={styles.textStrong}>Crackers by VB</span>
            </p>
            <p className={styles.text}>Virginie Beninca</p>
            <p className={styles.text}>Email : vbeninca74@outlook.fr</p>
          </div>

          <div className={styles.legalSection}>
            <h2 className={styles.sectionTitle}>Hébergement</h2>
            <p className={styles.text}>
              Ce site est hébergé par un prestataire d’hébergement web
              conformément aux réglementations en vigueur.
            </p>
          </div>

          <div className={styles.legalSection}>
            <h2 className={styles.sectionTitle}>Propriété intellectuelle</h2>
            <p className={styles.text}>
              L'ensemble du contenu de ce site (textes, images, vidéos) est la
              propriété exclusive de Crackers by VB, sauf mention contraire.
              Toute reproduction, distribution, modification, adaptation,
              retransmission ou publication de ces différents éléments est
              strictement interdite sans l'accord exprès par écrit de Crackers
              by VB.
            </p>
          </div>

          <div className={styles.legalSection}>
            <h2 className={styles.sectionTitle}>Données personnelles</h2>
            <p className={styles.text}>
              Les informations recueillies sur ce site sont enregistrées dans un
              fichier informatisé par Crackers by VB pour la gestion des
              commandes et la relation client. Elles sont conservées pendant la
              durée nécessaire aux fins pour lesquelles elles sont traitées et
              sont destinées uniquement à Virginie Beninca. Conformément à la
              loi « informatique et libertés », vous pouvez exercer votre droit
              d'accès aux données vous concernant et les faire rectifier en
              contactant vbeninca74@outlook.fr.
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
