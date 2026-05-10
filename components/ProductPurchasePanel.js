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

  const [showNotifyForm, setShowNotifyForm] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifySuccess, setNotifySuccess] = useState(false);
  const [notifyError, setNotifyError] = useState('');

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

  const handleOpenNotifyForm = () => {
    setShowNotifyForm(true);
    setNotifyError('');
  };

  const handleCancelNotify = () => {
    setShowNotifyForm(false);
    setNotifyError('');
  };

  const handleSubmitNotify = async () => {
    setNotifyError('');

    if (!notifyEmail || !notifyEmail.includes('@')) {
      setNotifyError('Merci de renseigner une adresse e-mail valide.');
      return;
    }

    try {
      setNotifyLoading(true);

      const response = await fetch(
        `/api/products/${product._id}/restock-requests`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: notifyEmail }),
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la demande.');
      }

      setNotifySuccess(true);
      setShowNotifyForm(false);
    } catch (error) {
      setNotifyError(
        "Une erreur s'est produite. Merci de réessayer dans quelques instants."
      );
    } finally {
      setNotifyLoading(false);
    }
  };

  return (
    <div className={styles.purchasePanel}>
      <h1 className={styles.productTitle}>{product.name}</h1>
      <p className={styles.productCategory}>{product.category}</p>

      <div className={styles.priceRow}>
        <span className={styles.productPrice}>
          {product.price.toFixed(2)} €
        </span>

        {soldOut && (
          <span className={styles.soldOutBadge}>Article épuisé</span>
        )}

        {!soldOut && (
          <span className={styles.stockBadge}>En stock</span>
        )}
      </div>

      <div className={styles.separator} />

      <p className={styles.description}>{product.description}</p>

      {soldOut ? (
        <div className={styles.notifyBlock}>
          <p className={styles.notifyText}>
            Cet article est actuellement en rupture de stock. Vous pouvez me
            signaler votre intérêt et je vous contacterai dès qu&apos;il sera à
            nouveau disponible.
          </p>

          {notifySuccess && (
            <p className={styles.notifySuccess}>
              Votre demande a bien été enregistrée. Merci !
            </p>
          )}

          {notifyError && (
            <p className={styles.notifyError}>{notifyError}</p>
          )}

          {!showNotifyForm ? (
            <button
              type="button"
              className={styles.notifyButton}
              onClick={handleOpenNotifyForm}
            >
              Me prévenir quand disponible
            </button>
          ) : (
            <div className={styles.notifyForm}>
              <div className={styles.notifyFormControls}>
                <button
                  type="button"
                  className={styles.notifyCancel}
                  onClick={handleCancelNotify}
                >
                  Annuler
                </button>

                <input
                  type="email"
                  className={styles.notifyInput}
                  placeholder="Votre adresse e-mail"
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                />

                <button
                  type="button"
                  className={styles.notifySubmit}
                  onClick={handleSubmitNotify}
                  disabled={notifyLoading}
                >
                  {notifyLoading ? 'Envoi en cours...' : 'Envoyer la demande'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
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
          <span>
            {soldOut ? 'Article indisponible' : 'Ajouter au panier'}
          </span>
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