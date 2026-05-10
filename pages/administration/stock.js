// pages/administration/stock.js

import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import AdminProductRow from '../../components/AdminProductRow';
import styles from '../../styles/AdminStock.module.css';

export default function AdminStockPage() {
  const router = useRouter();

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
    fetchProducts();
  }, []);

  function handleAddProduct() {
    router.push('/administration/produit/nouveau');
  }

  function handleEdit(product) {
    router.push(`/administration/produit/${product._id}`);
  }

  async function handleArchive(product) {
    try {
      const response = await fetch(`/api/admin/products/${product._id}/archive`, {
        method: 'PATCH',
      });

      const updatedProduct = await response.json().catch(() => null);

      if (!response.ok) {
        return;
      }

      setActiveProducts((prev) =>
        prev.filter((item) => item._id !== product._id)
      );

      setArchivedProducts((prev) => [
        updatedProduct || { ...product, isArchived: true },
        ...prev,
      ]);
    } catch (error) {
      // tu pourras afficher une erreur UI ici ensuite
    }
  }

  async function handleUnarchive(product) {
    try {
      const response = await fetch(`/api/admin/products/${product._id}/unarchive`, {
        method: 'PATCH',
      });

      const updatedProduct = await response.json().catch(() => null);

      if (!response.ok) {
        return;
      }

      setArchivedProducts((prev) =>
        prev.filter((item) => item._id !== product._id)
      );

      setActiveProducts((prev) => [
        updatedProduct || { ...product, isArchived: false },
        ...prev,
      ]);
    } catch (error) {
      // tu pourras afficher une erreur UI ici ensuite
    }
  }

  async function handleDelete(product) {
    const confirmed = window.confirm(
      'Êtes-vous sûre de vouloir supprimer définitivement ce produit ? Cette action est irréversible.'
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/products/${product._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        return;
      }

      setArchivedProducts((prev) =>
        prev.filter((item) => item._id !== product._id)
      );
    } catch (error) {
      // tu pourras afficher une erreur UI ici ensuite
    }
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
            <div className={styles.infoBox}>
              Chargement des produits...
            </div>
          )}

          {!isLoading && (
            <>
              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h1 className={styles.panelTitle}>
                    Produits actifs ({activeProducts.length})
                  </h1>
                </div>

                <div className={styles.list}>
                  {activeProducts.length === 0 && (
                    <div className={styles.infoBox}>
                      Aucun produit actif pour le moment.
                    </div>
                  )}

                  {activeProducts.map((product) => (
                    <AdminProductRow
                      key={product._id}
                      product={product}
                      onEdit={handleEdit}
                      onArchive={handleArchive}
                    />
                  ))}
                </div>
              </section>

              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.panelTitle}>
                    Produits archivés ({archivedProducts.length})
                  </h2>
                </div>

                <div className={styles.list}>
                  {archivedProducts.length === 0 && (
                    <div className={styles.infoBox}>
                      Aucun produit archivé pour le moment.
                    </div>
                  )}

                  {archivedProducts.map((product) => (
                    <AdminProductRow
                      key={product._id}
                      product={product}
                      onUnarchive={handleUnarchive}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
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