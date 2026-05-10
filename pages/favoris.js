// pages/favoris.js

import { useMemo } from 'react';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import { useFavorites } from '../context/FavoritesContext';
import { products as fallbackProducts } from '../data/products';
import styles from '../styles/Boutique.module.css';
import Link from 'next/link';

export default function FavorisPage({ products }) {
  const { favorites } = useFavorites();

  const favoriteProducts = useMemo(
    () => products.filter((product) => favorites.includes(product.slug)),
    [products, favorites]
  );

  const count = favoriteProducts.length;

  return (
    <>
      <Head>
        <title>Mes favoris - Crackers by VB</title>
        <meta
          name="description"
          content="Retrouvez toutes vos créations artisanales favorites."
        />
      </Head>

      <Header />

      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.intro}>
            <h1 className={styles.title}>Mes Favoris</h1>
            <p className={styles.subtitle}>
              {count === 0
                ? 'Aucun produit dans vos favoris pour le moment'
                : `${count} produit${count > 1 ? 's' : ''} dans vos favoris`}
            </p>
          </div>

          {count > 0 ? (
            <section className={styles.productsSection}>
              {/* Pas de sidebar sur cette page, on garde l’espace pour la grille */}
              <div className={styles.grid}>
                {favoriteProducts.map((product) => (
                  <ProductCard
                    key={product._id || product.slug}
                    product={product}
                  />
                ))}
              </div>
            </section>
          ) : (
            <section className={styles.productsSection}>
              <p className={styles.results}>
                Vous n’avez encore sélectionné aucun favori.
              </p>
              <Link href="/boutique" passHref>
                <a className={styles.emptyCta}>Découvrir la boutique</a>
              </Link>
            </section>
          )}
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
        products: fallbackProducts.filter((product) => product.isActive),
      },
    };
  }
}