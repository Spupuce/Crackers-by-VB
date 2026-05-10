// pages/boutique.js

import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import ShopSidebar from '../components/ShopSidebar';
import { products as fallbackProducts } from '../data/products';
import styles from '../styles/Boutique.module.css';

export default function BoutiquePage({ products }) {
  const safeProducts = Array.isArray(products) ? products : [];

  // Si les produits viennent de l’API (nouveau modèle) : on suppose déjà !isArchived
  // Si ce sont les fallback (ancien modèle) : on garde le filtre isActive
  const activeProducts = safeProducts.filter((product) =>
    typeof product.isArchived === 'boolean'
      ? !product.isArchived
      : product.isActive
  );

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
            <ShopSidebar />

            <section className={styles.productsSection}>
              <p className={styles.results}>
                {activeProducts.length} produits trouvés
              </p>

              <div className={styles.grid}>
                {activeProducts.map((product) => (
                  <ProductCard key={product._id || product.slug} product={product} />
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