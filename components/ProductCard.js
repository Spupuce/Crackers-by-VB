// components/ProductCard.js

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiHeart } from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import {
  getActiveProductPrice,
  getProductBasePrice,
  getProductStatus,
  hasValidPromoPrice,
  isSoldOut,
} from '../utils/product';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { useCart } from '../context/CartContext';
import styles from '../styles/ProductCard.module.css';

export default function ProductCard({ product }) {
  const router = useRouter();
  const status = getProductStatus(product);
  const soldOut = isSoldOut(product);
  const hasPromo = hasValidPromoPrice(product);
  const activePrice = getActiveProductPrice(product);
  const basePrice = getProductBasePrice(product);

  const { isAuthenticated, isAuthReady } = useAuth();
  const { isFavorite, toggleFavorite, isSyncingFavorites } = useFavorites();
  const { items, addToCart } = useCart();
  const favorite = isFavorite(product.slug);

  const [cartMessage, setCartMessage] = useState('');
  const [cartMessageType, setCartMessageType] = useState('');
  const cartMessageTimeoutRef = useRef(null);

  const quantityInCart =
    items.find((item) => item.slug === product.slug)?.quantity || 0;

  const remainingAvailable = Math.max(0, (product.stock || 0) - quantityInCart);

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

  async function handleToggleFavorite(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthReady) {
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

    if (!product || soldOut) {
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
      stock: product.stock,
      imageUrl: product.imageUrl,
      category: product.category,
    });

    showCartMessage('Ajouté au panier', 'success');
  }

  return (
    <article className={styles.card}>
      <Link href={`/boutique/${product.slug}`} passHref>
        <a className={styles.imageLink}>
          <div className={styles.imageWrapper}>
            <img
              src={product.imageUrl}
              alt={product.name}
              className={styles.image}
            />

            {soldOut ? (
              <span className={styles.badge}>{status.label}</span>
            ) : null}

            {!soldOut && (
              <div className={styles.hoverOverlay}>
                <button
                  type="button"
                  className={`${styles.favoriteButton} ${
                    favorite ? styles.favoriteButtonActive : ''
                  }`}
                  aria-label={
                    favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'
                  }
                  aria-pressed={favorite}
                  onClick={handleToggleFavorite}
                  disabled={!isAuthReady || isSyncingFavorites}
                >
                  {favorite ? <FaHeart /> : <FiHeart />}
                </button>

                <div className={styles.cartActionBlock}>
                  <button
                    type="button"
                    className={styles.addToCartButton}
                    onClick={handleAddToCart}
                  >
                    Ajouter au panier
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
        </a>
      </Link>

      <div className={styles.content}>
        <Link href={`/boutique/${product.slug}`} passHref>
          <a className={styles.nameLink}>
            <h2 className={styles.name}>{product.name}</h2>
          </a>
        </Link>

        <p className={styles.category}>{product.category}</p>

        <div className={styles.meta}>
          <div className={styles.priceBlock}>
            {hasPromo ? (
              <>
                <span className={styles.priceOld}>
                  {basePrice.toFixed(2)} €
                </span>
                <span className={styles.pricePromo}>
                  {activePrice.toFixed(2)} €
                </span>
              </>
            ) : (
              <span className={styles.price}>
                {basePrice.toFixed(2)} €
              </span>
            )}
          </div>

          {!soldOut ? (
            <span className={styles.stock}>{status.label}</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}