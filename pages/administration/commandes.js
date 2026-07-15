// pages/administration/commandes.js

import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { FiArrowLeft, FiMail, FiTruck } from 'react-icons/fi';
import { useRouter } from 'next/router';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import AdminOrdersList from '../../components/admin/orders/AdminOrdersList';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/AdminOrders.module.css';
import {
  CARRIER_OPTIONS,
  STATUS_OPTIONS,
  formatPrice,
  getAddressLabel,
  getCustomerFullName,
  getDefaultEmailMessage,
  getStatusEmailLabel,
  getStatusLabel,
  isAutoTrackingCarrier,
  normalizeAdminOrder,
} from '../../utils/adminOrders';

export default function AdminOrdersPage() {
  const router = useRouter();
  const { isAuthenticated, isAdmin, isAuthReady } = useAuth();

  const [activeFilter, setActiveFilter] = useState('all');
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [emailSendingFor, setEmailSendingFor] = useState('');
  const [detailEmailMessage, setDetailEmailMessage] = useState('');
  const [detailEmailFeedback, setDetailEmailFeedback] = useState({
    type: '',
    message: '',
  });
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState('');
  const [statusUpdatingFor, setStatusUpdatingFor] = useState('');
  const [statusFeedback, setStatusFeedback] = useState({
    type: '',
    message: '',
  });
  const [shippingForm, setShippingForm] = useState({
    carrier: '',
    trackingNumber: '',
    trackingUrl: '',
  });
  const [shippingSavingFor, setShippingSavingFor] = useState('');
  const [shippingFeedback, setShippingFeedback] = useState({
    type: '',
    message: '',
  });

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) || null;
  const selectedCarrierUsesAutoTracking = isAutoTrackingCarrier(shippingForm.carrier);

  const patchOrderInState = useCallback((orderId, patch) => {
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              ...patch,
              statusEmail: {
                ...(order.statusEmail || {}),
                ...(patch.statusEmail || {}),
              },
            }
          : order
      )
    );
  }, []);

  const loadOrders = useCallback(async ({ keepLoadingState = true } = {}) => {
    if (keepLoadingState) {
      setIsLoadingOrders(true);
    }

    setOrdersError('');

    const response = await fetch('/api/admin/orders');
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.message || 'Impossible de récupérer les commandes.');
    }

    const nextOrders = Array.isArray(data?.orders)
      ? data.orders.map(normalizeAdminOrder)
      : [];

    setOrders(nextOrders);

    return nextOrders;
  }, []);

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    if (!isAuthenticated) {
      router.replace('/connexion?redirect=/administration/commandes');
      return;
    }

    if (!isAdmin) {
      router.replace('/');
    }
  }, [isAuthReady, isAuthenticated, isAdmin, router]);

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated || !isAdmin) {
      return;
    }

    let isCancelled = false;

    async function initOrders() {
      try {
        await loadOrders();

        if (isCancelled) {
          return;
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setOrders([]);
        setOrdersError(error?.message || 'Impossible de charger les commandes.');
      } finally {
        if (!isCancelled) {
          setIsLoadingOrders(false);
        }
      }
    }

    initOrders();

    return () => {
      isCancelled = true;
    };
  }, [isAuthReady, isAuthenticated, isAdmin, loadOrders]);

  useEffect(() => {
    if (!selectedOrder) {
      setDetailEmailMessage('');
      setDetailEmailFeedback({ type: '', message: '' });
      setShippingForm({
        carrier: '',
        trackingNumber: '',
        trackingUrl: '',
      });
      setShippingFeedback({ type: '', message: '' });
      return;
    }

    setDetailEmailMessage(getDefaultEmailMessage(selectedOrder));
    setDetailEmailFeedback({ type: '', message: '' });
    setShippingForm({
      carrier: selectedOrder.shippingCarrier || '',
      trackingNumber: selectedOrder.trackingNumber || '',
      trackingUrl: selectedOrder.trackingUrl || '',
    });
    setShippingFeedback({ type: '', message: '' });
  }, [selectedOrderId, selectedOrder]);

  useEffect(() => {
    if (!selectedOrderId) {
      return;
    }

    const orderStillExists = orders.some((order) => order.id === selectedOrderId);

    if (!orderStillExists) {
      setSelectedOrderId(null);
    }
  }, [orders, selectedOrderId]);

  useEffect(() => {
    if (selectedCarrierUsesAutoTracking && shippingForm.trackingUrl) {
      setShippingForm((current) => ({
        ...current,
        trackingUrl: '',
      }));
    }
  }, [selectedCarrierUsesAutoTracking, shippingForm.trackingUrl]);

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'all') {
      return orders;
    }

    return orders.filter((order) => order.status === activeFilter);
  }, [activeFilter, orders]);

  const counts = useMemo(() => {
    return {
      all: orders.length,
      pending: orders.filter((order) => order.status === 'pending').length,
      preparing: orders.filter((order) => order.status === 'preparing').length,
      shipped: orders.filter((order) => order.status === 'shipped').length,
      delivered: orders.filter((order) => order.status === 'delivered').length,
    };
  }, [orders]);

  async function handleStatusChange(orderId, nextStatus) {
    const targetOrder = orders.find((order) => order.id === orderId);

    if (!targetOrder || !targetOrder.sourceId) {
      setStatusFeedback({
        type: 'error',
        message: 'Commande introuvable pour la mise à jour du statut.',
      });
      return;
    }

    if (targetOrder.status === nextStatus) {
      return;
    }

    setStatusUpdatingFor(orderId);
    setStatusFeedback({ type: '', message: '' });

    try {
      const response = await fetch(`/api/admin/orders/${targetOrder.sourceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: nextStatus,
          carrier: targetOrder.shippingCarrier || '',
          trackingNumber: targetOrder.trackingNumber || '',
          trackingUrl: targetOrder.trackingUrl || '',
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || 'Impossible de mettre à jour le statut.');
      }

      const refreshedOrders = await loadOrders({ keepLoadingState: false });
      const refreshedOrder = refreshedOrders.find((order) => order.id === orderId);

      if (selectedOrderId === orderId && refreshedOrder) {
        setShippingForm({
          carrier: refreshedOrder.shippingCarrier || '',
          trackingNumber: refreshedOrder.trackingNumber || '',
          trackingUrl: refreshedOrder.trackingUrl || '',
        });
        setDetailEmailMessage(getDefaultEmailMessage(refreshedOrder));
      }

      setStatusFeedback({
        type: 'success',
        message: `Statut de la commande ${targetOrder.id} mis à jour en "${getStatusLabel(
          refreshedOrder?.status || data?.order?.status || nextStatus
        )}".`,
      });
    } catch (error) {
      setStatusFeedback({
        type: 'error',
        message:
          error?.message || 'Impossible de mettre à jour le statut de la commande.',
      });
    } finally {
      setStatusUpdatingFor('');
    }
  }

  async function handleSaveShipping() {
    if (!selectedOrder || !selectedOrder.sourceId) {
      setShippingFeedback({
        type: 'error',
        message: 'Commande introuvable pour la mise à jour du suivi.',
      });
      return;
    }

    const trimmedTrackingNumber = shippingForm.trackingNumber.trim();
    const trimmedTrackingUrl = shippingForm.trackingUrl.trim();

    if (!shippingForm.carrier && (trimmedTrackingNumber || trimmedTrackingUrl)) {
      setShippingFeedback({
        type: 'error',
        message: 'Merci de sélectionner un transporteur avant d’enregistrer le suivi.',
      });
      return;
    }

    const nextStatus =
      (selectedOrder.status === 'pending' || selectedOrder.status === 'preparing') &&
      trimmedTrackingNumber
        ? 'shipped'
        : selectedOrder.status;

    setShippingSavingFor(selectedOrder.id);
    setShippingFeedback({ type: '', message: '' });

    try {
      const response = await fetch(`/api/admin/orders/${selectedOrder.sourceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: nextStatus,
          carrier: shippingForm.carrier,
          trackingNumber: trimmedTrackingNumber,
          trackingUrl: selectedCarrierUsesAutoTracking ? '' : trimmedTrackingUrl,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message || 'Impossible de mettre à jour les informations de suivi.'
        );
      }

      const refreshedOrders = await loadOrders({ keepLoadingState: false });
      const refreshedOrder = refreshedOrders.find(
        (order) => order.id === selectedOrder.id
      );

      if (refreshedOrder) {
        setShippingForm({
          carrier: refreshedOrder.shippingCarrier || '',
          trackingNumber: refreshedOrder.trackingNumber || '',
          trackingUrl: refreshedOrder.trackingUrl || '',
        });
        setDetailEmailMessage(getDefaultEmailMessage(refreshedOrder));
      }

      setShippingFeedback({
        type: 'success',
        message:
          nextStatus !== selectedOrder.status
            ? 'Suivi enregistré et statut mis à jour en "Expédiée".'
            : 'Informations de suivi enregistrées avec succès.',
      });
    } catch (error) {
      setShippingFeedback({
        type: 'error',
        message:
          error?.message || 'Impossible de mettre à jour les informations de suivi.',
      });
    } finally {
      setShippingSavingFor('');
    }
  }

  async function handleEmail(order) {
    setEmailSendingFor(order.id);
    setStatusFeedback({ type: '', message: '' });

    try {
      const response = await fetch('/api/admin/orders/send-test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientType: 'customer',
          testEmail: '',
          orderId: order.id,
          customerName: getCustomerFullName(order),
          customerEmail: order.customer.email,
          statusLabel: getStatusLabel(order.status),
          trackingNumber: order.trackingNumber || '',
          trackingUrl: order.trackingUrl || '',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "L'envoi de l'email a échoué.");
      }

      patchOrderInState(order.id, {
        statusEmail: {
          sent: true,
          sentAt: new Date().toISOString(),
          sentForStatus: order.status,
        },
      });

      await loadOrders({ keepLoadingState: false });

      setStatusFeedback({
        type: 'success',
        message: `Email envoyé pour ${order.id} à ${order.customer.email}.`,
      });
    } catch (error) {
      setStatusFeedback({
        type: 'error',
        message: error?.message || "Impossible d'envoyer l'email.",
      });
    } finally {
      setEmailSendingFor('');
    }
  }

  async function handleDetailEmailSend() {
    if (!selectedOrder) {
      return;
    }

    setEmailSendingFor(selectedOrder.id);
    setDetailEmailFeedback({ type: '', message: '' });

    try {
      const response = await fetch('/api/admin/orders/send-test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientType: 'customer',
          testEmail: '',
          orderId: selectedOrder.id,
          customerName: getCustomerFullName(selectedOrder),
          customerEmail: selectedOrder.customer.email,
          statusLabel: getStatusLabel(selectedOrder.status),
          trackingNumber: selectedOrder.trackingNumber || '',
          trackingUrl: selectedOrder.trackingUrl || '',
          customMessage: detailEmailMessage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "L'envoi de l'email a échoué.");
      }

      patchOrderInState(selectedOrder.id, {
        statusEmail: {
          sent: true,
          sentAt: new Date().toISOString(),
          sentForStatus: selectedOrder.status,
        },
      });

      const refreshedOrders = await loadOrders({ keepLoadingState: false });
      const refreshedOrder = refreshedOrders.find(
        (order) => order.id === selectedOrder.id
      );

      if (refreshedOrder) {
        setDetailEmailMessage(getDefaultEmailMessage(refreshedOrder));
      }

      setDetailEmailFeedback({
        type: 'success',
        message: `Email envoyé à ${selectedOrder.customer.email} pour ${selectedOrder.id}.`,
      });
    } catch (error) {
      setDetailEmailFeedback({
        type: 'error',
        message: error?.message || "Impossible d'envoyer l'email.",
      });
    } finally {
      setEmailSendingFor('');
    }
  }

  if (!isAuthReady) {
    return (
      <>
        <Head>
          <title>Commandes - Administration | Crackers by VB</title>
        </Head>

        <Header />

        <main className={styles.page}>
          <div className={styles.loadingContainer}>
            <div className={styles.loadingBox}>Vérification de la session...</div>
          </div>
        </main>

        <Footer />
      </>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <>
        <Head>
          <title>Commandes - Administration | Crackers by VB</title>
        </Head>

        <Header />

        <main className={styles.page}>
          <div className={styles.loadingContainer}>
            <div className={styles.loadingBox}>Redirection en cours...</div>
          </div>
        </main>

        <Footer />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Commandes - Administration | Crackers by VB</title>
      </Head>

      <Header />

      <main className={styles.page}>
        {!selectedOrder ? (
          <>
            <section className={styles.hero}>
              <div className={styles.heroContent}>
                <h1 className={styles.title}>Gestion des commandes</h1>
                <p className={styles.subtitle}>
                  Visualisez et gérez toutes les commandes de vos clients
                </p>
              </div>
            </section>

            <AdminOrdersList
              activeFilter={activeFilter}
              counts={counts}
              emailSendingFor={emailSendingFor}
              filteredOrders={filteredOrders}
              handleEmail={handleEmail}
              handleStatusChange={handleStatusChange}
              isLoadingOrders={isLoadingOrders}
              ordersError={ordersError}
              setActiveFilter={setActiveFilter}
              setSelectedOrderId={setSelectedOrderId}
              shippingSavingFor={shippingSavingFor}
              statusFeedback={statusFeedback}
              statusUpdatingFor={statusUpdatingFor}
            />
          </>
        ) : (
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
                      <span>{selectedOrder.paymentMethod}</span>
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
                      disabled={shippingSavingFor === selectedOrder.id}
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
                      disabled={shippingSavingFor === selectedOrder.id}
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
                        disabled={shippingSavingFor === selectedOrder.id}
                      />
                    )}

                    {!selectedCarrierUsesAutoTracking && selectedOrder.trackingUrl ? (
                      <p className={styles.emailPanelHint}>
                        Lien actuel :{' '}
                        <a
                          href={selectedOrder.trackingUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
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
                        disabled={shippingSavingFor === selectedOrder.id}
                      >
                        <FiTruck aria-hidden="true" />
                        <span>
                          {shippingSavingFor === selectedOrder.id
                            ? 'Enregistrement...'
                            : 'Enregistrer le suivi'}
                        </span>
                      </button>
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
                          onClick={() =>
                            handleStatusChange(selectedOrder.id, option.value)
                          }
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
        )}
      </main>

      <Footer />
    </>
  );
}