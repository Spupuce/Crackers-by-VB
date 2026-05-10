// pages/index.js

import Head from 'next/head';
import Header from '../components/Header';
import Hero from '../components/Hero';
import FeaturedProducts from '../components/FeaturedProducts';
import Footer from '../components/Footer';
import { products as fallbackProducts } from '../data/products';

export default function HomePage({ featuredProducts }) {
  return (
    <>
      <Head>
        <title>Crackers by VB</title>
        <meta
          name="description"
          content="Créations artisanales couture, crochet et tricot pour petits et grands."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Header />

      <main>
        <Hero />
        <FeaturedProducts products={featuredProducts} />
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

    const featuredProducts = products
      .filter((product) =>
        typeof product.isArchived === 'boolean'
          ? !product.isArchived
          : product.isActive
      )
      .slice(0, 4);

    return {
      props: {
        featuredProducts,
      },
    };
  } catch (error) {
    const featuredProducts = fallbackProducts
      .filter((product) => product.isActive)
      .slice(0, 4);

    return {
      props: {
        featuredProducts,
      },
    };
  }
}