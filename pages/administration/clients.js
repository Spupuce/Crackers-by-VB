// pages/administration/clients.js

import Head from 'next/head';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/AdminStock.module.css';

export default function AdminClientsPage() {
  const router = useRouter();
  const { isAuthenticated, isAdmin, isAuthReady } = useAuth();

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    if (!isAuthenticated) {
      router.replace('/connexion?redirect=/administration/clients');
      return;
    }

    if (!isAdmin) {
      router.replace('/');
    }
  }, [isAuthReady, isAuthenticated, isAdmin, router]);

  if (!isAuthReady) {
    return (
      <>
        <Head>
          <title>Fiches clients - Administration | Crackers by VB</title>
        </Head>

        <Header />

        <main className={styles.page}>
          <div className={styles.container}>
            <div className={styles.infoBox}>Vérification de la session...</div>
          </div>
        </main>

        <Footer />
      </>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <>
        <Head>
          <title>Fiches clients - Administration | Crackers by VB</title>
        </Head>

        <Header />

        <main className={styles.page}>
          <div className={styles.container}>
            <div className={styles.infoBox}>Redirection en cours...</div>
          </div>
        </main>

        <Footer />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Fiches clients - Administration | Crackers by VB</title>
      </Head>

      <Header />

      <main className={styles.page}>
        <div className={styles.container}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h1 className={styles.panelTitle}>Fiches clients</h1>
              <p className={styles.panelSubtitle}>
                Préparation de l’espace clients : profils, coordonnées,
                commandes et historique.
              </p>
            </div>

            <div className={styles.list}>
              <div className={styles.infoBox}>
                <p>
                  Cet espace permettra bientôt de retrouver pour chaque client :
                </p>
                <ul>
                  <li>ses informations de profil (nom, coordonnées, adresse)</li>
                  <li>ses commandes passées et leur statut</li>
                  <li>son historique d’achat et éventuelles demandes</li>
                </ul>
                <p>
                  Pour l’instant, la structure est en place. Nous brancherons les
                  vraies données une fois le modèle de commande stabilisé.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}