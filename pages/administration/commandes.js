// pages/administration/commandes.js

import { useMemo, useState } from 'react';
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
  { value: 'pending', label: 'En attente', icon: FiClock },
  { value: 'preparing', label: 'En préparation', icon: FiPackage },
  { value: 'shipped', label: 'Expédiée', icon: FiTruck },
  { value: 'delivered', label: 'Livrée', icon: FiCheckCircle },
];

const INITIAL_ORDERS = [
  {
    id: 'CMD-2024-001',
    customer: {
      firstName: 'Marie',
      lastName: 'Dubois',
      email: 'marie.dubois@email.com',
      phone: '06 12 34 56 78',
    },
    shippingAddress: {
      addressLine1: '12 rue de la Paix',
      addressLine2: '',
      postalCode: '75001',
      city: 'Paris',
      country: 'France',
    },
    date: '05/06/2024',
    placedAtLabel: 'Passée le 5 juin 2024',
    itemsCount: 2,
    subtotal: 179,
    shippingAmount: 5.9,
    total: 184.9,
    paymentMethod: 'Carte bancaire',
    status: 'pending',
    trackingNumber: '',
    trackingUrl: '',
    shippingMethod: 'Point relais',
    items: [
      {
        name: 'Pull tricoté main',
        quantity: 1,
        unitPrice: 89,
        lineTotal: 89,
        imageUrl:
          'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=300&q=80',
      },
      {
        name: 'Écharpe tricotée',
        quantity: 2,
        unitPrice: 45,
        lineTotal: 90,
        imageUrl:
          'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=300&q=80',
      },
    ],
  },
  {
    id: 'CMD-2024-002',
    customer: {
      firstName: 'Sophie',
      lastName: 'Martin',
      email: 'sophie.martin@email.com',
      phone: '06 98 76 54 32',
    },
    shippingAddress: {
      addressLine1: '4 avenue Victor Hugo',
      addressLine2: '',
      postalCode: '69002',
      city: 'Lyon',
      country: 'France',
    },
    date: '04/06/2024',
    placedAtLabel: 'Passée le 4 juin 2024',
    itemsCount: 1,
    subtotal: 41,
    shippingAmount: 5.9,
    total: 46.9,
    paymentMethod: 'PayPal',
    status: 'preparing',
    trackingNumber: '',
    trackingUrl: '',
    shippingMethod: 'Point relais',
    items: [
      {
        name: 'Bonnet crochet',
        quantity: 1,
        unitPrice: 41,
        lineTotal: 41,
        imageUrl:
          'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=300&q=80',
      },
    ],
  },
  {
    id: 'CMD-2024-003',
    customer: {
      firstName: 'Julie',
      lastName: 'Petit',
      email: 'julie.petit@email.com',
      phone: '06 55 44 33 22',
    },
    shippingAddress: {
      addressLine1: '27 rue des Tilleuls',
      addressLine2: '',
      postalCode: '33000',
      city: 'Bordeaux',
      country: 'France',
    },
    date: '03/06/2024',
    placedAtLabel: 'Passée le 3 juin 2024',
    itemsCount: 2,
    subtotal: 110.1,
    shippingAmount: 5.9,
    total: 116,
    paymentMethod: 'Virement bancaire',
    status: 'shipped',
    trackingNumber: 'FR123456789',
    trackingUrl: '',
    shippingMethod: 'Mondial Relay',
    items: [
      {
        name: 'Sac crocheté',
        quantity: 1,
        unitPrice: 68,
        lineTotal: 68,
        imageUrl:
          'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=300&q=80',
      },
      {
        name: 'Pochette artisanale',
        quantity: 1,
        unitPrice: 42.1,
        lineTotal: 42.1,
        imageUrl:
          'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=300&q=80',
      },
    ],
  },
  {
    id: 'CMD-2024-004',
    customer: {
      firstName: 'Claire',
      lastName: 'Rousseau',
      email: 'claire.rousseau@email.com',
      phone: '06 11 22 33 44',
    },
    shippingAddress: {
      addressLine1: '8 place du marché',
      addressLine2: '',
      postalCode: '44000',
      city: 'Nantes',
      country: 'France',
    },
    date: '01/06/2024',
    placedAtLabel: 'Passée le 1 juin 2024',
    itemsCount: 1,
    subtotal: 44,
    shippingAmount: 5.9,
    total: 49.9,
    paymentMethod: 'Carte bancaire',
    status: 'delivered',
    trackingNumber: '',
    trackingUrl: '',
    shippingMethod: 'Point relais',
    items: [
      {
        name: 'Doudou lapin',
        quantity: 1,
        unitPrice: 44,
        lineTotal: 44,
        imageUrl:
          'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=300&q=80',
      },
    ],
  },
];

function formatPrice(value) {
  return `${Number(value).toFixed(2)} €`;
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

export default function AdminOrdersPage() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const selectedOrder =
    orders.find((order) => order.id === selectedOrderId) || null;

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
      `Bonjour ${getCustomerFullName(order)},\n\nConcernant votre commande ${
        order.id
      },\n\nStatut actuel : ${getStatusLabel(order.status)}.\n${
        order.trackingNumber
          ? `Numéro de suivi : ${order.trackingNumber}\n`
          : ''
      }${
        order.trackingUrl ? `Lien de suivi : ${order.trackingUrl}\n` : ''
      }\nBelle journée,\nCrackers by VB`
    );

    window.location.href = `mailto:${order.customer.email}?subject=${subject}&body=${body}`;
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
                          <p>Date : {order.date}</p>
                          <p>
                            {order.itemsCount} article
                            {order.itemsCount > 1 ? 's' : ''}
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
                          <FiTruck aria-hidden="true" />
                          <span>Suivi : {order.trackingNumber}</span>
                        </span>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
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
                    <p className={styles.detailDate}>{selectedOrder.placedAtLabel}</p>
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
                      <strong>Téléphone :</strong> {selectedOrder.customer.phone}
                    </p>
                    <p>
                      <strong>Adresse :</strong> {getAddressLabel(selectedOrder)}
                    </p>
                  </div>
                </div>

                <div className={styles.detailSection}>
                  <h2 className={styles.sectionTitle}>Articles commandés</h2>

                  <div className={styles.itemsList}>
                    {selectedOrder.items.map((item) => (
                      <div
                        key={`${selectedOrder.id}-${item.name}`}
                        className={styles.itemCard}
                      >
                        <div className={styles.itemLeft}>
                          <div className={styles.itemImageWrapper}>
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className={styles.itemImage}
                            />
                          </div>

                          <div className={styles.itemContent}>
                            <p className={styles.itemName}>{item.name}</p>
                            <p className={styles.itemMeta}>Quantité : {item.quantity}</p>
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
                  <h2 className={styles.sectionTitle}>Modifier le statut</h2>

                  <div className={styles.statusTabs}>
                    {STATUS_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      const isActive = selectedOrder.status === option.value;

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