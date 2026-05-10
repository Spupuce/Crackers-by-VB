// pages/administration/produit/[id].js

import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import ProductForm from '../../../components/ProductForm';
import styles from '../../../styles/AdminStock.module.css';

export default function EditProductPage() {
  const router = useRouter();
  const { id } = router.query;

  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!id) return;

    async function fetchProduct() {
      try {
        setIsLoading(true);
        setLoadError('');
        setSaveError('');

        const response = await fetch(`/api/admin/products/${id}`);
        const data = await response.json();

        if (!response.ok) {
          setLoadError(data?.message || 'Erreur lors du chargement du produit.');
          setProduct(null);
          return;
        }

        setProduct(data);
      } catch (error) {
        setLoadError('Impossible de charger le produit.');
        setProduct(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProduct();
  }, [id]);

  async function handleSubmit(payload) {
    if (!id) return;

    try {
      setSaveError('');

      const response = await fetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setSaveError(
          data?.message || 'Erreur lors de la mise à jour du produit.'
        );
        return;
      }

      router.push('/administration/stock');
    } catch (error) {
      setSaveError('Impossible d’enregistrer le produit.');
    }
  }

  function handleCancel() {
    router.push('/administration/stock');
  }

  return (
    <>
      <Head>
        <title>Modifier un produit - Crackers by VB</title>
      </Head>

      <Header />

      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.topBar}>
            <p className={styles.welcome}>
              Modifier un produit existant.
            </p>

            <button
              type="button"
              className={styles.addButton}
              onClick={handleCancel}
            >
              Annuler
            </button>
          </div>

          {loadError && (
            <div className={styles.infoBox}>
              <strong>Erreur :</strong> {loadError}
            </div>
          )}

          {isLoading && (
            <div className={styles.infoBox}>
              Chargement du produit...
            </div>
          )}

          {!isLoading && product && (
            <>
              {saveError && (
                <div className={styles.infoBox}>
                  <strong>Erreur :</strong> {saveError}
                </div>
              )}

              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h1 className={styles.panelTitle}>
                    Modifier le produit
                  </h1>
                </div>

                <div style={{ padding: '18px' }}>
                  <ProductForm
                    mode="edit"
                    initialValues={product}
                    onSubmit={handleSubmit}
                  />
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}