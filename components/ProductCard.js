// components/ProductCard.js
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { FiHeart } from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import {
  getActiveProductPrice,
  getMainProductImage,
  getProductBasePrice,
  getProductStatus,
  hasValidPromoPrice,
  isSoldOut,
} from '../utils/product';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { useCart } from '../context/CartContext';
import ProductImageFrame from './product/ProductImageFrame';
import styles from '../styles/ProductCard.module.css';

function normalizeColorName(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export default function ProductCard({ product }) {
  const router = useRouter();
  const status = getProductStatus(product);
  const soldOut = isSoldOut(product);
  const hasPromo = hasValidPromoPrice(product);
  const activePrice = getActiveProductPrice(product);
  const basePrice = getProductBasePrice(product);
  const mainProductImage = getMainProductImage(product);

  const { isAuthenticated, isAuthReady, isAdmin } = useAuth();
  const { isFavorite, toggleFavorite, isSyncingFavorites } = useFavorites();
  const { items, addToCart } = useCart();
  const favorite = isFavorite(product.slug);

  const [cartMessage, setCartMessage] = useState('');
  const [cartMessageType, setCartMessageType] = useState('');
  const cartMessageTimeoutRef = useRef(null);

  const availableColors = useMemo(() => {
    if (!Array.isArray(product?.colors)) {
      return [];
    }

    return product.colors.filter((color) => {
      const colorName = normalizeColorName(color?.name);
      return colorName && Number(color?.quantity || 0) > 0;
    });
  }, [product?.colors]);

  const hasColorVariants = availableColors.length > 0;
  const hasSingleAvailableColor = availableColors.length === 1;
  const singleAvailableColor = hasSingleAvailableColor ? availableColors[0] : null;
  const singleAvailableColorName = normalizeColorName(singleAvailableColor?.name);

  const quantityInCart = items
    .filter((item) => {
      if (item.slug !== product.slug) {
        return false;
      }

      if (hasSingleAvailableColor) {
        return normalizeColorName(item.color) === singleAvailableColorName;
      }

      if (hasColorVariants) {
        return false;
      }

      return !normalizeColorName(item.color);
    })
    .reduce((sum, item) => sum + (item.quantity || 0), 0);

  const effectiveStock = hasSingleAvailableColor
    ? Math.max(0, Number(singleAvailableColor?.quantity || 0))
    : Math.max(0, Number(product?.stock || 0));

  const remainingAvailable = Math.max(0, effectiveStock - quantityInCart);
  const productPath = `/boutique/${product.slug}`;
  const isFavoriteDisabled = !isAuthReady || isSyncingFavorites || isAdmin;
  const isAddToCartDisabled = isAdmin;

  useEffect(() => {
    return () => {
      if (cartMessageTimeoutRef.current) {
        clearTimeout(cartMessageTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setCartMessage('');
    setCartMessageType('');
  }, [product.slug]);

  function showCartMessage(message, type) {
    if (cartMessageTimeoutRef.current) {
      clearTimeout(cartMessageTimeoutRef.current);
    }

    setCartMessage(message);
    setCartMessageType(type);

    cartMessageTimeoutRef.current = setTimeout(() => {
      setCartMessage('');
      setCartMessageType('');
    }, 1800);
  }

  function navigateToProduct() {
    if (!product?.slug) {
      return;
    }

    router.push(productPath);
  }

  function handleImageClick() {
    navigateToProduct();
  }

  function handleImageKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      navigateToProduct();
    }
  }

  function handleNameClick() {
    navigateToProduct();
  }

  async function handleToggleFavorite(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthReady || isAdmin) {
      return;
    }

    if (!isAuthenticated) {
      const nextPath =
        typeof window !== 'undefined'
          ? `${window.location.pathname}${window.location.search}${window.location.hash}`
          : router.asPath || '/';

      router.push(`/connexion?redirect=${encodeURIComponent(nextPath)}`);
      return;
    }

    await toggleFavorite(product.slug);
  }

  function handleAddToCart(event) {
    event.preventDefault();
    event.stopPropagation();

    if (isAdmin || !product || soldOut) {
      return;
    }

    if (hasColorVariants && !hasSingleAvailableColor) {
      router.push(productPath);
      return;
    }

    if (remainingAvailable <= 0) {
      showCartMessage('Stock maximum atteint', 'error');
      return;
    }

    addToCart({
      slug: product.slug,
      name: product.name,
      price: activePrice,
      stock: effectiveStock,
      imageUrl: singleAvailableColor?.imageUrl || product.imageUrl,
      category: product.category,
      color: hasSingleAvailableColor ? singleAvailableColorName : '',
    });

    showCartMessage('Ajouté au panier', 'success');
  }

  function getButtonLabel() {
    if (isAdmin) {
      return 'Indisponible en mode admin';
    }

    if (hasColorVariants && !hasSingleAvailableColor) {
      return 'Choisir une couleur';
    }

    return 'Ajouter au panier';
  }

  function getFavoriteAriaLabel() {
    if (isAdmin) {
      return 'Favoris indisponibles en mode admin';
    }

    return favorite ? 'Retirer des favoris' : 'Ajouter aux favoris';
  }

  return (
    <article className={styles.card}>
      <div className={styles.imageWrapper}>
        <div
          className={styles.imageLink}
          role="link"
          tabIndex={0}
          aria-label={`Voir le produit ${product.name}`}
          onClick={handleImageClick}
          onKeyDown={handleImageKeyDown}
        >
          <div className={styles.imageFrame}>
            <ProductImageFrame
              image={mainProductImage}
              src={product.imageUrl}
              alt={product.name}
              frameClassName={styles.sharedImageFrame}
              viewportClassName={styles.sharedImageViewport}
              imageClassName={styles.sharedImage}
            />
          </div>

          {soldOut ? <span className={styles.badge}>{status.label}</span> : null}
        </div>

        {!soldOut && (
          <div className={styles.hoverOverlay}>
            <button
              type="button"
              className={`${styles.favoriteButton} ${
                favorite ? styles.favoriteButtonActive : ''
              }`}
              aria-label={getFavoriteAriaLabel()}
              aria-pressed={favorite}
              onClick={handleToggleFavorite}
              disabled={isFavoriteDisabled}
            >
              {favorite ? <FaHeart /> : <FiHeart />}
            </button>

            <div className={styles.cartActionBlock}>
              <button
                type="button"
                className={styles.addToCartButton}
                onClick={handleAddToCart}
                disabled={isAddToCartDisabled}
              >
                {getButtonLabel()}
              </button>

              {cartMessage ? (
                <p
                  className={`${styles.cartMessage} ${
                    cartMessageType === 'success'
                      ? styles.cartMessageSuccess
                      : styles.cartMessageError
                  }`}
                >
                  {cartMessage}
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <div className={styles.content}>
        <button
          type="button"
          className={styles.nameLinkButton}
          onClick={handleNameClick}
          aria-label={`Voir le produit ${product.name}`}
        >
          <h2 className={styles.name}>{product.name}</h2>
        </button>

        <p className={styles.category}>{product.category}</p>

        <div className={styles.meta}>
          <div className={styles.priceBlock}>
            {hasPromo ? (
              <>
                <span className={styles.priceOld}>{basePrice.toFixed(2)} €</span>
                <span className={styles.pricePromo}>{activePrice.toFixed(2)} €</span>
              </>
            ) : (
              <span className={styles.price}>{basePrice.toFixed(2)} €</span>
            )}
          </div>

          {!soldOut ? <span className={styles.stock}>{status.label}</span> : null}
        </div>
      </div>
    </article>
  );
}