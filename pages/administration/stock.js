// pages/administration/stock.js
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import AdminProductList from '../../components/AdminProductList';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/AdminStock.module.css';

export default function AdminStockPage() {
  const router = useRouter();
  const { isAuthenticated, isAdmin, isAuthReady } = useAuth();

  const [activeProducts, setActiveProducts] = useState([]);
  const [archivedProducts, setArchivedProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function fetchProducts() {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch('/api/admin/products?status=all');
      const data = await response.json();

      if (!response.ok) {
        setError(data?.message || 'Erreur lors du chargement des produits.');
        setActiveProducts([]);
        setArchivedProducts([]);
        return;
      }

      const active = data.filter((product) => !product.isArchived);
      const archived = data.filter((product) => product.isArchived);

      setActiveProducts(active);
      setArchivedProducts(archived);
    } catch (error) {
      setError('Impossible de charger les produits.');
      setActiveProducts([]);
      setArchivedProducts([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!isAuthReady) return;

    if (!isAuthenticated) {
      router.replace('/connexion?redirect=/administration/stock');
      return;
    }

    if (!isAdmin) {
      router.replace('/');
      return;
    }

    fetchProducts();
  }, [isAuthReady, isAuthenticated, isAdmin, router]);

  function handleAddProduct() {
    router.push('/administration/produit/nouveau');
  }

  function handleEdit(product) {
    router.push(`/administration/produit/${product._id}`);
  }

  function handleProductUpdated(updatedProduct) {
    if (!updatedProduct?._id) return;

    if (updatedProduct.isArchived) {
      setArchivedProducts((prev) =>
        prev.map((product) =>
          product._id === updatedProduct._id ? { ...product, ...updatedProduct } : product
        )
      );
      return;
    }

    setActiveProducts((prev) =>
      prev.map((product) =>
        product._id === updatedProduct._id ? { ...product, ...updatedProduct } : product
      )
    );
  }

  async function handleArchive(product) {
    try {
      const response = await fetch(`/api/admin/products/${product._id}/archive`, {
        method: 'PATCH',
      });

      const updatedProduct = await response.json().catch(() => null);

      if (!response.ok) return;

      setActiveProducts((prev) => prev.filter((item) => item._id !== product._id));

      setArchivedProducts((prev) => [
        updatedProduct || { ...product, isArchived: true },
        ...prev,
      ]);
    } catch (error) {
      // erreur silencieuse pour l'instant
    }
  }

  async function handleUnarchive(product) {
    try {
      const response = await fetch(`/api/admin/products/${product._id}/unarchive`, {
        method: 'PATCH',
      });

      const updatedProduct = await response.json().catch(() => null);

      if (!response.ok) return;

      setArchivedProducts((prev) => prev.filter((item) => item._id !== product._id));

      setActiveProducts((prev) => [
        updatedProduct || { ...product, isArchived: false },
        ...prev,
      ]);
    } catch (error) {
      // erreur silencieuse pour l'instant
    }
  }

  async function handleDelete(product) {
    const confirmed = window.confirm(
      'Êtes-vous sûre de vouloir supprimer définitivement ce produit ? Cette action est irréversible.'
    );

    if (!confirmed) return false;

    try {
      const response = await fetch(`/api/admin/products/${product._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) return false;

      setArchivedProducts((prev) => prev.filter((item) => item._id !== product._id));

      return true;
    } catch (error) {
      return false;
    }
  }

  if (!isAuthReady) {
    return (
      <>
        <Head>
          <title>Gestion de stock - Crackers by VB</title>
        </Head>

        <Header />

        <main className={styles.page}>
          <div className={styles.container}>
            <div className={styles.infoBox}>Vérification de la session...</div>
          </div>
        </main>

        <Footer />
      </>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <>
        <Head>
          <title>Gestion de stock - Crackers by VB</title>
        </Head>

        <Header />

        <main className={styles.page}>
          <div className={styles.container}>
            <div className={styles.infoBox}>Redirection en cours...</div>
          </div>
        </main>

        <Footer />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Gestion de stock - Crackers by VB</title>
      </Head>

      <Header />

      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.topBar}>
            <p className={styles.welcome}>
              Bonjour Virginie ! Gérez vos créations facilement.
            </p>

            <button
              type="button"
              className={styles.addButton}
              onClick={handleAddProduct}
            >
              + Ajouter un produit
            </button>
          </div>

          {error && (
            <div className={styles.infoBox}>
              <strong>Erreur :</strong> {error}
            </div>
          )}

          {isLoading && (
            <div className={styles.infoBox}>Chargement des produits...</div>
          )}

          {!isLoading && (
            <>
              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h1 className={styles.panelTitle}>
                    Produits actifs ({activeProducts.length})
                  </h1>
                </div>

                {activeProducts.length === 0 ? (
                  <div className={styles.infoBox}>
                    Aucun produit actif pour le moment.
                  </div>
                ) : (
                  <AdminProductList
                    products={activeProducts}
                    onArchive={handleArchive}
                    onEdit={handleEdit}
                    onProductUpdated={handleProductUpdated}
                  />
                )}
              </section>

              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.panelTitle}>
                    Produits archivés ({archivedProducts.length})
                  </h2>
                </div>

                {archivedProducts.length === 0 ? (
                  <div className={styles.infoBox}>
                    Aucun produit archivé pour le moment.
                  </div>
                ) : (
                  <AdminProductList
                    products={archivedProducts}
                    onUnarchive={handleUnarchive}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    onProductUpdated={handleProductUpdated}
                  />
                )}
              </section>

              <div className={styles.infoBox}>
                <strong>Astuce :</strong> Les produits archivés ne sont plus visibles
                dans la boutique mais restent accessibles ici. Vous pouvez les
                désarchiver à tout moment ou les supprimer définitivement.
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}