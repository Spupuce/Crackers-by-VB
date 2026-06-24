// pages/boutique/[slug].js
import { useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ProductGallery from '../../components/ProductGallery';
import ProductPurchasePanel from '../../components/ProductPurchasePanel';
import { products as fallbackProducts } from '../../data/products';
import styles from '../../styles/ProductDetail.module.css';

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export default function ProductDetailPage({ product }) {
  const defaultImage = normalizeText(product?.imageUrl);
  const [selectedColor, setSelectedColor] = useState('');

  const availableColors = useMemo(() => {
    if (!Array.isArray(product?.colors)) {
      return [];
    }

    return product.colors
      .map((color) => ({
        ...color,
        name: normalizeText(color?.name),
        quantity: Math.max(0, Number(color?.quantity || 0)),
      }))
      .filter((color) => color.name);
  }, [product?.colors]);

  const selectedColorData = useMemo(() => {
    if (!selectedColor) {
      return null;
    }

    return (
      availableColors.find(
        (color) =>
          normalizeText(color.name).toLowerCase() ===
          normalizeText(selectedColor).toLowerCase()
      ) || null
    );
  }, [availableColors, selectedColor]);

  const shouldShowSelectedColorSoldOutBadge =
    !!selectedColor && !!selectedColorData && selectedColorData.quantity <= 0;

  const galleryItems = useMemo(() => {
    const items = [];
    const usedImages = new Set();

    if (defaultImage) {
      items.push({
        type: 'default',
        imageUrl: defaultImage,
        label: 'Image principale',
        colorName: '',
      });
      usedImages.add(defaultImage);
    }

    if (Array.isArray(product?.colors)) {
      product.colors.forEach((color) => {
        const colorName = normalizeText(color?.name);
        const imageUrl = normalizeText(color?.imageUrl);

        if (!colorName || !imageUrl || usedImages.has(imageUrl)) {
          return;
        }

        items.push({
          type: 'color',
          imageUrl,
          label: colorName,
          colorName,
        });
        usedImages.add(imageUrl);
      });
    }

    if (Array.isArray(product?.gallery)) {
      product.gallery.forEach((imageUrl, index) => {
        const normalizedImage = normalizeText(imageUrl);

        if (!normalizedImage || usedImages.has(normalizedImage)) {
          return;
        }

        items.push({
          type: 'gallery',
          imageUrl: normalizedImage,
          label: `Vue ${index + 1}`,
          colorName: '',
        });
        usedImages.add(normalizedImage);
      });
    }

    return items;
  }, [defaultImage, product?.colors, product?.gallery]);

  const selectedGalleryImage = useMemo(() => {
    if (!selectedColor) {
      return defaultImage || galleryItems[0]?.imageUrl || '';
    }

    const matchingItem = galleryItems.find(
      (item) =>
        item.type === 'color' &&
        normalizeText(item.colorName).toLowerCase() ===
          normalizeText(selectedColor).toLowerCase()
    );

    return matchingItem?.imageUrl || defaultImage || galleryItems[0]?.imageUrl || '';
  }, [defaultImage, galleryItems, selectedColor]);

  function handleGallerySelect(item) {
    if (!item) {
      return;
    }

    if (item.type === 'color' && item.colorName) {
      setSelectedColor(item.colorName);
      return;
    }

    setSelectedColor('');
  }

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
              items={galleryItems}
              productName={product.name}
              activeImage={selectedGalleryImage}
              onSelect={handleGallerySelect}
              showSoldOutBadge={shouldShowSelectedColorSoldOutBadge}
              soldOutBadgeText="Rupture sur cette couleur"
            />
            <ProductPurchasePanel
              product={product}
              selectedColor={selectedColor}
              onSelectedColorChange={setSelectedColor}
            />
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