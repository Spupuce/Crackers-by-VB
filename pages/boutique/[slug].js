// pages/boutique/[slug].js

import Head from 'next/head';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ProductGallery from '../../components/ProductGallery';
import ProductPurchasePanel from '../../components/ProductPurchasePanel';
import { products as fallbackProducts } from '../../data/products';
import styles from '../../styles/ProductDetail.module.css';

export default function ProductDetailPage({ product }) {
  if (!product) {
    return (
      <>
        <Header />
        <main className={styles.page}>
          <div className={styles.container}>
            <Link href="/boutique" passHref>
              <a className={styles.backLink}>
                <FiArrowLeft />
                <span>Retour à la boutique</span>
              </a>
            </Link>

            <p className={styles.notFound}>Produit introuvable.</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{product.name} - Crackers by VB</title>
        <meta name="description" content={product.description || ''} />
      </Head>

      <Header />

      <main className={styles.page}>
        <div className={styles.container}>
          <Link href="/boutique" passHref>
            <a className={styles.backLink}>
              <FiArrowLeft />
              <span>Retour à la boutique</span>
            </a>
          </Link>

          <div className={styles.layout}>
            <ProductGallery
              images={product.gallery?.length ? product.gallery : [product.imageUrl]}
              productName={product.name}
            />
            <ProductPurchasePanel product={product} />
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

export async function getServerSideProps(context) {
  const { slug } = context.params;

  const protocol =
    process.env.NODE_ENV === 'development' ? 'http' : 'https';

  const host = context.req.headers.host;
  const baseUrl = `${protocol}://${host}`;

  try {
    const response = await fetch(`${baseUrl}/api/products/${slug}`);

    if (response.ok) {
      const product = await response.json();

      if (!product.isArchived) {
        return {
          props: {
            product,
          },
        };
      }
    }
  } catch (error) {
  }

  const fallbackProduct =
    fallbackProducts.find(
      (item) => item.slug === slug && item.isActive
    ) || null;

  return {
    props: {
      product: fallbackProduct,
    },
  };
}