// pages/boutique.js

import { useMemo, useState } from 'react';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import ShopSidebar from '../components/ShopSidebar';
import { products as fallbackProducts } from '../data/products';
import styles from '../styles/Boutique.module.css';

const PRICE_RANGE_OPTIONS = [
  { key: 'all', label: 'Tous' },
  { key: 'lt30', label: 'Moins de 30€', min: 0, max: 30 },
  { key: '30-50', label: '30€ - 50€', min: 30, max: 50 },
  { key: '50-100', label: '50€ - 100€', min: 50, max: 100 },
  { key: 'gt100', label: 'Plus de 100€', min: 100, max: Infinity },
];

// Normalisation pour éviter les soucis de libellé exact
function matchesCategory(productCategory, selectedCategory) {
  if (!selectedCategory || selectedCategory === 'Tous') {
    return true;
  }

  // On compare de façon tolérante (insensible à la casse, espaces)
  const normalize = (value) =>
    String(value || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

  const pc = normalize(productCategory);
  const sc = normalize(selectedCategory);

  return pc === sc;
}

export default function BoutiquePage({ products }) {
  const safeProducts = Array.isArray(products) ? products : [];

  const activeProducts = safeProducts.filter((product) =>
    typeof product.isArchived === 'boolean'
      ? !product.isArchived
      : product.isActive
  );

  const [pendingCategory, setPendingCategory] = useState('Tous');
  const [pendingPriceRangeKey, setPendingPriceRangeKey] = useState('all');
  const [pendingMinPrice, setPendingMinPrice] = useState('');
  const [pendingMaxPrice, setPendingMaxPrice] = useState('');

  const [appliedCategory, setAppliedCategory] = useState('Tous');
  const [appliedPriceRangeKey, setAppliedPriceRangeKey] = useState('all');
  const [appliedMinPrice, setAppliedMinPrice] = useState('');
  const [appliedMaxPrice, setAppliedMaxPrice] = useState('');

  function handleApplyFilters() {
    setAppliedCategory(pendingCategory);
    setAppliedPriceRangeKey(pendingPriceRangeKey);
    setAppliedMinPrice(pendingMinPrice);
    setAppliedMaxPrice(pendingMaxPrice);
  }

  function handleResetFilters() {
    setPendingCategory('Tous');
    setPendingPriceRangeKey('all');
    setPendingMinPrice('');
    setPendingMaxPrice('');
    setAppliedCategory('Tous');
    setAppliedPriceRangeKey('all');
    setAppliedMinPrice('');
    setAppliedMaxPrice('');
  }

  const filteredProducts = useMemo(() => {
    return activeProducts.filter((product) => {
      // 1. Filtre catégorie
      if (!matchesCategory(product.category, appliedCategory)) {
        return false;
      }

      // 2. Base de la tranche de prix
      const range = PRICE_RANGE_OPTIONS.find(
        (r) => r.key === appliedPriceRangeKey
      );

      let min = 0;
      let max = Infinity;

      if (range && range.key !== 'all') {
        min = range.min ?? 0;
        max = range.max ?? Infinity;
      }

      // 3. Overrides personnalisés
      const customMin =
        appliedMinPrice !== '' ? Number(appliedMinPrice) : null;
      const customMax =
        appliedMaxPrice !== '' ? Number(appliedMaxPrice) : null;

      if (customMin !== null && !Number.isNaN(customMin)) {
        min = customMin;
      }
      if (customMax !== null && !Number.isNaN(customMax)) {
        max = customMax;
      }

      const price = Number(product.price);
      if (Number.isNaN(price)) {
        return false;
      }

      if (price < min || price > max) {
        return false;
      }

      return true;
    });
  }, [
    activeProducts,
    appliedCategory,
    appliedPriceRangeKey,
    appliedMinPrice,
    appliedMaxPrice,
  ]);

  return (
    <>
      <Head>
        <title>Boutique - Crackers by VB</title>
        <meta
          name="description"
          content="Découvrez toutes les créations artisanales de Crackers by VB."
        />
      </Head>

      <Header />

      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.intro}>
            <h1 className={styles.title}>Boutique</h1>
            <p className={styles.subtitle}>
              Découvrez toutes mes créations artisanales
            </p>
          </div>

          <div className={styles.layout}>
            <ShopSidebar
              category={pendingCategory}
              onCategoryChange={setPendingCategory}
              priceRangeKey={pendingPriceRangeKey}
              onPriceRangeKeyChange={setPendingPriceRangeKey}
              minPrice={pendingMinPrice}
              maxPrice={pendingMaxPrice}
              onMinPriceChange={setPendingMinPrice}
              onMaxPriceChange={setPendingMaxPrice}
              onApplyFilters={handleApplyFilters}
              onResetFilters={handleResetFilters}
            />

            <section className={styles.productsSection}>
              <p className={styles.results}>
                {filteredProducts.length} produits trouvés
              </p>

              <div className={styles.grid}>
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product._id || product.slug}
                    product={product}
                  />
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}