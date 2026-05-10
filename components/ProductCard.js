// components/ProductCard.js

import Link from 'next/link';
import { FiHeart } from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import { getProductStatus, isSoldOut } from '../utils/product';
import { useFavorites } from '../context/FavoritesContext';
import styles from '../styles/ProductCard.module.css';

export default function ProductCard({ product }) {
  const status = getProductStatus(product);
  const soldOut = isSoldOut(product);

  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(product.slug);

  function handleToggleFavorite(event) {
    event.preventDefault();
    event.stopPropagation();
    toggleFavorite(product.slug);
  }

  function handleAddToCart(event) {
    event.preventDefault();
    event.stopPropagation();
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
                  onClick={handleToggleFavorite}
                >
                  {favorite ? <FaHeart /> : <FiHeart />}
                </button>

                <button
                  type="button"
                  className={styles.addToCartButton}
                  onClick={handleAddToCart}
                >
                  Ajouter au panier
                </button>
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
          <span className={styles.price}>
            {Number(product.price).toFixed(2)} €
          </span>

          {!soldOut ? (
            <span className={styles.stock}>{status.label}</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}