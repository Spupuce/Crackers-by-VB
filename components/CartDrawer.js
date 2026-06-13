// components/CartDrawer.js

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiMinus, FiPlus, FiTrash2, FiX } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import styles from '../styles/CartDrawer.module.css';

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getCartItemKey(item) {
  if (item?.cartItemKey) {
    return item.cartItemKey;
  }

  const slug = normalizeText(item?.slug);
  const color = normalizeText(item?.color);

  return `${slug}::${color || 'default'}`;
}

export default function CartDrawer({ isOpen, onClose }) {
  const { items, cartTotal, updateItemQuantity, removeFromCart } = useCart();
  const [stockLimitByItemKey, setStockLimitByItemKey] = useState({});

  useEffect(() => {
    if (!isOpen) {
      setStockLimitByItemKey({});
    }
  }, [isOpen]);

  useEffect(() => {
    setStockLimitByItemKey((previous) => {
      const next = {};

      items.forEach((item) => {
        const itemKey = getCartItemKey(item);

        if (previous[itemKey]) {
          next[itemKey] = previous[itemKey];
        }
      });

      return next;
    });
  }, [items]);

  function handleDecrease(item) {
    const itemKey = getCartItemKey(item);

    updateItemQuantity(itemKey, item.quantity - 1);

    setStockLimitByItemKey((previous) => ({
      ...previous,
      [itemKey]: false,
    }));
  }

  function handleIncrease(item) {
    const itemKey = getCartItemKey(item);

    if (item.stock !== null && item.quantity >= item.stock) {
      setStockLimitByItemKey((previous) => ({
        ...previous,
        [itemKey]: true,
      }));
      return;
    }

    updateItemQuantity(itemKey, item.quantity + 1);

    setStockLimitByItemKey((previous) => ({
      ...previous,
      [itemKey]: false,
    }));
  }

  function handleRemove(item) {
    const itemKey = getCartItemKey(item);

    removeFromCart(itemKey);

    setStockLimitByItemKey((previous) => {
      const next = { ...previous };
      delete next[itemKey];
      return next;
    });
  }

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Fermer le panier"
        onClick={onClose}
      />

      <aside
        className={styles.drawer}
        aria-label="Panier"
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Mon panier</h2>

          <button
            type="button"
            className={styles.closeButton}
            aria-label="Fermer le panier"
            onClick={onClose}
          >
            <FiX />
          </button>
        </div>

        <div className={styles.content}>
          {items.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>Votre panier est vide</p>
              <p className={styles.emptyText}>
                Ajoutez une création pour commencer votre commande.
              </p>
            </div>
          ) : (
            <div className={styles.items}>
              {items.map((item) => {
                const itemKey = getCartItemKey(item);

                return (
                  <article key={itemKey} className={styles.item}>
                    <div className={styles.itemImageWrapper}>
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className={styles.itemImage}
                      />
                    </div>

                    <div className={styles.itemContent}>
                      <div className={styles.itemTop}>
                        <div className={styles.itemInfos}>
                          <h3 className={styles.itemName}>{item.name}</h3>

                          <p className={styles.itemCategory}>{item.category}</p>

                          {item.color ? (
                            <p className={styles.itemVariant}>
                              Couleur : {item.color}
                            </p>
                          ) : null}

                          <p className={styles.itemPrice}>
                            {Number(item.price).toFixed(2)} €
                          </p>
                        </div>

                        <button
                          type="button"
                          className={styles.removeButton}
                          aria-label={`Supprimer ${item.name} du panier`}
                          onClick={() => handleRemove(item)}
                        >
                          <FiTrash2 />
                        </button>
                      </div>

                      <div className={styles.quantityRow}>
                        <button
                          type="button"
                          className={styles.quantityButton}
                          aria-label={`Retirer une unité de ${item.name}`}
                          onClick={() => handleDecrease(item)}
                        >
                          <FiMinus />
                        </button>

                        <span className={styles.quantityValue}>{item.quantity}</span>

                        <button
                          type="button"
                          className={styles.quantityButton}
                          aria-label={`Ajouter une unité de ${item.name}`}
                          onClick={() => handleIncrease(item)}
                        >
                          <FiPlus />
                        </button>
                      </div>

                      {stockLimitByItemKey[itemKey] ? (
                        <p className={styles.stockLimitMessage}>
                          Stock maximum atteint
                        </p>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Sous-total</span>
            <span className={styles.summaryValue}>
              {Number(cartTotal).toFixed(2)} €
            </span>
          </div>

          <Link href="/panier" legacyBehavior>
            <a className={styles.primaryButton} onClick={onClose}>
              Voir mon panier
            </a>
          </Link>
        </div>
      </aside>
    </>
  );
}