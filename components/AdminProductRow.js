// components/AdminProductRow.js

import { useMemo } from 'react';
import { FiEdit2, FiTrash2, FiArchive } from 'react-icons/fi';
import styles from '../styles/AdminStock.module.css';
import { isSoldOut } from '../utils/product';

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
}) {
  const soldOut = isSoldOut(product);
  const isArchived = Boolean(product.isArchived);

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
            <div className={styles.restockLine}>
              <span className={styles.restockInfo}>
                {pendingRequestsCount} demande
                {pendingRequestsCount > 1 ? 's' : ''} en attente
              </span>
            </div>
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
        <p className={styles.price}>
          {Number(product.price).toFixed(2)} €
        </p>

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