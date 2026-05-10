// pages/administration/produit/nouveau.js

import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import ProductForm from '../../../components/ProductForm';
import styles from '../../../styles/AdminStock.module.css';

export default function NewProductPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(payload) {
    try {
      setIsSaving(true);
      setError('');

      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.message || 'Erreur lors de la création du produit.');
        return;
      }

      router.push('/administration/stock');
    } catch (error) {
      setError('Impossible de créer le produit.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancelPage() {
    router.push('/administration/stock');
  }

  return (
    <>
      <Head>
        <title>Ajouter un produit - Crackers by VB</title>
      </Head>

      <Header />

      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.topBar}>
            <p className={styles.welcome}>
              Bonjour Virginie ! Ajoutez une nouvelle création.
            </p>

            <button
              type="button"
              className={styles.addButton}
              onClick={handleCancelPage}
            >
              Annuler
            </button>
          </div>

          {error && (
            <div className={styles.infoBox}>
              <strong>Erreur :</strong> {error}
            </div>
          )}

          {isSaving && (
            <div className={styles.infoBox}>
              Enregistrement du produit...
            </div>
          )}

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h1 className={styles.panelTitle}>Ajouter un produit</h1>
            </div>

            <div style={{ padding: '18px' }}>
              <ProductForm
                mode="create"
                initialValues={null}
                onSubmit={handleSubmit}
              />
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}