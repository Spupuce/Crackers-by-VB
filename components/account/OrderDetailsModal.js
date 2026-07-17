// components/account/OrderDetailsModal.js

import { FiX } from 'react-icons/fi';
import {
  formatOrderDate,
  getOrderDisplayLabel,
  getSafeAmount,
  getStatusClassName,
} from '../../utils/accountOrders';

const PRODUCT_IMAGE_FALLBACK = '/images/placeholder-product.jpg';

export default function OrderDetailsModal({
  selectedOrder,
  setSelectedOrder,
  handleDownloadInvoice,
  handleReorder,
  styles,
}) {
  if (!selectedOrder) {
    return null;
  }

  const items = Array.isArray(selectedOrder.items) ? selectedOrder.items : [];
  const itemCount = Number(selectedOrder.itemCount) || 0;

  return (
    <div
      className={styles.orderModalOverlay}
      role="presentation"
      onClick={() => setSelectedOrder(null)}
    >
      <div
        className={styles.orderModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.orderModalHeader}>
          <div>
            <h2 id="order-modal-title" className={styles.orderModalTitle}>
              {getOrderDisplayLabel(selectedOrder)}
            </h2>
            <p className={styles.orderModalSubtitle}>
              Commande du {formatOrderDate(selectedOrder.createdAt)}
            </p>
          </div>

          <button
            type="button"
            className={styles.orderModalClose}
            onClick={() => setSelectedOrder(null)}
            aria-label="Fermer le détail de la commande"
          >
            <FiX />
          </button>
        </div>

        <div className={styles.orderModalStatusRow}>
          <span
            className={`${styles.orderStatus} ${getStatusClassName(
              selectedOrder.status,
              styles
            )}`}
          >
            {selectedOrder.status}
          </span>
          <span className={styles.orderSummaryText}>
            {itemCount} article{itemCount > 1 ? 's' : ''}
          </span>
        </div>

        <div className={styles.orderModalItems}>
          {items.map((item, index) => {
            const quantity = getSafeAmount(item.quantity);
            const unitPrice = getSafeAmount(item.price);
            const lineTotal = unitPrice * quantity;
            const imageSrc =
              typeof item.image === 'string' && item.image.trim()
                ? item.image
                : PRODUCT_IMAGE_FALLBACK;

            return (
              <div
                key={`${item.id || 'item'}-${item.color || 'no-color'}-${index}`}
                className={styles.orderModalItem}
              >
                <div className={styles.orderModalImageWrapper}>
                  <img
                    src={imageSrc}
                    alt={item.name}
                    className={styles.orderModalImage}
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = PRODUCT_IMAGE_FALLBACK;
                    }}
                  />
                </div>

                <div className={styles.orderModalItemContent}>
                  <p className={styles.orderModalItemName}>{item.name}</p>

                  {item.color ? (
                    <p className={styles.orderModalItemMeta}>
                      Couleur : {item.color}
                    </p>
                  ) : null}

                  <p className={styles.orderModalItemMeta}>
                    Quantité : {quantity}
                  </p>

                  <p className={styles.orderModalItemMeta}>
                    Prix unitaire : {unitPrice.toFixed(2)} €
                  </p>
                </div>

                <p className={styles.orderModalItemPrice}>
                  {lineTotal.toFixed(2)} €
                </p>
              </div>
            );
          })}
        </div>

        <div className={styles.orderModalFooter}>
          <div className={styles.orderModalFooterSummary}>
            <span className={styles.orderTotalLabel}>Total</span>
            <span className={styles.orderModalTotal}>
              {getSafeAmount(selectedOrder.total).toFixed(2)} €
            </span>
          </div>

          <div className={styles.orderModalFooterActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => handleDownloadInvoice(selectedOrder)}
              disabled
              aria-disabled="true"
              title="Fonctionnalité bientôt disponible"
            >
              Facture bientôt disponible
            </button>

            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => handleReorder(selectedOrder)}
              disabled
              aria-disabled="true"
              title="Fonctionnalité bientôt disponible"
            >
              Commander à nouveau bientôt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}