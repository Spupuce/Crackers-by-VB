// pages/connexion.js

import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AuthCard from '../components/AuthCard';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/Auth.module.css';

function isSafeInternalRedirect(value) {
  return (
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.startsWith('/\\')
  );
}

function isAdminRoute(value) {
  return typeof value === 'string' && value.startsWith('/administration');
}

function getRedirectTarget(redirect, role) {
  const safeRedirect = isSafeInternalRedirect(redirect) ? redirect : null;

  if (role === 'admin') {
    if (safeRedirect) {
      return safeRedirect;
    }

    return '/administration/stock';
  }

  if (safeRedirect && !isAdminRoute(safeRedirect)) {
    return safeRedirect;
  }

  return '/';
}

export default function ConnexionPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialValues = useMemo(
    () => ({
      email:
        typeof router.query.email === 'string' ? router.query.email : '',
      password: '',
    }),
    [router.query.email]
  );

  const handleSubmit = async (formValues) => {
    if (isSubmitting) return;

    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formValues.email,
          password: formValues.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(
          data.message || 'Une erreur est survenue lors de la connexion.'
        );
        return;
      }

      login(data.user);

      setSuccessMessage('Connexion réussie. Redirection en cours...');

      const redirectTarget = getRedirectTarget(
        router.query.redirect,
        data.user?.role
      );

      setTimeout(() => {
        router.push(redirectTarget);
      }, 800);
    } catch (error) {
      setErrorMessage('Une erreur est survenue lors de la connexion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Connexion - Crackers by VB</title>
      </Head>

      <Header />

      <main className={styles.page}>
        <AuthCard
          title="Connexion"
          subtitle="Accédez à votre compte"
          fields={[
            {
              name: 'email',
              label: 'Email',
              type: 'email',
              placeholder: 'exemple@gmail.com',
            },
            {
              name: 'password',
              label: 'Mot de passe',
              type: 'password',
              placeholder: 'Votre mot de passe',
            },
          ]}
          initialValues={initialValues}
          submitLabel={isSubmitting ? 'Connexion...' : 'Se connecter'}
          secondaryText="Pas encore de compte ?"
          secondaryLinkLabel="S’inscrire"
          secondaryLinkHref="/inscription"
          errorMessage={errorMessage}
          successMessage={successMessage}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        />
      </main>

      <Footer />
    </>
  );
}