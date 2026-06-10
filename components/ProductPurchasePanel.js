// components/ProductPurchasePanel.js

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { FiHeart, FiShoppingCart } from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import {
  getActiveProductPrice,
  getProductBasePrice,
  hasValidPromoPrice,
  isSoldOut,
} from '../utils/product';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { useCart } from '../context/CartContext';
import styles from '../styles/ProductDetail.module.css';

export default function ProductPurchasePanel({ product }) {
  const router = useRouter();
  const soldOut = isSoldOut(product);
  const hasPromo = hasValidPromoPrice(product);
  const activePrice = getActiveProductPrice(product);
  const basePrice = getProductBasePrice(product);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [lastAddedQuantity, setLastAddedQuantity] = useState(0);

  const [showNotifyForm, setShowNotifyForm] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifySuccess, setNotifySuccess] = useState(false);
  const [notifyError, setNotifyError] = useState('');

  const { user, isAuthenticated, isAuthReady } = useAuth();
  const { isFavorite, toggleFavorite, isSyncingFavorites } = useFavorites();
  const { items, addToCart, openCart } = useCart();
  const favorite = isFavorite(product.slug);

  useEffect(() => {
    if (isAuthenticated && user?.email) {
      setNotifyEmail(user.email);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    setJustAdded(false);
    setLastAddedQuantity(0);
  }, [quantity, product?.slug]);

  useEffect(() => {
    if (!justAdded) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setJustAdded(false);
      setLastAddedQuantity(0);
    }, 2500);

    return () => window.clearTimeout(timeout);
  }, [justAdded]);

  const quantityInCart =
    items.find((item) => item.slug === product.slug)?.quantity || 0;

  const remainingAvailable = Math.max(0, (product.stock || 0) - quantityInCart);

  const decreaseQuantity = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
    setJustAdded(false);
    setLastAddedQuantity(0);
  };

  const increaseQuantity = () => {
    setQuantity((prev) => Math.min(product.stock || 1, prev + 1));
    setJustAdded(false);
    setLastAddedQuantity(0);
  };

  const handleToggleFavorite = async () => {
    if (!isAuthReady) {
      return;
    }

    if (!isAuthenticated) {
      router.push('/connexion');
      return;
    }

    await toggleFavorite(product.slug);
  };

  const handleOpenNotifyForm = () => {
    setShowNotifyForm(true);
    setNotifySuccess(false);
    setNotifyError('');
  };

  const handleCancelNotify = () => {
    setShowNotifyForm(false);
    setNotifyError('');
  };

  const handleSubmitNotify = async () => {
    setNotifyError('');
    setNotifySuccess(false);

    if (!product?.slug) {
      setNotifyError(
        "Impossible d'envoyer la demande pour ce produit pour le moment."
      );
      return;
    }

    if (!notifyEmail || !notifyEmail.includes('@')) {
      setNotifyError('Merci de renseigner une adresse e-mail valide.');
      return;
    }

    try {
      setNotifyLoading(true);

      const response = await fetch(
        `/api/products/${product.slug}/restock-requests`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: notifyEmail }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || 'Erreur lors de la demande.');
      }

      setNotifySuccess(true);
      setShowNotifyForm(false);
      setNotifyError('');
    } catch (error) {
      setNotifyError(
        error.message ||
          "Une erreur s'est produite. Merci de réessayer dans quelques instants."
      );
    } finally {
      setNotifyLoading(false);
    }
  };

  function handleAddToCart() {
    if (!product || soldOut || remainingAvailable <= 0) {
      return;
    }

    const quantityToAdd = Math.min(quantity, remainingAvailable);

    if (quantityToAdd <= 0) {
      return;
    }

    addToCart(
      {
        slug: product.slug,
        name: product.name,
        price: activePrice,
        stock: product.stock,
        imageUrl: product.imageUrl,
        category: product.category,
      },
      quantityToAdd
    );

    setLastAddedQuantity(quantityToAdd);
    setJustAdded(true);
    openCart();
  }

  return (
    <div className={styles.purchasePanel}>
      <h1 className={styles.productTitle}>{product.name}</h1>
      <p className={styles.productCategory}>{product.category}</p>

      <div className={styles.priceRow}>
        <div className={styles.priceGroup}>
          {hasPromo ? (
            <>
              <span className={styles.productPriceOld}>
                {basePrice.toFixed(2)} €
              </span>
              <span className={styles.productPricePromo}>
                {activePrice.toFixed(2)} €
              </span>
            </>
          ) : (
            <span className={styles.productPrice}>
              {basePrice.toFixed(2)} €
            </span>
          )}
        </div>

        {soldOut ? (
          <span className={styles.soldOutBadge}>Article épuisé</span>
        ) : (
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
                  onChange={(event) => setNotifyEmail(event.target.value)}
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

      {justAdded && (
        <p
          className={styles.addedMessage}
          role="status"
          aria-live="polite"
        >
          {lastAddedQuantity > 1
            ? `${lastAddedQuantity} articles ont bien été ajoutés au panier.`
            : 'L’article a bien été ajouté au panier.'}
        </p>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.addToCartButton}
          disabled={soldOut || remainingAvailable <= 0}
          onClick={handleAddToCart}
        >
          <FiShoppingCart />
          <span>
            {soldOut
              ? 'Article indisponible'
              : remainingAvailable <= 0
              ? 'Stock déjà au maximum'
              : 'Ajouter au panier'}
          </span>
        </button>

        <button
          type="button"
          className={`${styles.favoriteButton} ${
            favorite ? styles.favoriteButtonActive : ''
          }`}
          onClick={handleToggleFavorite}
          aria-pressed={favorite}
          disabled={!isAuthReady || isSyncingFavorites}
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