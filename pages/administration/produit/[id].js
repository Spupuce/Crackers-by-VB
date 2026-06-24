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

  async function runNotifyRestock(color) {
    if (!id || !color) {
      return { ok: false, sentCount: 0, failedCount: 0, message: '' };
    }

    try {
      const response = await fetch(`/api/admin/products/${id}/notify-restock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ color }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          ok: false,
          sentCount: 0,
          failedCount: 0,
          message: data?.message || `Erreur lors de l'envoi pour ${color}.`,
        };
      }

      return {
        ok: true,
        sentCount: Number(data?.sentCount || 0),
        failedCount: Number(data?.failedCount || 0),
        message: data?.message || `Notification de réassort envoyée pour ${color}.`,
      };
    } catch (error) {
      return {
        ok: false,
        sentCount: 0,
        failedCount: 0,
        message: `Erreur lors de l'envoi des notifications pour ${color}.`,
      };
    }
  }

  async function handleSubmit(payload, options = {}) {
    if (!id) return;

    const submitAction = options?.submitAction || 'save';
    const restockedColors = Array.isArray(options?.restockedColors)
      ? options.restockedColors.filter(Boolean)
      : [];

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
        if (restockedColors.length === 0) {
          setSaveFeedback('Produit mis à jour avec succès.');
          setNotifyFeedback(
            'Aucune couleur remise en stock détectée pour envoyer une notification.'
          );
          return;
        }

        setNotifyLoading(true);

        const results = [];
        for (const color of restockedColors) {
          const result = await runNotifyRestock(color);
          results.push({ color, ...result });
        }

        setNotifyLoading(false);

        const successResults = results.filter((result) => result.ok);
        const sentTotal = results.reduce(
          (sum, result) => sum + Number(result.sentCount || 0),
          0
        );

        if (successResults.length > 0) {
          setSaveFeedback('Produit mis à jour avec succès.');
        }

        if (results.length === 1) {
          setNotifyFeedback(results[0].message || '');
        } else {
          const messages = results
            .map((result) => `- ${result.color} : ${result.message}`)
            .join(' ');
          setNotifyFeedback(messages);
        }

        if (sentTotal > 0) {
          setProduct((prev) =>
            prev
              ? {
                  ...prev,
                  pendingRequestsCount: Math.max(
                    0,
                    Number(prev.pendingRequestsCount || 0) - sentTotal
                  ),
                }
              : prev
          );
        }

        return;
      }

      setSaveFeedback('Produit mis à jour avec succès.');
    } catch (error) {
      setNotifyLoading(false);
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