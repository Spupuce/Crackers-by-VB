// components/AdminProductRow.js

import { useMemo, useState } from 'react';
import { FiEdit2, FiTrash2, FiArchive, FiMail } from 'react-icons/fi';
import styles from '../styles/AdminStock.module.css';
import {
  getActiveProductPrice,
  getProductBasePrice,
  hasValidPromoPrice,
  isSoldOut,
} from '../utils/product';

function getSafeStock(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function getColorStock(color) {
  if (!color || typeof color !== 'object') return 0;

  if (color.stock !== undefined && color.stock !== null) {
    return getSafeStock(color.stock);
  }

  if (color.quantity !== undefined && color.quantity !== null) {
    return getSafeStock(color.quantity);
  }

  return 0;
}

export default function AdminProductRow({
  product,
  onArchive,
  onDelete,
  onUnarchive,
  onEdit,
  onProductRemoved,
  onProductUpdated,
}) {
  const soldOut = isSoldOut(product);
  const isArchived = Boolean(product.isArchived);
  const hasPromo = hasValidPromoPrice(product);
  const basePrice = getProductBasePrice(product);
  const activePrice = getActiveProductPrice(product);

  const [isNotifyingRestock, setIsNotifyingRestock] = useState(false);
  const [restockFeedback, setRestockFeedback] = useState('');

  const pendingRequestsCount = Number(product.pendingRequestsCount || 0);
  const hasPendingRequests = pendingRequestsCount > 0;

  const normalizedColors = useMemo(() => {
    if (!Array.isArray(product.colors)) return [];

    return product.colors.map((color, index) => ({
      key: `${color?.name || 'couleur'}-${index}`,
      name: color?.name || 'Couleur',
      stock: getColorStock(color),
    }));
  }, [product.colors]);

  const totalStock = useMemo(() => {
    if (normalizedColors.length > 0) {
      return normalizedColors.reduce((sum, color) => sum + color.stock, 0);
    }

    return getSafeStock(product.stock);
  }, [normalizedColors, product.stock]);

  const handleEdit = () => {
    if (typeof onEdit === 'function') {
      onEdit(product);
    }
  };

  const handleArchive = async () => {
    if (typeof onArchive === 'function') {
      await onArchive(product);
    }
  };

  const handleUnarchive = async () => {
    if (typeof onUnarchive === 'function') {
      await onUnarchive(product);
    }
  };

  const handleDelete = async () => {
    if (typeof onDelete === 'function') {
      const success = await onDelete(product);

      if (success && typeof onProductRemoved === 'function') {
        onProductRemoved(product._id);
      }
    }
  };

  const handleNotifyRestock = async () => {
    if (!product?._id || isNotifyingRestock) {
      return;
    }

    setIsNotifyingRestock(true);
    setRestockFeedback('');

    try {
      const response = await fetch(
        `/api/admin/products/${product._id}/notify-restock`,
        {
          method: 'POST',
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setRestockFeedback(
          data?.message || "Erreur lors de l'envoi des notifications."
        );
        return;
      }

      setRestockFeedback(
        data?.message || 'Notifications de retour en stock envoyées.'
      );

      if (typeof onProductUpdated === 'function') {
        onProductUpdated({
          ...product,
          pendingRequestsCount: 0,
        });
      }
    } catch (error) {
      setRestockFeedback("Erreur lors de l'envoi des notifications.");
    } finally {
      setIsNotifyingRestock(false);
    }
  };

  return (
    <div className={styles.row}>
      <div className={styles.left}>
        <img
          src={product.imageUrl}
          alt={product.name}
          className={styles.image}
        />

        <div className={styles.content}>
          <h3 className={styles.name}>{product.name}</h3>
          <p className={styles.category}>{product.category}</p>
          <p className={styles.description}>{product.description}</p>

          {!isArchived && hasPendingRequests && (
            <>
              <div className={styles.restockLine}>
                <span className={styles.restockInfo}>
                  <span className={styles.restockInfoIcon}>
                    <FiMail />
                  </span>
                  {pendingRequestsCount} demande
                  {pendingRequestsCount > 1 ? 's' : ''} en attente
                </span>

                <button
                  type="button"
                  className={styles.restockNotifyButton}
                  onClick={handleNotifyRestock}
                  disabled={isNotifyingRestock || totalStock <= 0}
                >
                  <FiMail />
                  {isNotifyingRestock ? 'Envoi...' : 'Notifier maintenant'}
                </button>
              </div>

              {totalStock <= 0 && (
                <p className={styles.restockFeedback}>
                  Le produit doit être de nouveau en stock avant notification.
                </p>
              )}

              {restockFeedback && (
                <p className={styles.restockFeedback}>{restockFeedback}</p>
              )}
            </>
          )}

          {normalizedColors.length > 0 && (
            <div className={styles.variants}>
              {normalizedColors.map((color) => (
                <span key={color.key} className={styles.variantTag}>
                  {color.name} ({color.stock})
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.priceBlock}>
          {hasPromo ? (
            <>
              <p className={styles.priceOld}>
                {basePrice.toFixed(2)} €
              </p>
              <p className={styles.pricePromo}>
                {activePrice.toFixed(2)} €
              </p>
            </>
          ) : (
            <p className={styles.price}>
              {basePrice.toFixed(2)} €
            </p>
          )}
        </div>

        <div className={styles.badges}>
          {soldOut ? (
            <span className={styles.badgeSoldOut}>Article épuisé</span>
          ) : totalStock <= 3 ? (
            <span className={styles.badgeLowStock}>
              Stock faible : {totalStock}
            </span>
          ) : (
            <span className={styles.badgeStock}>
              Stock : {totalStock}
            </span>
          )}
        </div>

        <div className={styles.actions}>
          {!isArchived ? (
            <>
              <button
                type="button"
                className={styles.iconButton}
                onClick={handleEdit}
                aria-label={`Modifier ${product.name}`}
              >
                <FiEdit2 />
              </button>

              <button
                type="button"
                className={styles.archiveButton}
                onClick={handleArchive}
                aria-label={`Archiver ${product.name}`}
              >
                <FiArchive />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={styles.unarchiveButton}
                onClick={handleUnarchive}
                aria-label={`Désarchiver ${product.name}`}
              >
                Désarchiver
              </button>

              <button
                type="button"
                className={styles.deleteButton}
                onClick={handleDelete}
                aria-label={`Supprimer définitivement ${product.name}`}
              >
                <FiTrash2 />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}