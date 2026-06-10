// pages/administration/index.js

import { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import AuthCard from '../../components/AuthCard';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/Auth.module.css';

export default function AdministrationLoginPage() {
  const router = useRouter();
  const { isAuthenticated, isAdmin, isAuthReady } = useAuth();

  useEffect(() => {
    if (!isAuthReady) return;

    if (isAuthenticated && isAdmin) {
      router.replace('/administration/stock');
    }
  }, [isAuthReady, isAuthenticated, isAdmin, router]);

  const getStateMessages = () => {
    if (!isAuthReady) {
      return {
        subtitle: 'Vérification de la session en cours',
        errorMessage: '',
        successMessage: '',
        submitLabel: 'Chargement...',
      };
    }

    if (!isAuthenticated) {
      return {
        subtitle: 'Connectez-vous avec un compte administrateur',
        errorMessage: '',
        successMessage: '',
        submitLabel: 'Aller à la connexion',
      };
    }

    if (!isAdmin) {
      return {
        subtitle: 'Accès réservé',
        errorMessage:
          'Votre compte est bien connecté, mais il ne dispose pas des droits administrateur.',
        successMessage: '',
        submitLabel: 'Retour à l’accueil',
      };
    }

    return {
      subtitle: 'Redirection vers l’administration',
      errorMessage: '',
      successMessage:
        'Compte administrateur détecté. Redirection en cours...',
      submitLabel: 'Accéder à l’administration',
    };
  };

  const { subtitle, errorMessage, successMessage, submitLabel } =
    getStateMessages();

  return (
    <>
      <Head>
        <title>Administration - Crackers by VB</title>
      </Head>

      <Header />

      <main className={styles.page}>
        <AuthCard
          title="Administration"
          subtitle={subtitle}
          fields={[]}
          submitLabel={submitLabel}
          errorMessage={errorMessage}
          successMessage={successMessage}
          onSubmit={() => {
            if (!isAuthenticated) {
              router.push(
                '/connexion?redirect=/administration/stock'
              );
              return;
            }

            if (!isAdmin) {
              router.push('/');
              return;
            }

            router.push('/administration/stock');
          }}
        />
      </main>

      <Footer />
    </>
  );
}