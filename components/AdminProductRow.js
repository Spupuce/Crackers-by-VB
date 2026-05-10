// components/AdminProductRow.js

import { FiEdit2, FiTrash2, FiArchive } from 'react-icons/fi';
import { getProductStatus, isSoldOut, isLowStock } from '../utils/product';
import styles from '../styles/AdminStock.module.css';

export default function AdminProductRow({
  product,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
}) {
  const status = getProductStatus(product);
  const soldOut = isSoldOut(product);
  const lowStock = isLowStock(product);
  const isArchived = Boolean(product.isArchived);

  function handleEdit() {
    if (typeof onEdit === 'function') {
      onEdit(product);
    }
  }

  function handleArchive() {
    if (typeof onArchive === 'function') {
      onArchive(product);
    }
  }

  function handleUnarchive() {
    if (typeof onUnarchive === 'function') {
      onUnarchive(product);
    }
  }

  function handleDelete() {
    if (typeof onDelete === 'function') {
      onDelete(product);
    }
  }

  return (
    <article className={styles.row}>
      <div className={styles.left}>
        <img
          src={product.imageUrl}
          alt={product.name}
          className={styles.image}
        />

        <div className={styles.content}>
          <h2 className={styles.name}>{product.name}</h2>
          <p className={styles.category}>{product.category}</p>

          <p className={styles.description}>
            {product.shortDescription || product.description}
          </p>

          {!isArchived && product.pendingRequestsCount > 0 && (
            <p className={styles.pending}>
              🔔 {product.pendingRequestsCount} demande(s) en attente
            </p>
          )}

          {!isArchived && product.variants?.length > 0 && (
            <div className={styles.variants}>
              {product.variants.map((variant, index) => (
                <span
                  key={`${variant.value}-${index}`}
                  className={styles.variantTag}
                >
                  {variant.value} ({variant.stock})
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.right}>
        <p className={styles.price}>{product.price.toFixed(2)} €</p>

        {!isArchived && (
          <div className={styles.badges}>
            {soldOut && (
              <span className={styles.badgeSoldOut}>{status.label}</span>
            )}

            {!soldOut && lowStock && (
              <span className={styles.badgeLowStock}>
                Stock faible : {product.stock}
              </span>
            )}

            {!soldOut && !lowStock && (
              <span className={styles.badgeStock}>
                Stock : {product.stock}
              </span>
            )}
          </div>
        )}

        {!isArchived && soldOut && product.pendingRequestsCount > 0 && (
          <button type="button" className={styles.notifyButton}>
            Notifier {product.pendingRequestsCount} personne(s)
          </button>
        )}

        <div className={styles.actions}>
          {!isArchived ? (
            <>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Modifier le produit"
                onClick={handleEdit}
              >
                <FiEdit2 />
              </button>

              <button
                type="button"
                className={styles.archiveButton}
                aria-label="Archiver le produit"
                onClick={handleArchive}
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
              >
                Désarchiver
              </button>

              <button
                type="button"
                className={styles.deleteButton}
                aria-label="Supprimer définitivement le produit"
                onClick={handleDelete}
              >
                <FiTrash2 />
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}