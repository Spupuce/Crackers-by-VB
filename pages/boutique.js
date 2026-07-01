// pages/boutique.js

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import ShopSidebar from '../components/ShopSidebar';
import { products as fallbackProducts } from '../data/products';
import {
  getActiveProductPrice,
  hasValidPromoPrice,
  isDisplayableProduct,
} from '../utils/product';
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

  const selectedRange =
    PRICE_RANGE_OPTIONS[priceRangeKey] || PRICE_RANGE_OPTIONS.all;

  if (selectedRange.min !== null && price < selectedRange.min) {
    return false;
  }

  if (selectedRange.max !== null && price > selectedRange.max) {
    return false;
  }

  return true;
}

function matchesSearch(product, searchTerm) {
  const normalizedSearch = normalizeValue(searchTerm);

  if (!normalizedSearch) {
    return true;
  }

  const normalizedName = normalizeValue(product.name);
  const normalizedCategory = normalizeValue(product.category);
  const normalizedSlug = normalizeValue(product.slug);
  const normalizedDescription = normalizeValue(product.description);

  return (
    normalizedName.includes(normalizedSearch) ||
    normalizedCategory.includes(normalizedSearch) ||
    normalizedSlug.includes(normalizedSearch) ||
    normalizedDescription.includes(normalizedSearch)
  );
}

export default function BoutiquePage({ products }) {
  const router = useRouter();
  const safeProducts = Array.isArray(products) ? products : [];

  const activeProducts = useMemo(
    () => safeProducts.filter((product) => isDisplayableProduct(product)),
    [safeProducts]
  );

  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [selectedPriceRangeKey, setSelectedPriceRangeKey] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [promoOnly, setPromoOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const querySearch =
      typeof router.query.search === 'string' ? router.query.search : '';

    setSearchTerm(querySearch);
  }, [router.isReady, router.query.search]);

  function handleCategoryChange(nextCategory) {
    setSelectedCategory(nextCategory);
  }

  function handlePriceRangeChange(nextPriceRangeKey) {
    setSelectedPriceRangeKey(nextPriceRangeKey);
  }

  function handleResetFilters() {
    setSelectedCategory('Tous');
    setSelectedPriceRangeKey('all');
    setMinPrice('');
    setMaxPrice('');
    setPromoOnly(false);
    setSearchTerm('');

    const nextQuery = { ...router.query };
    delete nextQuery.search;

    router.replace(
      {
        pathname: router.pathname,
        query: nextQuery,
      },
      undefined,
      { shallow: true }
    );
  }

  const filteredProducts = useMemo(() => {
    return activeProducts.filter((product) => {
      const activePrice = getActiveProductPrice(product);
      const categoryOk = matchesCategory(product.category, selectedCategory);
      const priceOk = matchesPriceRange(
        activePrice,
        selectedPriceRangeKey,
        minPrice,
        maxPrice
      );
      const promoOk = !promoOnly || hasValidPromoPrice(product);
      const searchOk = matchesSearch(product, searchTerm);

      return categoryOk && priceOk && promoOk && searchOk;
    });
  }, [
    activeProducts,
    selectedCategory,
    selectedPriceRangeKey,
    minPrice,
    maxPrice,
    promoOnly,
    searchTerm,
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
              minPrice={minPrice}
              maxPrice={maxPrice}
              onMinPriceChange={setMinPrice}
              onMaxPriceChange={setMaxPrice}
              promoOnly={promoOnly}
              onPromoOnlyChange={setPromoOnly}
              onApplyFilters={() => {}}
              onResetFilters={handleResetFilters}
            />

            <section className={styles.productsSection}>
              <p className={styles.results}>
                {filteredProducts.length} produits trouvés
                {searchTerm ? ` pour “${searchTerm}”` : ''}
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
      throw new Error(`API products error: ${response.status}`);
    }

    const products = await response.json();

    return {
      props: {
        products,
      },
    };
  } catch (error) {
    console.error('Boutique getServerSideProps fallback:', error);

    return {
      props: {
        products: fallbackProducts,
      },
    };
  }
}