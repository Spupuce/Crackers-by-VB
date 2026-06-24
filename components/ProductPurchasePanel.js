// components/ProductPurchasePanel.js
import { useEffect, useMemo, useState } from 'react';
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

function normalizeColorName(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidEmail(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export default function ProductPurchasePanel({
  product,
  selectedColor: selectedColorProp = '',
  onSelectedColorChange,
}) {
  const router = useRouter();
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
  const [notifyAlreadyExists, setNotifyAlreadyExists] = useState(false);

  const { user, isAuthenticated, isAuthReady } = useAuth();
  const { isFavorite, toggleFavorite, isSyncingFavorites } = useFavorites();
  const { items, addToCart, openCart } = useCart();
  const favorite = isFavorite(product.slug);

  const availableColors = useMemo(() => {
    if (!Array.isArray(product?.colors)) {
      return [];
    }

    return product.colors.filter(
      (color) => color && normalizeColorName(color.name)
    );
  }, [product?.colors]);

  const hasColorVariants = availableColors.length > 0;
  const selectedColor = normalizeColorName(selectedColorProp);

  useEffect(() => {
    if (isAuthenticated && user?.email) {
      setNotifyEmail(user.email);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    setJustAdded(false);
    setLastAddedQuantity(0);
    setQuantity(1);
    setShowNotifyForm(false);
    setNotifySuccess(false);
    setNotifyError('');
    setNotifyAlreadyExists(false);

    if (!hasColorVariants) {
      onSelectedColorChange?.('');
      return;
    }

    if (!selectedColor) {
      return;
    }

    const matchingSelectedColor = availableColors.find(
      (color) =>
        normalizeColorName(color.name).toLowerCase() ===
        selectedColor.toLowerCase()
    );

    if (matchingSelectedColor) {
      return;
    }

    const firstAvailableColor =
      availableColors.find((color) => Number(color.quantity) > 0)?.name || '';

    onSelectedColorChange?.(firstAvailableColor);
  }, [
    availableColors,
    hasColorVariants,
    onSelectedColorChange,
    product?.slug,
    selectedColor,
  ]);

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

  const selectedColorData = useMemo(() => {
    if (!hasColorVariants || !selectedColor) {
      return null;
    }

    return (
      availableColors.find(
        (color) =>
          normalizeColorName(color.name).toLowerCase() ===
          selectedColor.toLowerCase()
      ) || null
    );
  }, [availableColors, hasColorVariants, selectedColor]);

  const effectiveStock = hasColorVariants
    ? Math.max(0, Number(selectedColorData?.quantity || 0))
    : Math.max(0, Number(product?.stock || 0));

  const quantityInCart = items
    .filter((item) => {
      if (item.slug !== product.slug) {
        return false;
      }

      if (hasColorVariants) {
        return (
          normalizeColorName(item.color).toLowerCase() ===
          selectedColor.toLowerCase()
        );
      }

      return !normalizeColorName(item.color);
    })
    .reduce((sum, item) => sum + (item.quantity || 0), 0);

  const remainingAvailable = Math.max(0, effectiveStock - quantityInCart);

  const hasAnyColorWithStock = hasColorVariants
    ? availableColors.some((color) => Number(color.quantity) > 0)
    : false;

  const soldOut =
    hasColorVariants
      ? !hasAnyColorWithStock
      : isSoldOut(product) || effectiveStock <= 0;

  const selectedColorSoldOut =
    hasColorVariants && selectedColor
      ? Math.max(0, Number(selectedColorData?.quantity || 0)) <= 0
      : false;

  const shouldShowNotifyForSelectedColor =
    hasColorVariants && !!selectedColor && selectedColorSoldOut;

  const requiresColorSelection = hasColorVariants && !selectedColor;

  useEffect(() => {
    if (quantity > Math.max(remainingAvailable, 1)) {
      setQuantity(Math.max(1, remainingAvailable || 1));
    }
  }, [quantity, remainingAvailable]);

  const decreaseQuantity = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
    setJustAdded(false);
    setLastAddedQuantity(0);
  };

  const increaseQuantity = () => {
    setQuantity((prev) => Math.min(Math.max(remainingAvailable, 1), prev + 1));
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
    if (notifyAlreadyExists) {
      return;
    }

    setShowNotifyForm(true);
    setNotifySuccess(false);
    setNotifyError('');
  };

  const handleCancelNotify = () => {
    setShowNotifyForm(false);
    setNotifyError('');
    setNotifySuccess(false);
  };

  const handleSubmitNotify = async (event) => {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    if (notifyLoading) {
      return;
    }

    setNotifyError('');
    setNotifySuccess(false);
    setNotifyAlreadyExists(false);

    if (!product?.slug) {
      setNotifyError(
        "Impossible d'envoyer la demande pour ce produit pour le moment."
      );
      return;
    }

    if (hasColorVariants && !selectedColor) {
      setNotifyError('Merci de sélectionner une couleur.');
      return;
    }

    if (!isValidEmail(notifyEmail)) {
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
          body: JSON.stringify({
            email: notifyEmail,
            color: hasColorVariants ? selectedColor : '',
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || 'Erreur lors de la demande.');
      }

      if (data?.alreadyExists) {
        setNotifySuccess(false);
        setNotifyAlreadyExists(true);
        setNotifyError(
          hasColorVariants
            ? 'Une demande existe déjà pour cette couleur et cette adresse e-mail.'
            : 'Une demande existe déjà pour cette adresse e-mail pour ce produit.'
        );
        setShowNotifyForm(false);
        return;
      }

      setNotifySuccess(true);
      setNotifyAlreadyExists(false);
      setShowNotifyForm(false);
      setNotifyError('');
    } catch (error) {
      setNotifyAlreadyExists(false);
      setNotifyError(
        error.message ||
          "Une erreur s'est produite. Merci de réessayer dans quelques instants."
      );
    } finally {
      setNotifyLoading(false);
    }
  };

  function handleAddToCart() {
    if (
      !product ||
      soldOut ||
      remainingAvailable <= 0 ||
      requiresColorSelection ||
      selectedColorSoldOut
    ) {
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
        stock: effectiveStock,
        imageUrl: selectedColorData?.imageUrl || product.imageUrl,
        category: product.category,
        color: hasColorVariants ? selectedColor : '',
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

      {hasColorVariants && (
        <div className={styles.variantBlock}>
          <div className={styles.variantHeader}>
            <p className={styles.quantityLabel}>Couleur</p>
            {selectedColor && (
              <span className={styles.variantSelected}>{selectedColor}</span>
            )}
          </div>

          <div className={styles.variantOptions}>
            {availableColors.map((color) => {
              const colorName = normalizeColorName(color.name);
              const colorStock = Math.max(0, Number(color.quantity || 0));
              const isSelected =
                normalizeColorName(selectedColor).toLowerCase() ===
                colorName.toLowerCase();
              const isDisabled = false;

              return (
                <button
                  key={colorName}
                  type="button"
                  className={`${styles.variantButton} ${
                    isSelected ? styles.variantButtonActive : ''
                  } ${colorStock <= 0 ? styles.variantButtonDisabled : ''}`}
                  onClick={() => {
                    onSelectedColorChange?.(colorName);
                    setQuantity(1);
                    setJustAdded(false);
                    setLastAddedQuantity(0);
                    setShowNotifyForm(false);
                    setNotifySuccess(false);
                    setNotifyError('');
                    setNotifyAlreadyExists(false);
                  }}
                  disabled={isDisabled}
                  aria-pressed={isSelected}
                >
                  <span className={styles.variantButtonLabel}>{colorName}</span>
                  <span className={styles.variantButtonStock}>
                    ({colorStock})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {soldOut || shouldShowNotifyForSelectedColor ? (
        <div className={styles.notifyBlock}>
          <p className={styles.notifyText}>
            {shouldShowNotifyForSelectedColor
              ? `La couleur ${selectedColor} est actuellement en rupture de stock. Vous pouvez me signaler votre intérêt et je vous contacterai dès qu’elle sera à nouveau disponible.`
              : "Cet article est actuellement en rupture de stock. Vous pouvez me signaler votre intérêt et je vous contacterai dès qu&apos;il sera à nouveau disponible."}
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
              disabled={notifyAlreadyExists}
            >
              {notifyAlreadyExists
                ? 'Demande déjà enregistrée'
                : 'Me prévenir quand disponible'}
            </button>
          ) : (
            <form
              className={styles.notifyForm}
              onSubmit={handleSubmitNotify}
              noValidate
            >
              <div className={styles.notifyFormControls}>
                <button
                  type="button"
                  className={styles.notifyCancel}
                  onClick={handleCancelNotify}
                >
                  Annuler
                </button>

                <label
                  htmlFor="notify-email"
                  className={styles.notifyLabel}
                >
                  Adresse e-mail
                </label>

                <input
                  id="notify-email"
                  type="email"
                  className={styles.notifyInput}
                  placeholder="Votre adresse e-mail"
                  value={notifyEmail}
                  onChange={(event) => {
                    setNotifyEmail(event.target.value);
                    if (notifyAlreadyExists) {
                      setNotifyAlreadyExists(false);
                      setNotifyError('');
                    }
                  }}
                  autoComplete="email"
                  required
                />

                <button
                  type="submit"
                  className={styles.notifySubmit}
                  onClick={handleSubmitNotify}
                  disabled={notifyLoading}
                >
                  {notifyLoading ? 'Envoi en cours...' : 'Envoyer la demande'}
                </button>
              </div>
            </form>
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
            Maximum disponible : {remainingAvailable}
          </p>
        </div>
      )}

      {justAdded && (
        <p className={styles.addedMessage} role="status" aria-live="polite">
          {lastAddedQuantity > 1
            ? `${lastAddedQuantity} articles ont bien été ajoutés au panier.`
            : "L’article a bien été ajouté au panier."}
        </p>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.addToCartButton}
          disabled={
            soldOut ||
            remainingAvailable <= 0 ||
            requiresColorSelection ||
            selectedColorSoldOut
          }
          onClick={handleAddToCart}
        >
          <FiShoppingCart />
          <span>
            {soldOut
              ? 'Article indisponible'
              : requiresColorSelection
              ? 'Choisir une couleur'
              : selectedColorSoldOut
              ? 'Couleur indisponible'
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