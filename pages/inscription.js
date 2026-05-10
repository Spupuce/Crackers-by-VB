/* pages/inscription.js */

import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AuthCard from '../components/AuthCard';
import styles from '../styles/Auth.module.css';

export default function InscriptionPage() {
  const handleSubmit = (event) => {
    event.preventDefault();
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
              name: 'fullname',
              label: 'Nom complet',
              type: 'text',
              placeholder: 'Votre nom',
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
          ]}
          submitLabel="S’inscrire"
          secondaryText="Déjà un compte ?"
          secondaryLinkLabel="Se connecter"
          secondaryLinkHref="/connexion"
          onSubmit={handleSubmit}
        />
      </main>

      <Footer />
    </>
  );
}