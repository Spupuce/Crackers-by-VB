// pages/administration/produit/[id].js

import { useCallback, useEffect, useState } from 'react';
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
  const [saveFeedback, setSaveFeedback] = useState('');
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifyFeedback, setNotifyFeedback] = useState('');

  const fetchProduct = useCallback(async () => {
    if (!id) return null;

    try {
      setIsLoading(true);
      setLoadError('');
      setSaveError('');

      const response = await fetch(`/api/admin/products/${id}`);
      const data = await response.json();

      if (!response.ok) {
        setLoadError(data?.message || 'Erreur lors du chargement du produit.');
        setProduct(null);
        return null;
      }

      setProduct(data);
      return data;
    } catch (error) {
      setLoadError('Impossible de charger le produit.');
      setProduct(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setNotifyFeedback('');
    setSaveFeedback('');
    fetchProduct();
  }, [fetchProduct]);

  const pendingRequestsCount = Number(product?.pendingRequestsCount || 0);
  const hasPendingRestockRequests =
    Boolean(product) &&
    !product.isArchived &&
    pendingRequestsCount > 0;

  async function runNotifyRestock() {
    if (!id) {
      return { ok: false, sentCount: 0 };
    }

    try {
      setNotifyLoading(true);
      setNotifyFeedback('');

      const response = await fetch(`/api/admin/products/${id}/notify-restock`, {
        method: 'POST',
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setNotifyFeedback(
          data?.message || "Erreur lors de l'envoi des notifications."
        );
        return { ok: false, sentCount: 0 };
      }

      const sentCount = Number(data?.sentCount || 0);

      setNotifyFeedback(
        data?.message || 'Notification de réassort envoyée.'
      );

      if (sentCount > 0) {
        setProduct((prev) =>
          prev
            ? {
                ...prev,
                pendingRequestsCount: Math.max(
                  0,
                  Number(prev.pendingRequestsCount || 0) - sentCount
                ),
              }
            : prev
        );
      }

      return { ok: true, sentCount };
    } catch (error) {
      setNotifyFeedback("Erreur lors de l'envoi des notifications.");
      return { ok: false, sentCount: 0 };
    } finally {
      setNotifyLoading(false);
    }
  }

  async function handleSubmit(payload, options = {}) {
    if (!id) return;

    const submitAction = options?.submitAction || 'save';

    try {
      setSaveError('');
      setSaveFeedback('');
      setNotifyFeedback('');

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

      await fetchProduct();

      if (submitAction === 'save-and-notify') {
        const notifyResult = await runNotifyRestock();

        if (notifyResult.ok) {
          setSaveFeedback('Produit mis à jour avec succès.');
        }

        return;
      }

      setSaveFeedback('Produit mis à jour avec succès.');
    } catch (error) {
      setSaveError('Impossible d’enregistrer le produit.');
    }
  }

  function handleCancel() {
    router.push('/administration/stock');
  }

  function handleBackToStock() {
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

              {saveFeedback && (
                <div className={styles.infoBox}>
                  <div className={styles.infoBoxContent}>
                    <span>{saveFeedback}</span>
                    <button
                      type="button"
                      className={styles.inlineInfoButton}
                      onClick={handleBackToStock}
                    >
                      Retour au stock
                    </button>
                  </div>
                </div>
              )}

              {notifyFeedback && (
                <div className={styles.infoBox}>{notifyFeedback}</div>
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
                    hasPendingRestockRequests={
                      hasPendingRestockRequests && !notifyLoading
                    }
                  />

                  {pendingRequestsCount > 0 && (
                    <p className={styles.restockFeedback}>
                      {pendingRequestsCount} demande
                      {pendingRequestsCount > 1 ? 's' : ''} de réassort en attente.
                    </p>
                  )}
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