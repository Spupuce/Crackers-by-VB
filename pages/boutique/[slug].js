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
import { sanitizeImages } from '../../utils/productForm';
import styles from '../../styles/ProductDetail.module.css';

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getFirstSanitizedImage(image) {
  return sanitizeImages([image])[0] || null;
}

export default function ProductDetailPage({ product }) {
  const normalizedProductImages = useMemo(() => {
    return sanitizeImages(product?.images);
  }, [product?.images]);

  const defaultImage =
    normalizeText(product?.imageUrl) || normalizedProductImages[0]?.url || '';

  const [selectedColor, setSelectedColor] = useState('');
  const [selectedImageUrl, setSelectedImageUrl] = useState('');

  const availableColors = useMemo(() => {
    if (!Array.isArray(product?.colors)) {
      return [];
    }

    return product.colors
      .filter((color) => !color?.isArchived)
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

    function addGalleryItem({
      type,
      image,
      label,
      colorName = '',
    }) {
      const normalizedImage = getFirstSanitizedImage(image);

      if (!normalizedImage?.url || usedImages.has(normalizedImage.url)) {
        return;
      }

      items.push({
        type,
        imageUrl: normalizedImage.url,
        label,
        colorName,
        publicId: normalizedImage.publicId,
        offsetX: normalizedImage.offsetX,
        offsetY: normalizedImage.offsetY,
        zoom: normalizedImage.zoom,
      });

      usedImages.add(normalizedImage.url);
    }

    if (defaultImage) {
      const defaultImageData =
        normalizedProductImages.find((image) => image.url === defaultImage) ||
        getFirstSanitizedImage(defaultImage);

      addGalleryItem({
        type: 'default',
        image: defaultImageData,
        label: 'Image principale',
      });
    }

    normalizedProductImages.forEach((image, index) => {
      addGalleryItem({
        type: 'gallery',
        image,
        label: `Vue ${index + 1}`,
      });
    });

    if (Array.isArray(product?.colors)) {
      product.colors.forEach((color) => {
        if (color?.isArchived) {
          return;
        }

        const colorName = normalizeText(color?.name);

        if (!colorName) {
          return;
        }

        const normalizedColorImages = sanitizeImages(color?.images);
        const fallbackColorImage = normalizeText(color?.imageUrl);

        if (normalizedColorImages.length > 0) {
          normalizedColorImages.forEach((image, index) => {
            addGalleryItem({
              type: 'color',
              image,
              label:
                index === 0
                  ? colorName
                  : `${colorName} - vue ${index + 1}`,
              colorName,
            });
          });

          return;
        }

        addGalleryItem({
          type: 'color',
          image: fallbackColorImage,
          label: colorName,
          colorName,
        });
      });
    }

    return items;
  }, [defaultImage, normalizedProductImages, product?.colors]);

  const selectedGalleryImage = useMemo(() => {
    if (selectedImageUrl) {
      return selectedImageUrl;
    }

    if (selectedColor) {
      const matchingItem = galleryItems.find(
        (item) =>
          item.type === 'color' &&
          normalizeText(item.colorName).toLowerCase() ===
            normalizeText(selectedColor).toLowerCase()
      );

      return (
        matchingItem?.imageUrl ||
        defaultImage ||
        galleryItems[0]?.imageUrl ||
        ''
      );
    }

    return defaultImage || galleryItems[0]?.imageUrl || '';
  }, [selectedImageUrl, selectedColor, galleryItems, defaultImage]);

  function handleGallerySelect(item) {
    if (!item) {
      return;
    }

    if (item.type === 'color' && item.colorName) {
      setSelectedColor(item.colorName);
      setSelectedImageUrl('');
      return;
    }

    setSelectedImageUrl(item.imageUrl || '');
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