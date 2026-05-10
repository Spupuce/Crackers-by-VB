/* pages/connexion.js */

import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AuthCard from '../components/AuthCard';
import styles from '../styles/Auth.module.css';

export default function ConnexionPage() {
  const handleSubmit = (event) => {
    event.preventDefault();
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
          submitLabel="Se connecter"
          secondaryText="Pas encore de compte ?"
          secondaryLinkLabel="S’inscrire"
          secondaryLinkHref="/inscription"
          onSubmit={handleSubmit}
        />
      </main>

      <Footer />
    </>
  );
}