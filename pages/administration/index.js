/* pages/administration/index.js */

import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import AuthCard from '../../components/AuthCard';
import styles from '../../styles/Auth.module.css';

export default function AdministrationLoginPage() {
  const router = useRouter();

  const handleSubmit = (event) => {
    event.preventDefault();
    router.push('/administration/stock');
  };

  return (
    <>
      <Head>
        <title>Administration - Crackers by VB</title>
      </Head>

      <Header />

      <main className={styles.page}>
        <AuthCard
          title="Administration"
          subtitle="Accès réservé"
          fields={[
            {
              name: 'password',
              label: 'Mot de passe',
              type: 'password',
              placeholder: 'Entrez votre mot de passe',
            },
          ]}
          submitLabel="Se connecter"
          onSubmit={handleSubmit}
        />
      </main>

      <Footer />
    </>
  );
}
