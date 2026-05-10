// components/ProductPurchasePanel.js

import { useState } from 'react';
import { FiHeart, FiShoppingCart } from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import { isSoldOut } from '../utils/product';
import { useFavorites } from '../context/FavoritesContext';
import styles from '../styles/ProductDetail.module.css';

export default function ProductPurchasePanel({ product }) {
  const soldOut = isSoldOut(product);
  const [quantity, setQuantity] = useState(1);

  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(product.slug);

  const decreaseQuantity = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const increaseQuantity = () => {
    setQuantity((prev) => Math.min(product.stock || 1, prev + 1));
  };

  const handleToggleFavorite = () => {
    toggleFavorite(product.slug);
  };

  return (
    <div className={styles.purchasePanel}>
      <h1 className={styles.productTitle}>{product.name}</h1>
      <p className={styles.productCategory}>{product.category}</p>

      <div className={styles.priceRow}>
        <span className={styles.productPrice}>
          {product.price.toFixed(2)} €
        </span>

        {!soldOut && (
          <span className={styles.stockBadge}>En stock</span>
        )}
      </div>

      <div className={styles.separator} />

      <p className={styles.description}>{product.description}</p>

      {!soldOut && (
        <div className={styles.quantityBlock}>
          <p className={styles.quantityLabel}>Quantité</p>

          <div className={styles.quantityControls}>
            <button
              type="button"
              className={styles.quantityButton}
              onClick={decreaseQuantity}
            >
              -
            </button>

            <span className={styles.quantityValue}>{quantity}</span>

            <button
              type="button"
              className={styles.quantityButton}
              onClick={increaseQuantity}
            >
              +
            </button>
          </div>

          <p className={styles.stockInfo}>
            Maximum disponible : {product.stock}
          </p>
        </div>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.addToCartButton}
          disabled={soldOut}
        >
          <FiShoppingCart />
          <span>{soldOut ? 'Article indisponible' : 'Ajouter au panier'}</span>
        </button>

        <button
          type="button"
          className={`${styles.favoriteButton} ${
            favorite ? styles.favoriteButtonActive : ''
          }`}
          onClick={handleToggleFavorite}
        >
          {favorite ? <FaHeart /> : <FiHeart />}
          <span>
            {favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          </span>
        </button>
      </div>
    </div>
  );
}