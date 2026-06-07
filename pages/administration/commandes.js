// pages/administration/commandes.js

import { useMemo, useState } from 'react';
import Head from 'next/head';
import { FiClock, FiPackage, FiTruck, FiCheckCircle, FiEye, FiMail, FiTruck as FiTracking } from 'react-icons/fi';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import styles from '../../styles/AdminOrders.module.css';

const ORDER_STATUSES = [
  { value: 'all', label: 'Toutes', icon: null },
  { value: 'pending', label: 'En attente', icon: FiClock },
  { value: 'preparing', label: 'En préparation', icon: FiPackage },
  { value: 'shipped', label: 'Expédiée', icon: FiTruck },
  { value: 'delivered', label: 'Livrée', icon: FiCheckCircle },
];

const STATUS_OPTIONS = [
  { value: 'pending', label: 'En attente' },
  { value: 'preparing', label: 'En préparation' },
  { value: 'shipped', label: 'Expédiée' },
  { value: 'delivered', label: 'Livrée' },
];

const INITIAL_ORDERS = [
  {
    id: 'CMD-2024-001',
    customerName: 'Marie Dubois',
    customerEmail: 'marie.dubois@email.com',
    date: '05/06/2024',
    itemsCount: 2,
    total: 184.9,
    paymentMethod: 'Carte bancaire',
    status: 'pending',
    trackingNumber: '',
    trackingUrl: '',
  },
  {
    id: 'CMD-2024-002',
    customerName: 'Sophie Martin',
    customerEmail: 'sophie.martin@email.com',
    date: '04/06/2024',
    itemsCount: 1,
    total: 46.9,
    paymentMethod: 'PayPal',
    status: 'preparing',
    trackingNumber: '',
    trackingUrl: '',
  },
  {
    id: 'CMD-2024-003',
    customerName: 'Julie Petit',
    customerEmail: 'julie.petit@email.com',
    date: '03/06/2024',
    itemsCount: 2,
    total: 116,
    paymentMethod: 'Virement bancaire',
    status: 'shipped',
    trackingNumber: 'FR123456789',
    trackingUrl: '',
  },
  {
    id: 'CMD-2024-004',
    customerName: 'Claire Rousseau',
    customerEmail: 'claire.rousseau@email.com',
    date: '01/06/2024',
    itemsCount: 1,
    total: 49.9,
    paymentMethod: 'Carte bancaire',
    status: 'delivered',
    trackingNumber: '',
    trackingUrl: '',
  },
];

function formatPrice(value) {
  return `${Number(value).toFixed(2)} €`;
}

function getStatusLabel(status) {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label || status;
}

export default function AdminOrdersPage() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [orders, setOrders] = useState(INITIAL_ORDERS);

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

  function handleStatusChange(orderId, nextStatus) {
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status: nextStatus,
            }
          : order
      )
    );
  }

  function handleEmail(order) {
    const subject = encodeURIComponent(`Commande ${order.id} - Crackers by VB`);
    const body = encodeURIComponent(
      `Bonjour ${order.customerName},\n\nConcernant votre commande ${order.id},\n\nStatut actuel : ${getStatusLabel(order.status)}.\n${
        order.trackingNumber
          ? `Numéro de suivi : ${order.trackingNumber}\n`
          : ''
      }${
        order.trackingUrl
          ? `Lien de suivi : ${order.trackingUrl}\n`
          : ''
      }\nBelle journée,\nCrackers by VB`
    );

    window.location.href = `mailto:${order.customerEmail}?subject=${subject}&body=${body}`;
  }

  return (
    <>
      <Head>
        <title>Commandes - Administration | Crackers by VB</title>
      </Head>

      <Header />

      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>Administration</p>
            <h1 className={styles.title}>Gestion des commandes</h1>
            <p className={styles.subtitle}>
              Visualisez et gérez toutes les commandes de vos clients.
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
                        Client : <strong>{order.customerName}</strong>
                      </p>
                      <p>Date : {order.date}</p>
                      <p>
                        {order.itemsCount} article{order.itemsCount > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className={styles.orderAside}>
                    <p className={styles.orderTotal}>{formatPrice(order.total)}</p>
                    <p className={styles.paymentMethod}>{order.paymentMethod}</p>
                    <button type="button" className={styles.viewButton} aria-label={`Voir la commande ${order.id}`}>
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
                  >
                    <FiMail aria-hidden="true" />
                    <span>Envoyer un email</span>
                  </button>

                  {order.trackingNumber ? (
                    <span className={styles.trackingBadge}>
                      <FiTracking aria-hidden="true" />
                      <span>Suivi : {order.trackingNumber}</span>
                    </span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}