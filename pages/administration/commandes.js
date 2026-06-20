// pages/administration/commandes.js

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import {
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiEye,
  FiMail,
  FiPackage,
  FiTruck,
} from 'react-icons/fi';
import { useRouter } from 'next/router';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/AdminOrders.module.css';

const ORDER_STATUSES = [
  { value: 'all', label: 'Toutes', icon: null },
  { value: 'pending', label: 'En attente', icon: FiClock },
  { value: 'preparing', label: 'En préparation', icon: FiPackage },
  { value: 'shipped', label: 'Expédiée', icon: FiTruck },
  { value: 'delivered', label: 'Livrée', icon: FiCheckCircle },
];

const STATUS_OPTIONS = [
  { value: 'pending', label: 'En attente', icon: FiClock },
  { value: 'preparing', label: 'En préparation', icon: FiPackage },
  { value: 'shipped', label: 'Expédiée', icon: FiTruck },
  { value: 'delivered', label: 'Livrée', icon: FiCheckCircle },
];

function formatPrice(value) {
  return `${Number(value || 0).toFixed(2)} €`;
}

function getStatusLabel(status) {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label || status;
}

function getCustomerFullName(order) {
  return `${order.customer.firstName} ${order.customer.lastName}`.trim();
}

function getAddressLabel(order) {
  const { addressLine1, addressLine2, postalCode, city, country } =
    order.shippingAddress;

  return [addressLine1, addressLine2, `${postalCode} ${city}`, country]
    .filter(Boolean)
    .join(', ');
}

function getDefaultEmailMessage(order) {
  const statusLabel = getStatusLabel(order.status);

  if (order.status === 'shipped') {
    return `Bonjour ${getCustomerFullName(
      order
    )},\n\nVotre commande ${order.id} a bien été expédiée.\n${
      order.trackingNumber
        ? `Votre numéro de suivi : ${order.trackingNumber}\n`
        : ''
    }\nBelle journée,\nCrackers by VB`;
  }

  if (order.status === 'delivered') {
    return `Bonjour ${getCustomerFullName(
      order
    )},\n\nVotre commande ${order.id} a bien été livrée.\nNous espérons qu'elle vous plaît.\n\nBelle journée,\nCrackers by VB`;
  }

  return `Bonjour ${getCustomerFullName(
    order
  )},\n\nNous vous contactons au sujet de votre commande ${
    order.id
  }.\nStatut actuel : ${statusLabel}.\n\nBelle journée,\nCrackers by VB`;
}

function formatOrderDate(value) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('fr-FR');
}

function formatPlacedAtLabel(value) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `Passée le ${date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`;
}

function getPaymentMethodLabel(order) {
  if (order.paymentStatus === 'paid') {
    return 'Carte bancaire';
  }

  if (order.paymentStatus === 'pending') {
    return 'Paiement en attente';
  }

  if (order.paymentStatus === 'failed') {
    return 'Paiement échoué';
  }

  if (order.paymentStatus === 'refunded') {
    return 'Paiement remboursé';
  }

  return 'Paiement';
}

function normalizeAdminOrder(apiOrder) {
  const items = Array.isArray(apiOrder?.items)
    ? apiOrder.items.map((item) => ({
        name: item.name || '',
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
        lineTotal: Number(item.unitPrice || 0) * Number(item.quantity || 0),
        imageUrl: item.imageUrl || '',
        color: item.color || '',
      }))
    : [];

  return {
    id: apiOrder.orderNumber || apiOrder._id || '',
    sourceId: apiOrder._id || '',
    customer: {
      firstName: apiOrder.customer?.firstName || '',
      lastName: apiOrder.customer?.lastName || '',
      email: apiOrder.customer?.email || '',
      phone: apiOrder.customer?.phone || '',
    },
    shippingAddress: {
      addressLine1: apiOrder.shippingAddress?.addressLine1 || '',
      addressLine2: apiOrder.shippingAddress?.addressLine2 || '',
      postalCode: apiOrder.shippingAddress?.postalCode || '',
      city: apiOrder.shippingAddress?.city || '',
      country: apiOrder.shippingAddress?.country || '',
    },
    date: formatOrderDate(apiOrder.createdAt),
    placedAtLabel: formatPlacedAtLabel(apiOrder.createdAt),
    itemsCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: Number(apiOrder.subtotalAmount || 0),
    shippingAmount: Number(apiOrder.shippingAmount || 0),
    total: Number(apiOrder.totalAmount || 0),
    paymentMethod: getPaymentMethodLabel(apiOrder),
    paymentStatus: apiOrder.paymentStatus || 'pending',
    status: apiOrder.status || 'pending',
    trackingNumber: apiOrder.shipping?.trackingNumber || '',
    trackingUrl: apiOrder.shipping?.trackingUrl || '',
    shippingMethod:
      apiOrder.shipping?.method || apiOrder.shipping?.carrier || 'Livraison',
    items,
  };
}

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

  const selectedOrder =
    orders.find((order) => order.id === selectedOrderId) || null;

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

    async function loadOrders() {
      setIsLoadingOrders(true);
      setOrdersError('');

      try {
        const response = await fetch('/api/admin/orders');
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            data?.message || 'Impossible de récupérer les commandes.'
          );
        }

        if (isCancelled) {
          return;
        }

        const nextOrders = Array.isArray(data?.orders)
          ? data.orders.map(normalizeAdminOrder)
          : [];

        setOrders(nextOrders);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setOrders([]);
        setOrdersError(
          error?.message || 'Impossible de charger les commandes.'
        );
      } finally {
        if (!isCancelled) {
          setIsLoadingOrders(false);
        }
      }
    }

    loadOrders();

    return () => {
      isCancelled = true;
    };
  }, [isAuthReady, isAuthenticated, isAdmin]);

  useEffect(() => {
    if (!selectedOrder) {
      setDetailEmailMessage('');
      setDetailEmailFeedback({ type: '', message: '' });
      return;
    }

    setDetailEmailMessage(getDefaultEmailMessage(selectedOrder));
    setDetailEmailFeedback({ type: '', message: '' });
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
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message || 'Impossible de mettre à jour le statut.'
        );
      }

      const updatedStatus = data?.order?.status || nextStatus;
      const updatedTrackingNumber =
        data?.order?.shipping?.trackingNumber ?? targetOrder.trackingNumber;
      const updatedTrackingUrl =
        data?.order?.shipping?.trackingUrl ?? targetOrder.trackingUrl;
      const updatedShippingMethod =
        data?.order?.shipping?.method ||
        data?.order?.shipping?.carrier ||
        targetOrder.shippingMethod;

      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: updatedStatus,
                trackingNumber: updatedTrackingNumber,
                trackingUrl: updatedTrackingUrl,
                shippingMethod: updatedShippingMethod,
              }
            : order
        )
      );

      setStatusFeedback({
        type: 'success',
        message: `Statut de la commande ${targetOrder.id} mis à jour en "${getStatusLabel(
          updatedStatus
        )}".`,
      });
    } catch (error) {
      setStatusFeedback({
        type: 'error',
        message:
          error?.message ||
          'Impossible de mettre à jour le statut de la commande.',
      });
    } finally {
      setStatusUpdatingFor('');
    }
  }

  async function handleEmail(order) {
    setEmailSendingFor(order.id);

    try {
      const response = await fetch('/api/admin/orders/send-test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testEmail: 'spupucemail@gmail.com',
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

      window.alert(`Email envoyé pour ${order.id} à spupucemail@gmail.com.`);
    } catch (error) {
      window.alert(error?.message || "Impossible d'envoyer l'email.");
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
          testEmail: 'spupucemail@gmail.com',
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

      setDetailEmailFeedback({
        type: 'success',
        message: `Email envoyé à spupucemail@gmail.com pour ${selectedOrder.id}.`,
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
                        activeFilter === status.value
                          ? styles.filterButtonActive
                          : ''
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
                  className={`${styles.loadingContainer} ${styles.statusFeedbackWrapper || ''}`}
                >
                  <div className={styles.loadingBox}>{statusFeedback.message}</div>
                </div>
              ) : null}

              {isLoadingOrders ? (
                <div className={styles.loadingContainer}>
                  <div className={styles.loadingBox}>
                    Chargement des commandes...
                  </div>
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
                  {filteredOrders.map((order) => (
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
                          </div>
                        </div>

                        <div className={styles.orderAside}>
                          <div className={styles.orderPriceBlock}>
                            <p className={styles.orderTotal}>
                              {formatPrice(order.total)}
                            </p>
                            <p className={styles.paymentMethod}>
                              {order.paymentMethod}
                            </p>
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
                          disabled={statusUpdatingFor === order.id}
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
                          disabled={
                            emailSendingFor === order.id ||
                            statusUpdatingFor === order.id
                          }
                        >
                          <FiMail aria-hidden="true" />
                          <span>
                            {emailSendingFor === order.id
                              ? 'Envoi en cours...'
                              : 'Envoyer un email'}
                          </span>
                        </button>

                        {statusUpdatingFor === order.id ? (
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
                  ))}
                </div>
              )}
            </section>
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
                    <h1 className={styles.detailTitle}>
                      Commande {selectedOrder.id}
                    </h1>
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
                      <strong>Nom :</strong>{' '}
                      {getCustomerFullName(selectedOrder)}
                    </p>
                    <p>
                      <strong>Email :</strong> {selectedOrder.customer.email}
                    </p>
                    <p>
                      <strong>Téléphone :</strong>{' '}
                      {selectedOrder.customer.phone || '—'}
                    </p>
                    <p>
                      <strong>Adresse :</strong>{' '}
                      {getAddressLabel(selectedOrder)}
                    </p>
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

                        <p className={styles.itemTotal}>
                          {formatPrice(item.lineTotal)}
                        </p>
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
                        Frais de port (
                        {selectedOrder.shippingMethod || 'Livraison'})
                      </span>
                      <span>{formatPrice(selectedOrder.shippingAmount)}</span>
                    </div>
                    <div className={styles.paymentRow}>
                      <strong>Mode de paiement</strong>
                      <span>{selectedOrder.paymentMethod}</span>
                    </div>
                    <div
                      className={`${styles.paymentRow} ${styles.paymentTotalRow}`}
                    >
                      <strong>Total</strong>
                      <strong className={styles.paymentTotalValue}>
                        {formatPrice(selectedOrder.total)}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className={styles.detailSection}>
                  <h2 className={styles.sectionTitle}>Envoyer un email</h2>

                  <div className={styles.emailPanel}>
                    <p className={styles.emailPanelText}>
                      Destinataire client :{' '}
                      <strong>{selectedOrder.customer.email}</strong>
                    </p>
                    <p className={styles.emailPanelHint}>
                      Pour ce test, l’envoi part encore vers
                      <strong> spupucemail@gmail.com</strong>.
                    </p>

                    <label
                      className={styles.emailLabel}
                      htmlFor="order-email-message"
                    >
                      Message
                    </label>

                    <textarea
                      id="order-email-message"
                      className={styles.emailTextarea}
                      value={detailEmailMessage}
                      onChange={(event) =>
                        setDetailEmailMessage(event.target.value)
                      }
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
                            handleStatusChange(
                              selectedOrder.id,
                              option.value
                            )
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