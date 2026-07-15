// components/CartSummary.js

import internalStyles from '../styles/InternalPages.module.css';
import styles from '../styles/CartPage.module.css';

export default function CartSummary({
  totalItems,
  cartLines,
  cartTotal,
  normalizedDeliveryMethod,
  shippingPrice,
  estimatedTotal,
  isFreeShipping,
  parcelSize,
  getDeliveryMethodLabel,
  getParcelLabel,
}) {
  return (
    <aside className={styles.summaryColumn}>
      <section className={`${internalStyles.card} ${styles.summaryCard}`}>
        <div className={styles.summaryHeader}>
          <h2 className={styles.sectionTitle}>Récapitulatif</h2>
          <span className={styles.summaryBadge}>
            {totalItems} article{totalItems > 1 ? 's' : ''}
          </span>
        </div>

        <div className={styles.itemsList}>{cartLines}</div>

        <div className={styles.summaryTotals}>
          <div className={styles.summaryRow}>
            <span>Sous-total</span>
            <span>{cartTotal.toFixed(2)} €</span>
          </div>

          <div className={styles.summaryRow}>
            <span>
              Frais de port ({getDeliveryMethodLabel(normalizedDeliveryMethod)})
            </span>
            <span>
              {isFreeShipping ? 'Offert' : `${shippingPrice.toFixed(2)} €`}
            </span>
          </div>

          <div className={styles.summaryRowTotal}>
            <span>Total estimé</span>
            <span>{estimatedTotal.toFixed(2)} €</span>
          </div>
        </div>

        <div className={styles.summaryBottomNote}>
          {isFreeShipping
            ? 'La livraison est offerte pour cette commande.'
            : `${getParcelLabel(parcelSize)} appliqué pour ce panier.`}
        </div>
      </section>
    </aside>
  );
}