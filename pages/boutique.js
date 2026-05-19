import { useMemo, useState } from 'react';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import ShopSidebar from '../components/ShopSidebar';
import { products as fallbackProducts } from '../data/products';
import { isDisplayableProduct } from '../utils/product';
import styles from '../styles/Boutique.module.css';

const PRICE_RANGE_OPTIONS = {
  all: { min: null, max: null },
  lt30: { min: null, max: 30 },
  '30-50': { min: 30, max: 50 },
  '50-100': { min: 50, max: 100 },
  gt100: { min: 100, max: null },
};

function normalizeValue(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesCategory(productCategory, selectedCategory) {
  if (!selectedCategory || selectedCategory === 'Tous') {
    return true;
  }

  const normalizedProductCategory = normalizeValue(productCategory);
  const normalizedSelectedCategory = normalizeValue(selectedCategory);

  if (normalizedProductCategory === normalizedSelectedCategory) {
    return true;
  }

  if (
    normalizedSelectedCategory === 'creations enfants' &&
    normalizedProductCategory === 'creations enfant'
  ) {
    return true;
  }

  if (
    normalizedSelectedCategory === 'creations enfant' &&
    normalizedProductCategory === 'creations enfants'
  ) {
    return true;
  }

  return false;
}

function matchesPriceRange(productPrice, priceRangeKey, minPrice, maxPrice) {
  const price = Number(productPrice);

  if (Number.isNaN(price)) {
    return false;
  }

  const hasCustomMin = minPrice !== '' && !Number.isNaN(Number(minPrice));
  const hasCustomMax = maxPrice !== '' && !Number.isNaN(Number(maxPrice));

  if (hasCustomMin || hasCustomMax) {
    const customMin = hasCustomMin ? Number(minPrice) : null;
    const customMax = hasCustomMax ? Number(maxPrice) : null;

    if (customMin !== null && price < customMin) {
      return false;
    }

    if (customMax !== null && price > customMax) {
      return false;
    }

    return true;
  }

  const selectedRange = PRICE_RANGE_OPTIONS[priceRangeKey] || PRICE_RANGE_OPTIONS.all;

  if (selectedRange.min !== null && price < selectedRange.min) {
    return false;
  }

  if (selectedRange.max !== null && price > selectedRange.max) {
    return false;
  }

  return true;
}

export default function BoutiquePage({ products }) {
  const safeProducts = Array.isArray(products) ? products : [];

  const activeProducts = useMemo(
    () => safeProducts.filter((product) => isDisplayableProduct(product)),
    [safeProducts]
  );

  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [selectedPriceRangeKey, setSelectedPriceRangeKey] = useState('all');
  const [pendingMinPrice, setPendingMinPrice] = useState('');
  const [pendingMaxPrice, setPendingMaxPrice] = useState('');
  const [appliedMinPrice, setAppliedMinPrice] = useState('');
  const [appliedMaxPrice, setAppliedMaxPrice] = useState('');

  function handleCategoryChange(nextCategory) {
    setSelectedCategory(nextCategory);
  }

  function handlePriceRangeChange(nextPriceRangeKey) {
    setSelectedPriceRangeKey(nextPriceRangeKey);
  }

  function handleApplyFilters() {
    setAppliedMinPrice(pendingMinPrice);
    setAppliedMaxPrice(pendingMaxPrice);
  }

  function handleResetFilters() {
    setSelectedCategory('Tous');
    setSelectedPriceRangeKey('all');
    setPendingMinPrice('');
    setPendingMaxPrice('');
    setAppliedMinPrice('');
    setAppliedMaxPrice('');
  }

  const filteredProducts = useMemo(() => {
    return activeProducts.filter((product) => {
      const categoryOk = matchesCategory(product.category, selectedCategory);
      const priceOk = matchesPriceRange(
        product.price,
        selectedPriceRangeKey,
        appliedMinPrice,
        appliedMaxPrice
      );

      return categoryOk && priceOk;
    });
  }, [
    activeProducts,
    selectedCategory,
    selectedPriceRangeKey,
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

      <Header products={activeProducts} />

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
              category={selectedCategory}
              onCategoryChange={handleCategoryChange}
              priceRangeKey={selectedPriceRangeKey}
              onPriceRangeKeyChange={handlePriceRangeChange}
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

export async function getServerSideProps(context) {
  const protocol =
    process.env.NODE_ENV === 'development' ? 'http' : 'https';

  const host = context.req.headers.host;
  const baseUrl = `${protocol}://${host}`;

  try {
    const response = await fetch(`${baseUrl}/api/products`);

    if (!response.ok) {
      throw new Error('API products error');
    }

    const products = await response.json();

    return {
      props: {
        products,
      },
    };
  } catch (error) {
    return {
      props: {
        products: fallbackProducts,
      },
    };
  }
}