// pages/administration/produit/[id].js
import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import ProductForm from '../../../components/ProductForm';
import styles from '../../../styles/AdminStock.module.css';

function normalizeColorName(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function getColorStock(color) {
  if (!color || typeof color !== 'object') return 0;

  if (color.quantity !== undefined && color.quantity !== null) {
    const quantity = Number(color.quantity);
    return Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
  }

  if (color.stock !== undefined && color.stock !== null) {
    const stock = Number(color.stock);
    return Number.isFinite(stock) && stock > 0 ? stock : 0;
  }

  return 0;
}

function getPendingRequestColorsFromRequests(requests) {
  if (!Array.isArray(requests)) {
    return [];
  }

  const uniqueColors = new Map();

  requests.forEach((request) => {
    const normalized = normalizeColorName(request?.color);
    if (!normalized) return;

    if (!uniqueColors.has(normalized)) {
      uniqueColors.set(normalized, request.color.trim());
    }
  });

  return Array.from(uniqueColors.values());
}

function getNotifiableColorsFromRequests(product, requests) {
  if (!product || !Array.isArray(product.colors) || !Array.isArray(requests)) {
    return [];
  }

  const pendingColors = new Set(
    requests.map((request) => normalizeColorName(request?.color)).filter(Boolean)
  );

  return product.colors
    .filter((color) => {
      const normalizedName = normalizeColorName(color?.name);
      if (!normalizedName) return false;

      return pendingColors.has(normalizedName) && getColorStock(color) > 0;
    })
    .map((color) => color.name.trim());
}

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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const scrollToTop = useCallback(() => {
    if (typeof window === 'undefined') return;

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, []);

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

  async function fetchPendingRestockRequests() {
    if (!id) {
      return [];
    }

    try {
      const response = await fetch(`/api/admin/products/${id}/restock-requests`);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        return [];
      }

      if (Array.isArray(data)) {
        return data;
      }

      if (Array.isArray(data?.requests)) {
        return data.requests;
      }

      if (Array.isArray(data?.pendingRequests)) {
        return data.pendingRequests;
      }

      return [];
    } catch (error) {
      return [];
    }
  }

  useEffect(() => {
    setNotifyFeedback('');
    setSaveFeedback('');
    fetchProduct();
  }, [fetchProduct]);

  const pendingRequestsCount = Number(product?.pendingRequestsCount || 0);
  const hasPendingRestockRequests =
    Boolean(product) && !product.isArchived && pendingRequestsCount > 0;

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
        scrollToTop();
        return;
      }

      setHasUnsavedChanges(false);

      const refreshedProduct = await fetchProduct();

      if (submitAction === 'save-and-notify') {
        setNotifyLoading(true);

        const pendingRequests = await fetchPendingRestockRequests();
        const notifiableColors = getNotifiableColorsFromRequests(
          refreshedProduct,
          pendingRequests
        );
        const fallbackPendingColors =
          getPendingRequestColorsFromRequests(pendingRequests);

        if (notifiableColors.length === 0) {
          setNotifyLoading(false);
          setSaveFeedback('Produit mis à jour avec succès.');

          if (fallbackPendingColors.length > 0) {
            setNotifyFeedback(
              'Aucune couleur avec demandes en attente n’est actuellement en stock pour envoyer une notification.'
            );
          } else {
            setNotifyFeedback(
              'Aucune demande de réassort en attente pour envoyer une notification.'
            );
          }

          scrollToTop();
          return;
        }

        const results = [];
        for (const color of notifiableColors) {
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

        scrollToTop();
        return;
      }

      setSaveFeedback('Produit mis à jour avec succès.');
      scrollToTop();
    } catch (error) {
      setNotifyLoading(false);
      setSaveError('Impossible d’enregistrer le produit.');
      scrollToTop();
    }
  }

  function confirmLeaveIfNeeded() {
    if (!hasUnsavedChanges) {
      return true;
    }

    return window.confirm(
      'Des modifications ne sont pas enregistrées. Voulez-vous vraiment quitter cette page ?'
    );
  }

  function handleCancel() {
    if (!confirmLeaveIfNeeded()) {
      return;
    }

    router.push('/administration/stock');
  }

  function handleBackToStock() {
    if (!confirmLeaveIfNeeded()) {
      return;
    }

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
                    onUnsavedChangesChange={setHasUnsavedChanges}
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