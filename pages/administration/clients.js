// pages/administration/clients.js

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  FiArrowLeft,
  FiEye,
  FiMail,
  FiPhone,
  FiUser,
  FiMapPin,
} from 'react-icons/fi';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/AdminClients.module.css';

const MOCK_CLIENTS = [
  {
    id: 'client-1',
    initials: 'MD',
    firstName: 'Marie',
    lastName: 'Dubois',
    email: 'marie.dubois@email.com',
    phone: '06 12 34 56 78',
    address: '12 rue de la Paix, 75001 Paris',
    ordersCount: 3,
    totalSpent: 327.8,
    orders: [
      {
        id: 'CMD-2024-001',
        date: '05/06/2024',
        status: 'pending',
        itemsCount: 2,
        total: 184.9,
        paymentMethod: 'Carte bancaire',
      },
      {
        id: 'CMD-2024-008',
        date: '12/03/2024',
        status: 'delivered',
        itemsCount: 1,
        total: 46.9,
        paymentMethod: 'PayPal',
      },
      {
        id: 'CMD-2024-015',
        date: '20/02/2024',
        status: 'delivered',
        itemsCount: 1,
        total: 96,
        paymentMethod: 'Carte bancaire',
      },
    ],
  },
  {
    id: 'client-2',
    initials: 'SM',
    firstName: 'Sophie',
    lastName: 'Martin',
    email: 'sophie.martin@email.com',
    phone: '06 23 45 67 89',
    address: '4 avenue Victor Hugo, 69002 Lyon',
    ordersCount: 2,
    totalSpent: 138.8,
    orders: [
      {
        id: 'CMD-2024-004',
        date: '04/06/2024',
        status: 'preparing',
        itemsCount: 1,
        total: 46.9,
        paymentMethod: 'Carte bancaire',
      },
      {
        id: 'CMD-2024-010',
        date: '15/03/2024',
        status: 'delivered',
        itemsCount: 1,
        total: 91.9,
        paymentMethod: 'Virement bancaire',
      },
    ],
  },
  {
    id: 'client-3',
    initials: 'JP',
    firstName: 'Julie',
    lastName: 'Petit',
    email: 'julie.petit@email.com',
    phone: '06 34 56 78 90',
    address: '27 rue des Tilleuls, 33000 Bordeaux',
    ordersCount: 1,
    totalSpent: 116,
    orders: [
      {
        id: 'CMD-2024-003',
        date: '03/06/2024',
        status: 'shipped',
        itemsCount: 2,
        total: 116,
        paymentMethod: 'Virement bancaire',
      },
    ],
  },
  {
    id: 'client-4',
    initials: 'CR',
    firstName: 'Claire',
    lastName: 'Rousseau',
    email: 'claire.rousseau@email.com',
    phone: '06 45 67 89 01',
    address: '8 place du marché, 44000 Nantes',
    ordersCount: 4,
    totalSpent: 215.6,
    orders: [
      {
        id: 'CMD-2024-006',
        date: '10/05/2024',
        status: 'delivered',
        itemsCount: 2,
        total: 68.9,
        paymentMethod: 'Carte bancaire',
      },
      {
        id: 'CMD-2024-007',
        date: '30/04/2024',
        status: 'delivered',
        itemsCount: 1,
        total: 42.1,
        paymentMethod: 'PayPal',
      },
      {
        id: 'CMD-2024-009',
        date: '18/03/2024',
        status: 'delivered',
        itemsCount: 1,
        total: 52.9,
        paymentMethod: 'Carte bancaire',
      },
      {
        id: 'CMD-2024-012',
        date: '05/02/2024',
        status: 'delivered',
        itemsCount: 1,
        total: 51.7,
        paymentMethod: 'Carte bancaire',
      },
    ],
  },
  {
    id: 'client-5',
    initials: 'LB',
    firstName: 'Laura',
    lastName: 'Bernard',
    email: 'laura.bernard@email.com',
    phone: '06 56 78 90 12',
    address: '10 rue des Lilas, 31000 Toulouse',
    ordersCount: 1,
    totalSpent: 89,
    orders: [
      {
        id: 'CMD-2024-011',
        date: '22/04/2024',
        status: 'delivered',
        itemsCount: 1,
        total: 89,
        paymentMethod: 'Carte bancaire',
      },
    ],
  },
];

const MOCK_ORDER_DETAILS = {
  'CMD-2024-001': {
    id: 'CMD-2024-001',
    placedAtLabel: 'Passée le 5 juin 2024',
    status: 'pending',
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
    subtotal: 179,
    shippingAmount: 5.9,
    total: 184.9,
    paymentMethod: 'Carte bancaire',
    shippingMethod: 'Point relais',
  },
};

const DEFAULT_ORDER_IMAGE =
  'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=300&q=80';

function formatPrice(value) {
  return `${Number(value).toFixed(2)} €`;
}

function getClientFullName(client) {
  return `${client.firstName} ${client.lastName}`.trim();
}

function getStatusLabel(status) {
  if (status === 'pending') return 'En attente';
  if (status === 'preparing') return 'En préparation';
  if (status === 'shipped') return 'Expédiée';
  if (status === 'delivered') return 'Livrée';
  return status;
}

function getStatusClass(status) {
  if (status === 'pending') return styles.statusPending;
  if (status === 'preparing') return styles.statusPreparing;
  if (status === 'shipped') return styles.statusShipped;
  if (status === 'delivered') return styles.statusDelivered;
  return '';
}

function formatPlacedAtLabel(date) {
  if (!date || typeof date !== 'string') {
    return 'Commande enregistrée';
  }

  const [day, month, year] = date.split('/');
  const monthNames = [
    'janvier',
    'février',
    'mars',
    'avril',
    'mai',
    'juin',
    'juillet',
    'août',
    'septembre',
    'octobre',
    'novembre',
    'décembre',
  ];

  const monthIndex = Number(month) - 1;
  const safeMonth = monthNames[monthIndex] || month;
  return `Passée le ${Number(day)} ${safeMonth} ${year}`;
}

function buildFallbackOrderDetails(order) {
  const shippingAmount = 0;
  const subtotal = Number(order?.total) || 0;
  const itemCount = Math.max(1, Number(order?.itemsCount) || 1);
  const unitPrice = itemCount > 0 ? subtotal / itemCount : subtotal;

  return {
    id: order.id,
    placedAtLabel: formatPlacedAtLabel(order.date),
    status: order.status,
    items: Array.from({ length: itemCount }, (_, index) => ({
      name: itemCount > 1 ? `Article ${index + 1}` : 'Article commandé',
      quantity: 1,
      unitPrice,
      lineTotal: unitPrice,
      imageUrl: DEFAULT_ORDER_IMAGE,
    })),
    subtotal,
    shippingAmount,
    total: subtotal + shippingAmount,
    paymentMethod: order.paymentMethod || 'Mode de paiement à confirmer',
    shippingMethod: 'Livraison standard',
  };
}

export default function AdminClientsPage() {
  const router = useRouter();
  const { isAuthenticated, isAdmin, isAuthReady } = useAuth();

  const [clients] = useState(MOCK_CLIENTS);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');

  const selectedClient =
    clients.find((client) => client.id === selectedClientId) || null;

  const selectedOrderSummary = useMemo(() => {
    if (!selectedClient || !selectedOrderId) return null;
    return (
      selectedClient.orders.find((order) => order.id === selectedOrderId) || null
    );
  }, [selectedClient, selectedOrderId]);

  const selectedOrderDetails = useMemo(() => {
    if (!selectedOrderSummary) {
      return null;
    }

    if (MOCK_ORDER_DETAILS[selectedOrderSummary.id]) {
      return MOCK_ORDER_DETAILS[selectedOrderSummary.id];
    }

    return buildFallbackOrderDetails(selectedOrderSummary);
  }, [selectedOrderSummary]);

  const totalClients = clients.length;
  const totalOrders = clients.reduce(
    (sum, client) => sum + (client.ordersCount || 0),
    0
  );
  const totalRevenue = clients.reduce(
    (sum, client) => sum + (client.totalSpent || 0),
    0
  );

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    if (!isAuthenticated) {
      router.replace('/connexion?redirect=/administration/clients');
      return;
    }

    if (!isAdmin) {
      router.replace('/');
    }
  }, [isAuthReady, isAuthenticated, isAdmin, router]);

  if (!isAuthReady) {
    return (
      <>
        <Head>
          <title>Fiches clients - Administration | Crackers by VB</title>
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
          <title>Fiches clients - Administration | Crackers by VB</title>
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

  if (selectedOrderDetails && selectedClient && selectedOrderSummary) {
    return (
      <>
        <Head>
          <title>
            {selectedOrderSummary.id} - {getClientFullName(selectedClient)} | Administration
          </title>
        </Head>

        <Header />

        <main className={styles.page}>
          <div className={styles.container}>
            <button
              type="button"
              className={styles.backLink}
              onClick={() => setSelectedOrderId('')}
            >
              <FiArrowLeft aria-hidden="true" />
              <span>
                Retour aux commandes de {getClientFullName(selectedClient)}
              </span>
            </button>

            <section className={styles.orderDetail}>
              <header className={styles.orderDetailHeader}>
                <div>
                  <h1 className={styles.orderDetailTitle}>
                    Commande {selectedOrderDetails.id}
                  </h1>
                  <p className={styles.orderDetailSubtitle}>
                    {selectedOrderDetails.placedAtLabel}
                  </p>
                </div>

                <span
                  className={`${styles.statusBadge} ${getStatusClass(
                    selectedOrderSummary.status
                  )}`}
                >
                  {getStatusLabel(selectedOrderSummary.status)}
                </span>
              </header>

              <div className={styles.orderDetailSection}>
                <h2 className={styles.sectionTitle}>Articles commandés</h2>

                <div className={styles.orderItemsList}>
                  {selectedOrderDetails.items.map((item, index) => (
                    <div
                      key={`${selectedOrderDetails.id}-${item.name}-${index}`}
                      className={styles.orderItemRow}
                    >
                      <div className={styles.orderItemLeft}>
                        <div className={styles.orderItemImageWrapper}>
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className={styles.orderItemImage}
                          />
                        </div>

                        <div className={styles.orderItemContent}>
                          <p className={styles.orderItemName}>{item.name}</p>
                          <p className={styles.orderItemMeta}>
                            Quantité : {item.quantity}
                          </p>
                          <p className={styles.orderItemUnitPrice}>
                            {formatPrice(item.unitPrice)} / unité
                          </p>
                        </div>
                      </div>

                      <p className={styles.orderItemTotal}>
                        {formatPrice(item.lineTotal)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.orderDetailSection}>
                <h2 className={styles.sectionTitle}>Détails de paiement</h2>

                <div className={styles.paymentCard}>
                  <div className={styles.paymentRow}>
                    <span>Sous-total</span>
                    <span>{formatPrice(selectedOrderDetails.subtotal)}</span>
                  </div>
                  <div className={styles.paymentRow}>
                    <span>
                      Frais de port ({selectedOrderDetails.shippingMethod})
                    </span>
                    <span>
                      {formatPrice(selectedOrderDetails.shippingAmount)}
                    </span>
                  </div>
                  <div className={styles.paymentRow}>
                    <span>Mode de paiement</span>
                    <span>{selectedOrderDetails.paymentMethod}</span>
                  </div>
                  <div
                    className={`${styles.paymentRow} ${styles.paymentTotalRow}`}
                  >
                    <strong>Total</strong>
                    <strong className={styles.paymentTotalValue}>
                      {formatPrice(selectedOrderDetails.total)}
                    </strong>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>

        <Footer />
      </>
    );
  }

  if (selectedClient) {
    return (
      <>
        <Head>
          <title>
            {getClientFullName(selectedClient)} - Fiche client | Administration
          </title>
        </Head>

        <Header />

        <main className={styles.page}>
          <div className={styles.container}>
            <button
              type="button"
              className={styles.backLink}
              onClick={() => {
                setSelectedClientId('');
                setSelectedOrderId('');
              }}
            >
              <FiArrowLeft aria-hidden="true" />
              <span>Retour aux clients</span>
            </button>

            <section className={styles.clientDetail}>
              <header className={styles.clientDetailHeader}>
                <div className={styles.clientDetailMain}>
                  <div className={styles.avatar}>
                    <span>{selectedClient.initials}</span>
                  </div>

                  <div className={styles.clientDetailInfo}>
                    <h1 className={styles.clientDetailName}>
                      {getClientFullName(selectedClient)}
                    </h1>

                    <div className={styles.clientDetailMeta}>
                      <p>
                        <FiMail aria-hidden="true" />{' '}
                        <span>{selectedClient.email}</span>
                      </p>
                      <p>
                        <FiPhone aria-hidden="true" />{' '}
                        <span>{selectedClient.phone}</span>
                      </p>
                      <p>
                        <FiMapPin aria-hidden="true" />{' '}
                        <span>{selectedClient.address}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className={styles.clientDetailStats}>
                  <div className={styles.clientDetailStat}>
                    <span className={styles.clientDetailStatLabel}>
                      Total dépensé
                    </span>
                    <span className={styles.clientDetailStatValue}>
                      {formatPrice(selectedClient.totalSpent)}
                    </span>
                  </div>
                  <div className={styles.clientDetailStat}>
                    <span className={styles.clientDetailStatLabel}>
                      Commandes
                    </span>
                    <span className={styles.clientDetailStatValue}>
                      {selectedClient.ordersCount}
                    </span>
                  </div>
                </div>
              </header>

              <section className={styles.clientHistorySection}>
                <h2 className={styles.sectionTitle}>Historique des commandes</h2>

                <div className={styles.clientOrdersList}>
                  {selectedClient.orders.map((order) => (
                    <article
                      key={order.id}
                      className={styles.clientOrderRow}
                    >
                      <div className={styles.clientOrderMain}>
                        <p className={styles.clientOrderId}>{order.id}</p>
                        <p className={styles.clientOrderMeta}>
                          Date : {order.date}
                        </p>
                        <p className={styles.clientOrderMeta}>
                          {order.itemsCount}{' '}
                          {order.itemsCount > 1 ? 'articles' : 'article'}
                        </p>
                      </div>

                      <div className={styles.clientOrderRight}>
                        <div className={styles.clientOrderPriceBlock}>
                          <p className={styles.clientOrderTotal}>
                            {formatPrice(order.total)}
                          </p>
                          <p className={styles.clientOrderPayment}>
                            {order.paymentMethod}
                          </p>
                        </div>

                        <span
                          className={`${styles.statusBadge} ${getStatusClass(
                            order.status
                          )}`}
                        >
                          {getStatusLabel(order.status)}
                        </span>

                        <button
                          type="button"
                          className={styles.viewOrderButton}
                          onClick={() => setSelectedOrderId(order.id)}
                          aria-label={`Voir la commande ${order.id}`}
                        >
                          <FiEye aria-hidden="true" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </section>
          </div>
        </main>

        <Footer />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Fiches clients - Administration | Crackers by VB</title>
      </Head>

      <Header />

      <main className={styles.page}>
        <div className={styles.container}>
          <section className={styles.clientsPage}>
            <header className={styles.clientsHeader}>
              <h1 className={styles.pageTitle}>Fiches clients</h1>
              <p className={styles.pageSubtitle}>
                Visualisez et gérez les informations de vos clients
              </p>
            </header>

            <section className={styles.kpiRow}>
              <article className={styles.kpiCard}>
                <div className={styles.kpiIcon}>
                  <FiUser aria-hidden="true" />
                </div>
                <div className={styles.kpiContent}>
                  <p className={styles.kpiLabel}>Total clients</p>
                  <p className={styles.kpiValue}>{totalClients}</p>
                </div>
              </article>

              <article className={styles.kpiCard}>
                <div className={styles.kpiIcon}>
                  <FiEye aria-hidden="true" />
                </div>
                <div className={styles.kpiContent}>
                  <p className={styles.kpiLabel}>Total commandes</p>
                  <p className={styles.kpiValue}>{totalOrders}</p>
                </div>
              </article>

              <article className={styles.kpiCard}>
                <div className={styles.kpiIcon}>
                  <FiMail aria-hidden="true" />
                </div>
                <div className={styles.kpiContent}>
                  <p className={styles.kpiLabel}>Chiffre d&apos;affaires</p>
                  <p className={styles.kpiValue}>{formatPrice(totalRevenue)}</p>
                </div>
              </article>
            </section>

            <section className={styles.clientsListSection}>
              <div className={styles.clientsList}>
                {clients.map((client) => (
                  <article
                    key={client.id}
                    className={styles.clientCard}
                    onClick={() => setSelectedClientId(client.id)}
                  >
                    <div className={styles.clientCardMain}>
                      <div className={styles.avatar}>
                        <span>{client.initials}</span>
                      </div>

                      <div className={styles.clientInfo}>
                        <p className={styles.clientName}>
                          {getClientFullName(client)}
                        </p>
                        <p className={styles.clientContact}>
                          <FiMail aria-hidden="true" />
                          <span>{client.email}</span>
                        </p>
                        <p className={styles.clientContact}>
                          <FiPhone aria-hidden="true" />
                          <span>{client.phone}</span>
                        </p>
                      </div>
                    </div>

                    <div className={styles.clientStats}>
                      <p className={styles.clientStat}>
                        <span>Commandes</span>
                        <span>{client.ordersCount}</span>
                      </p>
                      <p className={styles.clientStat}>
                        <span>Total dépensé</span>
                        <span className={styles.clientTotalSpent}>
                          {formatPrice(client.totalSpent)}
                        </span>
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}