// pages/administration/commandes.js

import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import AdminOrdersList from '../../components/admin/orders/AdminOrdersList';
import AdminOrderDetail from '../../components/admin/orders/AdminOrderDetail';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/AdminOrders.module.css';
import {
  getCustomerFullName,
  getDefaultEmailMessage,
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
  const [shippingRefreshFor, setShippingRefreshFor] = useState('');
  const [shippingFeedback, setShippingFeedback] = useState({
    type: '',
    message: '',
  });

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) || null;
  const selectedCarrierUsesAutoTracking = isAutoTrackingCarrier(shippingForm.carrier);
  const canRefreshSelectedOrderTracking = Boolean(
    selectedOrder &&
      selectedOrder.sourceId &&
      selectedOrder.status === 'shipped' &&
      (selectedOrder.shippingCarrier || '').trim() &&
      (selectedOrder.trackingNumber || '').trim()
  );

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
      cancelled: orders.filter((order) => order.status === 'cancelled').length,
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

  async function handleRefreshTracking() {
    if (!selectedOrder || !selectedOrder.sourceId) {
      setShippingFeedback({
        type: 'error',
        message: 'Commande introuvable pour l’actualisation du suivi.',
      });
      return;
    }

    setShippingRefreshFor(selectedOrder.id);
    setShippingFeedback({ type: '', message: '' });

    try {
      const response = await fetch(
        `/api/admin/orders/${selectedOrder.sourceId}/refresh-tracking`,
        {
          method: 'POST',
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || 'Impossible d’actualiser le suivi.');
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
        type: data?.ok ? 'success' : 'error',
        message:
          data?.message ||
          (data?.updated
            ? 'Suivi actualisé avec succès.'
            : 'Aucune mise à jour détectée sur le suivi.'),
      });
    } catch (error) {
      setShippingFeedback({
        type: 'error',
        message: error?.message || 'Impossible d’actualiser le suivi.',
      });
    } finally {
      setShippingRefreshFor('');
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
          <AdminOrderDetail
            selectedOrder={selectedOrder}
            detailEmailMessage={detailEmailMessage}
            detailEmailFeedback={detailEmailFeedback}
            shippingForm={shippingForm}
            shippingSavingFor={shippingSavingFor}
            shippingRefreshFor={shippingRefreshFor}
            shippingFeedback={shippingFeedback}
            selectedCarrierUsesAutoTracking={selectedCarrierUsesAutoTracking}
            canRefreshSelectedOrderTracking={canRefreshSelectedOrderTracking}
            emailSendingFor={emailSendingFor}
            statusFeedback={statusFeedback}
            statusUpdatingFor={statusUpdatingFor}
            setSelectedOrderId={setSelectedOrderId}
            setShippingForm={setShippingForm}
            setDetailEmailMessage={setDetailEmailMessage}
            handleSaveShipping={handleSaveShipping}
            handleRefreshTracking={handleRefreshTracking}
            handleDetailEmailSend={handleDetailEmailSend}
            handleStatusChange={handleStatusChange}
          />
        )}
      </main>

      <Footer />
    </>
  );
}