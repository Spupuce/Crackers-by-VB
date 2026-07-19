// components/admin/orders/AdminOrderDetail.js

import { FiArrowLeft, FiMail, FiRefreshCw, FiTruck } from 'react-icons/fi';
import styles from '../../../styles/AdminOrders.module.css';
import {
  CARRIER_OPTIONS,
  STATUS_OPTIONS,
  formatPrice,
  getAddressLabel,
  getCustomerFullName,
  getStatusEmailLabel,
  getStatusLabel,
} from '../../../utils/adminOrders';

export default function AdminOrderDetail({
  selectedOrder,
  detailEmailMessage,
  detailEmailFeedback,
  shippingForm,
  shippingSavingFor,
  shippingRefreshFor,
  shippingFeedback,
  selectedCarrierUsesAutoTracking,
  canRefreshSelectedOrderTracking,
  emailSendingFor,
  statusFeedback,
  setSelectedOrderId,
  setShippingForm,
  setDetailEmailMessage,
  handleSaveShipping,
  handleRefreshTracking,
  handleDetailEmailSend,
  handleStatusChange,
}) {
  if (!selectedOrder) {
    return null;
  }

  return (
    <section className={styles.detailPage}>
      <div className={styles.detailWrapper}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => setSelectedOrderId(null)}
        >
          <FiArrowLeft aria-hidden="true" />
          <span>Retour aux commandes</span>
        </button>

        <article className={styles.detailCard}>
          <div className={styles.detailHero}>
            <div>
              <h1 className={styles.detailTitle}>Commande {selectedOrder.id}</h1>
              <p className={styles.detailDate}>
                {selectedOrder.placedAtLabel || 'Date indisponible'}
              </p>
            </div>

            <span
              className={`${styles.statusBadge} ${
                styles[`status-${selectedOrder.status}`]
              } ${styles.detailStatusBadge}`}
            >
              {getStatusLabel(selectedOrder.status)}
            </span>
          </div>

          <div className={styles.detailSection}>
            <h2 className={styles.sectionTitle}>Informations client</h2>

            <div className={styles.infoCard}>
              <p>
                <strong>Nom :</strong> {getCustomerFullName(selectedOrder)}
              </p>
              <p>
                <strong>Email :</strong> {selectedOrder.customer.email}
              </p>
              <p>
                <strong>Téléphone :</strong> {selectedOrder.customer.phone || '—'}
              </p>
              <p>
                <strong>Adresse :</strong> {getAddressLabel(selectedOrder)}
              </p>
            </div>
          </div>

          <div className={styles.detailSection}>
            <h2 className={styles.sectionTitle}>Notes de commande</h2>

            <div className={styles.infoCard}>
              <p>{selectedOrder.notes || 'Aucune note laissée par la cliente.'}</p>
            </div>
          </div>

          <div className={styles.detailSection}>
            <h2 className={styles.sectionTitle}>Articles commandés</h2>

            <div className={styles.itemsList}>
              {selectedOrder.items.map((item) => (
                <div
                  key={`${selectedOrder.id}-${item.name}-${item.color || ''}`}
                  className={styles.itemCard}
                >
                  <div className={styles.itemLeft}>
                    <div className={styles.itemImageWrapper}>
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className={styles.itemImage}
                        />
                      ) : null}
                    </div>

                    <div className={styles.itemContent}>
                      <p className={styles.itemName}>{item.name}</p>
                      <p className={styles.itemMeta}>
                        Quantité : {item.quantity}
                        {item.color ? ` • Couleur : ${item.color}` : ''}
                      </p>
                      <p className={styles.itemUnitPrice}>
                        {formatPrice(item.unitPrice)} / unité
                      </p>
                    </div>
                  </div>

                  <p className={styles.itemTotal}>{formatPrice(item.lineTotal)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.detailSection}>
            <h2 className={styles.sectionTitle}>Détails de paiement</h2>

            <div className={styles.paymentCard}>
              <div className={styles.paymentRow}>
                <span>Sous-total</span>
                <span>{formatPrice(selectedOrder.subtotal)}</span>
              </div>
              <div className={styles.paymentRow}>
                <span>
                  Frais de port ({selectedOrder.shippingMethod || 'Livraison'})
                </span>
                <span>{formatPrice(selectedOrder.shippingAmount)}</span>
              </div>
              <div className={styles.paymentRow}>
                <strong>Mode de paiement</strong>
                <span>
                  {selectedOrder.paymentMethodLabel ||
                    selectedOrder.paymentMethod ||
                    'Carte bancaire'}
                </span>
              </div>
              <div className={styles.paymentRow}>
                <strong>Statut du paiement</strong>
                <span>{selectedOrder.paymentStatusLabel || 'Inconnu'}</span>
              </div>
              <div className={`${styles.paymentRow} ${styles.paymentTotalRow}`}>
                <strong>Total</strong>
                <strong className={styles.paymentTotalValue}>
                  {formatPrice(selectedOrder.total)}
                </strong>
              </div>
            </div>
          </div>

          <div className={styles.detailSection}>
            <h2 className={styles.sectionTitle}>Suivi de commande</h2>

            <div className={styles.emailPanel}>
              <label className={styles.emailLabel} htmlFor="order-shipping-carrier">
                Transporteur
              </label>
              <select
                id="order-shipping-carrier"
                className={styles.statusSelect}
                value={shippingForm.carrier}
                onChange={(event) =>
                  setShippingForm((current) => ({
                    ...current,
                    carrier: event.target.value,
                  }))
                }
                disabled={
                  shippingSavingFor === selectedOrder.id ||
                  shippingRefreshFor === selectedOrder.id
                }
              >
                {CARRIER_OPTIONS.map((option) => (
                  <option key={option.value || 'empty'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <label
                className={styles.emailLabel}
                htmlFor="order-shipping-tracking-number"
              >
                Numéro de suivi
              </label>
              <input
                id="order-shipping-tracking-number"
                type="text"
                className={styles.statusSelect}
                value={shippingForm.trackingNumber}
                onChange={(event) =>
                  setShippingForm((current) => ({
                    ...current,
                    trackingNumber: event.target.value,
                  }))
                }
                placeholder="Ex. : 12345678"
                disabled={
                  shippingSavingFor === selectedOrder.id ||
                  shippingRefreshFor === selectedOrder.id
                }
              />

              <label className={styles.emailLabel} htmlFor="order-shipping-tracking-url">
                Lien de suivi
              </label>
              {selectedCarrierUsesAutoTracking ? (
                <div className={styles.infoCard}>
                  <p>
                    Le lien de suivi sera généré automatiquement à l&apos;enregistrement
                    à partir du transporteur et du numéro de suivi.
                  </p>
                  {selectedOrder.trackingUrl ? (
                    <p>
                      <strong>Lien actuel :</strong>{' '}
                      <a
                        href={selectedOrder.trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Ouvrir le suivi
                      </a>
                    </p>
                  ) : null}
                </div>
              ) : (
                <input
                  id="order-shipping-tracking-url"
                  type="text"
                  className={styles.statusSelect}
                  value={shippingForm.trackingUrl}
                  onChange={(event) =>
                    setShippingForm((current) => ({
                      ...current,
                      trackingUrl: event.target.value,
                    }))
                  }
                  placeholder="Ex. : https://www.transporteur.fr/suivi"
                  disabled={
                    shippingSavingFor === selectedOrder.id ||
                    shippingRefreshFor === selectedOrder.id
                  }
                />
              )}

              {!selectedCarrierUsesAutoTracking && selectedOrder.trackingUrl ? (
                <p className={styles.emailPanelHint}>
                  Lien actuel :{' '}
                  <a href={selectedOrder.trackingUrl} target="_blank" rel="noreferrer">
                    Ouvrir le suivi
                  </a>
                </p>
              ) : null}

              {shippingFeedback.message ? (
                <p
                  className={`${styles.emailFeedback} ${
                    shippingFeedback.type === 'success'
                      ? styles.emailFeedbackSuccess
                      : styles.emailFeedbackError
                  }`}
                >
                  {shippingFeedback.message}
                </p>
              ) : null}

              <div className={styles.emailPanelActions}>
                <button
                  type="button"
                  className={styles.emailButton}
                  onClick={handleSaveShipping}
                  disabled={
                    shippingSavingFor === selectedOrder.id ||
                    shippingRefreshFor === selectedOrder.id
                  }
                >
                  <FiTruck aria-hidden="true" />
                  <span>
                    {shippingSavingFor === selectedOrder.id
                      ? 'Enregistrement...'
                      : 'Enregistrer le suivi'}
                  </span>
                </button>

                {canRefreshSelectedOrderTracking ? (
                  <button
                    type="button"
                    className={styles.emailButton}
                    onClick={handleRefreshTracking}
                    disabled={
                      shippingSavingFor === selectedOrder.id ||
                      shippingRefreshFor === selectedOrder.id
                    }
                  >
                    <FiRefreshCw aria-hidden="true" />
                    <span>
                      {shippingRefreshFor === selectedOrder.id
                        ? 'Actualisation...'
                        : 'Actualiser le suivi'}
                    </span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className={styles.detailSection}>
            <h2 className={styles.sectionTitle}>Envoyer un email</h2>

            <div className={styles.emailPanel}>
              <p className={styles.emailPanelText}>
                Destinataire client : <strong>{selectedOrder.customer.email}</strong>
              </p>
              <p className={styles.emailPanelHint}>
                Cet email sera envoyé directement à la cliente à l&apos;adresse
                ci-dessus.
              </p>
              <p className={styles.emailPanelHint}>{getStatusEmailLabel(selectedOrder)}</p>

              <label className={styles.emailLabel} htmlFor="order-email-message">
                Message
              </label>
              <textarea
                id="order-email-message"
                className={styles.emailTextarea}
                value={detailEmailMessage}
                onChange={(event) => setDetailEmailMessage(event.target.value)}
                rows={8}
              />

              {detailEmailFeedback.message ? (
                <p
                  className={`${styles.emailFeedback} ${
                    detailEmailFeedback.type === 'success'
                      ? styles.emailFeedbackSuccess
                      : styles.emailFeedbackError
                  }`}
                >
                  {detailEmailFeedback.message}
                </p>
              ) : null}

              <div className={styles.emailPanelActions}>
                <button
                  type="button"
                  className={styles.emailButton}
                  onClick={handleDetailEmailSend}
                  disabled={emailSendingFor === selectedOrder.id}
                >
                  <FiMail aria-hidden="true" />
                  <span>
                    {emailSendingFor === selectedOrder.id
                      ? 'Envoi en cours...'
                      : 'Envoyer cet email'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className={styles.detailSection}>
            <h2 className={styles.sectionTitle}>Modifier le statut</h2>

            {statusFeedback.message ? (
              <p
                className={`${styles.emailFeedback} ${
                  statusFeedback.type === 'success'
                    ? styles.emailFeedbackSuccess
                    : styles.emailFeedbackError
                }`}
              >
                {statusFeedback.message}
              </p>
            ) : null}

            <div className={styles.statusTabs}>
              {STATUS_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isActive = selectedOrder.status === option.value;
                const isUpdating = statusUpdatingFor === selectedOrder.id;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`${styles.statusTab} ${
                      isActive ? styles.statusTabActive : ''
                    }`}
                    onClick={() => handleStatusChange(selectedOrder.id, option.value)}
                    disabled={isUpdating}
                  >
                    <Icon aria-hidden="true" />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}