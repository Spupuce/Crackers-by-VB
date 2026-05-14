// pages/inscription.js

import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AuthCard from '../components/AuthCard';
import styles from '../styles/Auth.module.css';

export default function InscriptionPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialValues = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  };

  const handleSubmit = async (values) => {
    if (isSubmitting) return;

    setErrorMessage('');
    setSuccessMessage('');

    if (
      !values.firstName?.trim() ||
      !values.lastName?.trim() ||
      !values.email?.trim() ||
      !values.password ||
      !values.confirmPassword
    ) {
      setErrorMessage('Tous les champs sont obligatoires.');
      return;
    }

    if (values.firstName.trim().length < 2) {
      setErrorMessage('Le prénom doit contenir au moins 2 caractères.');
      return;
    }

    if (values.lastName.trim().length < 2) {
      setErrorMessage('Le nom doit contenir au moins 2 caractères.');
      return;
    }

    if (values.password !== values.confirmPassword) {
      setErrorMessage('Les mots de passe ne correspondent pas.');
      return;
    }

    if (!values.password || values.password.length < 6) {
      setErrorMessage('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || 'Impossible de créer le compte.');
        return;
      }

      setSuccessMessage('Compte créé avec succès. Redirection en cours...');

      setTimeout(() => {
        router.push(
          `/connexion?email=${encodeURIComponent(values.email.trim())}`
        );
      }, 1000);
    } catch (error) {
      setErrorMessage('Une erreur est survenue. Merci de réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Inscription - Crackers by VB</title>
      </Head>

      <Header />

      <main className={styles.page}>
        <AuthCard
          title="Inscription"
          subtitle="Créez votre compte"
          fields={[
            {
              name: 'firstName',
              label: 'Prénom',
              type: 'text',
              placeholder: 'Marie',
            },
            {
              name: 'lastName',
              label: 'Nom',
              type: 'text',
              placeholder: 'Dupont',
            },
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
            {
              name: 'confirmPassword',
              label: 'Confirmer le mot de passe',
              type: 'password',
              placeholder: 'Confirmez votre mot de passe',
            },
          ]}
          initialValues={initialValues}
          submitLabel={isSubmitting ? 'Inscription...' : 'S’inscrire'}
          secondaryText="Déjà un compte ?"
          secondaryLinkLabel="Se connecter"
          secondaryLinkHref="/connexion"
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