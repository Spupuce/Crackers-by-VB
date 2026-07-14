// components/admin/orders/AdminOrdersList.js

import { FiClock, FiEye, FiMail, FiTruck } from 'react-icons/fi';
import styles from '../../../styles/AdminOrders.module.css';
import {
  ORDER_STATUSES,
  STATUS_OPTIONS,
  formatPrice,
  getCustomerFullName,
  getStatusEmailInfo,
  getStatusLabel,
} from '../../../utils/adminOrders';

export default function AdminOrdersList({
  activeFilter,
  counts,
  emailSendingFor,
  filteredOrders,
  handleEmail,
  handleStatusChange,
  isLoadingOrders,
  ordersError,
  setActiveFilter,
  setSelectedOrderId,
  shippingSavingFor,
  statusFeedback,
  statusUpdatingFor,
}) {
  return (
    <section className={styles.content}>
      <div className={styles.filters}>
        {ORDER_STATUSES.map((status) => {
          const Icon = status.icon;
          const count = counts[status.value];

          return (
            <button
              key={status.value}
              type="button"
              className={`${styles.filterButton} ${
                activeFilter === status.value ? styles.filterButtonActive : ''
              }`}
              onClick={() => setActiveFilter(status.value)}
            >
              {Icon ? <Icon aria-hidden="true" /> : null}
              <span>
                {status.label} ({count})
              </span>
            </button>
          );
        })}
      </div>

      {statusFeedback.message ? (
        <div
          className={`${styles.loadingContainer} ${
            styles.statusFeedbackWrapper || ''
          }`}
        >
          <div className={styles.loadingBox}>{statusFeedback.message}</div>
        </div>
      ) : null}

      {isLoadingOrders ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingBox}>Chargement des commandes...</div>
        </div>
      ) : ordersError ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingBox}>{ordersError}</div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingBox}>
            Aucune commande ne correspond au filtre sélectionné.
          </div>
        </div>
      ) : (
        <div className={styles.ordersList}>
          {filteredOrders.map((order) => {
            const statusEmailInfo = getStatusEmailInfo(order);
            const isUpdatingStatus = statusUpdatingFor === order.id;
            const isSendingEmail = emailSendingFor === order.id;
            const isSavingShipping = shippingSavingFor === order.id;
            const isBusy = isUpdatingStatus || isSendingEmail || isSavingShipping;

            return (
              <article key={order.id} className={styles.orderCard}>
                <div className={styles.orderTop}>
                  <div className={styles.orderMain}>
                    <div className={styles.orderHeaderRow}>
                      <h2 className={styles.orderNumber}>{order.id}</h2>
                      <span
                        className={`${styles.statusBadge} ${
                          styles[`status-${order.status}`]
                        }`}
                      >
                        {getStatusLabel(order.status)}
                      </span>
                    </div>

                    <div className={styles.orderMeta}>
                      <p>
                        Client : <strong>{getCustomerFullName(order)}</strong>
                      </p>
                      <p>Date : {order.date || '—'}</p>
                      <p>
                        {order.itemsCount} article
                        {order.itemsCount > 1 ? 's' : ''}
                      </p>
                      <p>
                        {statusEmailInfo.sent
                          ? 'Mail statut envoyé'
                          : 'Mail statut non envoyé'}
                      </p>
                    </div>
                  </div>

                  <div className={styles.orderAside}>
                    <div className={styles.orderPriceBlock}>
                      <p className={styles.orderTotal}>{formatPrice(order.total)}</p>
                      <p className={styles.paymentMethod}>{order.paymentMethod}</p>
                    </div>

                    <button
                      type="button"
                      className={styles.viewButton}
                      aria-label={`Voir la commande ${order.id}`}
                      onClick={() => setSelectedOrderId(order.id)}
                    >
                      <FiEye aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className={styles.separator} />

                <div className={styles.orderActions}>
                  <select
                    className={styles.statusSelect}
                    value={order.status}
                    onChange={(event) =>
                      handleStatusChange(order.id, event.target.value)
                    }
                    aria-label={`Changer le statut de la commande ${order.id}`}
                    disabled={isUpdatingStatus}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className={styles.emailButton}
                    onClick={() => handleEmail(order)}
                    disabled={isSendingEmail || isUpdatingStatus}
                  >
                    <FiMail aria-hidden="true" />
                    <span>
                      {isSendingEmail ? 'Envoi en cours...' : 'Envoyer un email'}
                    </span>
                  </button>

                  {isBusy ? (
                    <span className={styles.trackingBadge}>
                      <FiClock aria-hidden="true" />
                      <span>Mise à jour...</span>
                    </span>
                  ) : order.trackingNumber ? (
                    <span className={styles.trackingBadge}>
                      <FiTruck aria-hidden="true" />
                      <span>Suivi : {order.trackingNumber}</span>
                    </span>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}