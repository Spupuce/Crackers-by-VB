// components/account/OrdersList.js

import { FiEye } from 'react-icons/fi';
import {
  formatOrderDate,
  getOrderDisplayLabel,
  getSafeAmount,
  getStatusClassName,
} from '../../utils/accountOrders';

export default function OrdersList({
  orders,
  isLoadingOrders,
  ordersErrorMessage,
  setSelectedOrder,
  styles,
}) {
  if (isLoadingOrders) {
    return (
      <div className={styles.ordersEmpty}>
        <p className={styles.emptyTitle}>Chargement des commandes...</p>
      </div>
    );
  }

  if (ordersErrorMessage) {
    return (
      <div className={styles.ordersEmpty}>
        <p className={styles.emptyTitle}>Impossible de charger vos commandes</p>
        <p className={styles.emptyText}>{ordersErrorMessage}</p>
      </div>
    );
  }

  if (!Array.isArray(orders) || orders.length === 0) {
    return (
      <div className={styles.ordersEmpty}>
        <p className={styles.emptyTitle}>Aucune commande pour le moment</p>
        <p className={styles.emptyText}>
          Vos futures commandes apparaîtront ici.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.ordersList}>
      {orders.map((order) => (
        <div key={order.id} className={styles.orderCardButton}>
          <div
            className={styles.orderTopRow}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedOrder(order)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setSelectedOrder(order);
              }
            }}
          >
            <div className={styles.orderIdentity}>
              <p className={styles.orderNumber}>{getOrderDisplayLabel(order)}</p>
              <p className={styles.orderDate}>
                Commande du {formatOrderDate(order.createdAt)}
              </p>
            </div>

            <div className={styles.orderActions}>
              <span
                className={`${styles.orderStatus} ${getStatusClassName(
                  order.status,
                  styles
                )}`}
              >
                {order.status}
              </span>

              <button
                type="button"
                className={styles.orderViewButton}
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedOrder(order);
                }}
                aria-label={`Voir le détail de la commande ${getOrderDisplayLabel(
                  order
                )}`}
                title="Voir le détail"
              >
                <FiEye />
              </button>
            </div>
          </div>

          <div
            className={styles.orderSummaryRow}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedOrder(order)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setSelectedOrder(order);
              }
            }}
          >
            <span className={styles.orderSummaryText}>
              {order.itemCount} article{order.itemCount > 1 ? 's' : ''}
            </span>
            <span className={styles.orderTotalValue}>
              {getSafeAmount(order.total).toFixed(2)} €
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}