// components/AdminProductRow.js
import { useEffect, useMemo, useState } from 'react';
import { FiEdit2, FiTrash2, FiArchive, FiMail } from 'react-icons/fi';
import styles from '../styles/AdminStock.module.css';
import {
  getActiveProductPrice,
  getMainProductImage,
  getProductBasePrice,
  getProductImageTransformStyle,
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

function normalizeColorName(value) {
  return typeof value === 'string' ? value.trim() : '';
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
  const mainImage = getMainProductImage(product);
  const imageTransformStyle = getProductImageTransformStyle(mainImage);

  const [isNotifyingRestock, setIsNotifyingRestock] = useState(false);
  const [restockFeedback, setRestockFeedback] = useState('');
  const [showRestockDetails, setShowRestockDetails] = useState(false);

  const pendingRequestsCount = Number(product.pendingRequestsCount || 0);
  const hasPendingRequests = pendingRequestsCount > 0;

  const normalizedColors = useMemo(() => {
    if (!Array.isArray(product.colors)) return [];

    return product.colors
      .map((color, index) => ({
        key: `${color?.name || 'couleur'}-${index}`,
        name: normalizeColorName(color?.name),
        stock: getColorStock(color),
      }))
      .filter((color) => color.name);
  }, [product.colors]);

  const hasColorVariants = normalizedColors.length > 0;

  const totalStock = useMemo(() => {
    if (normalizedColors.length > 0) {
      return normalizedColors.reduce((sum, color) => sum + color.stock, 0);
    }

    return getSafeStock(product.stock);
  }, [normalizedColors, product.stock]);

  const pendingRequestsByColor = useMemo(() => {
    if (!Array.isArray(product.pendingRequests)) {
      return [];
    }

    const grouped = product.pendingRequests.reduce((acc, request, index) => {
      const normalizedColor = normalizeColorName(request?.color);
      const colorLabel = normalizedColor || 'Sans couleur';
      const existing = acc.find((entry) => entry.colorLabel === colorLabel);

      if (existing) {
        existing.count += 1;
        existing.requests.push(request);
      } else {
        acc.push({
          key: `${colorLabel}-${index}`,
          color: normalizedColor,
          colorLabel,
          isWithoutColor: !normalizedColor,
          count: 1,
          requests: [request],
        });
      }

      return acc;
    }, []);

    return grouped;
  }, [product.pendingRequests]);

  useEffect(() => {
    console.error(
      'ADMIN_PRODUCT_ROW_RENDER',
      JSON.stringify(
        {
          productId: product?._id,
          productName: product?.name,
          imageUrl: product?.imageUrl,
          mainImage,
          imageTransformStyle,
        },
        null,
        2
      )
    );
  }, [product, mainImage, imageTransformStyle]);

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

  const handleNotifyRestock = async (color = '') => {
    if (!product?._id || isNotifyingRestock) {
      return;
    }

    const normalizedColor = normalizeColorName(color);

    if (hasColorVariants) {
      if (!normalizedColor) {
        setRestockFeedback('Couleur introuvable pour cette notification.');
        return;
      }

      const matchingColor = normalizedColors.find(
        (entry) => entry.name.toLowerCase() === normalizedColor.toLowerCase()
      );

      if (!matchingColor || matchingColor.stock <= 0) {
        setRestockFeedback(
          'La couleur doit être de nouveau en stock avant notification.'
        );
        return;
      }
    } else {
      if (getSafeStock(product.stock) <= 0) {
        setRestockFeedback(
          'Le produit doit être de nouveau en stock avant notification.'
        );
        return;
      }
    }

    setIsNotifyingRestock(true);
    setRestockFeedback('');

    try {
      const response = await fetch(
        `/api/admin/products/${product._id}/notify-restock`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ color: hasColorVariants ? normalizedColor : '' }),
        }
      );

      const rawText = await response.text().catch(() => '');
      let data = null;

      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        // JSON invalide ou vide, on garde rawText pour debug
      }

      console.log('NOTIFY_RESTOCK_RESPONSE_DEBUG:', {
        status: response.status,
        ok: response.ok,
        url: response.url,
        data,
        rawText,
      });

      if (!response.ok) {
        setRestockFeedback(
          (data && data.message) ||
            rawText ||
            "Erreur lors de l'envoi des notifications."
        );
        return;
      }

      setRestockFeedback(
        (data && data.message) ||
          (hasColorVariants
            ? `Notifications envoyées pour la couleur ${normalizedColor}.`
            : 'Notifications envoyées pour ce produit.')
      );

      const remainingPendingRequests = Array.isArray(product.pendingRequests)
        ? product.pendingRequests.filter((request) => {
            const requestColor = normalizeColorName(request?.color);

            if (hasColorVariants) {
              return requestColor.toLowerCase() !== normalizedColor.toLowerCase();
            }

            return requestColor !== '';
          })
        : [];

      if (typeof onProductUpdated === 'function') {
        onProductUpdated({
          ...product,
          pendingRequests: remainingPendingRequests,
          pendingRequestsCount: remainingPendingRequests.length,
        });
      }
    } catch (error) {
      console.error('NOTIFY_RESTOCK_FETCH_ERROR:', {
        message: error?.message || String(error),
      });
      setRestockFeedback("Erreur lors de l'envoi des notifications.");
    } finally {
      setIsNotifyingRestock(false);
    }
  };

  return (
    <div className={styles.row}>
      <div className={styles.left}>
        <img
          src={mainImage.url || product.imageUrl}
          alt={product.name}
          className={styles.image}
          style={imageTransformStyle}
        />

        <div className={styles.content}>
          <h3 className={styles.name}>{product.name}</h3>
          <p className={styles.category}>{product.category}</p>
          <p className={styles.description}>{product.description}</p>

          {!isArchived && hasPendingRequests && (
            <div className={styles.restockBlock}>
              <div className={styles.restockLine}>
                <span className={styles.restockInfo}>
                  <span className={styles.restockInfoIcon}>
                    <FiMail />
                  </span>
                  {pendingRequestsCount} demande
                  {pendingRequestsCount > 1 ? 's' : ''} de notification en attente
                </span>

                <button
                  type="button"
                  className={styles.restockToggleButton}
                  onClick={() => setShowRestockDetails((prev) => !prev)}
                >
                  {showRestockDetails
                    ? 'Masquer le détail'
                    : 'Voir le détail des demandes'}
                </button>
              </div>

              {showRestockDetails && (
                <div className={styles.restockDetails}>
                  {pendingRequestsByColor.length > 0 ? (
                    <ul className={styles.restockList}>
                      {pendingRequestsByColor.map((entry) => {
                        const matchingColor = hasColorVariants
                          ? normalizedColors.find(
                              (color) =>
                                color.name.toLowerCase() ===
                                entry.color.toLowerCase()
                            )
                          : null;

                        const canNotify = entry.isWithoutColor
                          ? getSafeStock(product.stock) > 0
                          : Boolean(matchingColor && matchingColor.stock > 0);

                        const label = entry.isWithoutColor
                          ? 'Produit sans couleur'
                          : `Couleur : ${entry.colorLabel}`;

                        return (
                          <li key={entry.key} className={styles.restockItem}>
                            <span className={styles.restockItemLabel}>
                              {label} — {entry.count} demande
                              {entry.count > 1 ? 's' : ''}
                            </span>

                            <button
                              type="button"
                              className={styles.restockNotifyButton}
                              onClick={() =>
                                handleNotifyRestock(
                                  entry.isWithoutColor ? '' : entry.color
                                )
                              }
                              disabled={isNotifyingRestock || !canNotify}
                            >
                              <FiMail />
                              {isNotifyingRestock ? 'Envoi...' : 'Notifier'}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className={styles.restockEmptyDetails}>
                      <p>Aucune donnée détaillée par couleur pour l’instant.</p>
                      <button
                        type="button"
                        className={styles.restockNotifyButton}
                        onClick={() => handleNotifyRestock('')}
                        disabled={
                          isNotifyingRestock || getSafeStock(product.stock) <= 0
                        }
                      >
                        <FiMail />
                        {isNotifyingRestock ? 'Envoi...' : 'Notifier maintenant'}
                      </button>
                    </div>
                  )}

                  {restockFeedback && (
                    <p className={styles.restockFeedback}>{restockFeedback}</p>
                  )}
                </div>
              )}
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
        <div className={styles.priceBlock}>
          {hasPromo ? (
            <>
              <p className={styles.priceOld}>{basePrice.toFixed(2)} €</p>
              <p className={styles.pricePromo}>{activePrice.toFixed(2)} €</p>
            </>
          ) : (
            <p className={styles.price}>{basePrice.toFixed(2)} €</p>
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
            <span className={styles.badgeStock}>Stock : {totalStock}</span>
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