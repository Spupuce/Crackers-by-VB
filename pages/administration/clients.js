// pages/administration/clients.js

import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import {
  FiArrowLeft,
  FiEye,
  FiMail,
  FiPhone,
  FiUser,
  FiMapPin,
  FiUserX,
} from "react-icons/fi";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { useAuth } from "../../context/AuthContext";
import styles from "../../styles/AdminClients.module.css";

const DEFAULT_ORDER_IMAGE =
  "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=300&q=80";

const DELETED_ACCOUNT_CLIENT_ID = "__anonymized_deleted_accounts__";

function formatPrice(value) {
  return `${Number(value || 0).toFixed(2)} €`;
}

function getClientFullName(client) {
  return `${client.firstName} ${client.lastName}`.trim();
}

function getStatusLabel(status) {
  if (status === "pending") return "En attente";
  if (status === "preparing") return "En préparation";
  if (status === "shipped") return "Expédiée";
  if (status === "delivered") return "Livrée";
  if (status === "cancelled") return "Annulée";
  return status || "Inconnu";
}

function getStatusClass(status) {
  if (status === "pending") return styles.statusPending;
  if (status === "preparing") return styles.statusPreparing;
  if (status === "shipped") return styles.statusShipped;
  if (status === "delivered") return styles.statusDelivered;
  if (status === "cancelled") return styles.statusCancelled || "";
  return "";
}

function formatPlacedAtLabel(date) {
  if (!date) {
    return "Commande enregistrée";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Commande enregistrée";
  }

  return `Passée le ${parsed.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })}`;
}

function buildFallbackOrderDetails(order) {
  const subtotal = Number(order?.total || 0);
  const itemCount = Math.max(1, Number(order?.itemsCount) || 1);
  const unitPrice = itemCount > 0 ? subtotal / itemCount : subtotal;
  const shippingAmount = 0;

  return {
    id: order.id,
    placedAtLabel: formatPlacedAtLabel(order.date),
    status: order.status,
    items: Array.from({ length: itemCount }, (_, index) => ({
      name: itemCount > 1 ? `Article ${index + 1}` : "Article commandé",
      quantity: 1,
      unitPrice,
      lineTotal: unitPrice,
      imageUrl: DEFAULT_ORDER_IMAGE,
    })),
    subtotal,
    shippingAmount,
    total: subtotal + shippingAmount,
    paymentMethod: order.paymentMethod || "Mode de paiement à confirmer",
    shippingMethod: order.shippingMethod || "Livraison",
  };
}

function normalizeAdminOrderForClient(order) {
  const createdAt = order.createdAt || order.date || order.placedAt || null;
  const items = Array.isArray(order.items)
    ? order.items.map((item) => ({
        name: item.name || item.productName || "Article",
        quantity: Number(item.quantity || 0) || 1,
        unitPrice: Number(item.unitPrice || item.price || 0),
        lineTotal:
          Number(item.unitPrice || item.price || 0) *
            (Number(item.quantity || 0) || 1) || 0,
        imageUrl: item.imageUrl || item.image || DEFAULT_ORDER_IMAGE,
      }))
    : [];

  const itemsCount =
    items.length > 0
      ? items.reduce((sum, item) => sum + (item.quantity || 0), 0)
      : Number(order.itemsCount || 0) || 1;

  const subtotal = Number(order.subtotalAmount || order.subtotal || 0);
  const shippingAmount = Number(order.shippingAmount || 0);
  const total = Number(
    order.totalAmount || order.total || subtotal + shippingAmount,
  );

  const paymentMethod =
    order.paymentMethodLabel || order.paymentMethod || "Carte bancaire";

  const shippingMethodLabel =
    order.shippingMethod ||
    order.shipping?.method ||
    (order.shipping?.carrier ? "Livraison" : "Livraison");

  const rawId = order._id?.toString?.() || order._id || "";
  const id = order.orderNumber || rawId;

  return {
    id,
    rawId,
    selectionId: rawId || id,
    date: createdAt ? new Date(createdAt).toLocaleDateString("fr-FR") : "",
    status: order.status || "pending",
    itemsCount,
    total,
    paymentMethod,
    placedAtLabel: formatPlacedAtLabel(createdAt),
    items,
    subtotal,
    shippingAmount,
    shippingMethod: shippingMethodLabel,
  };
}

function buildClientsFromOrders(apiOrders) {
  const clientsMap = new Map();
  const anonymizedOrders = [];

  apiOrders.forEach((apiOrder) => {
    const isAnonymized = Boolean(
      apiOrder.isUserDeleted || apiOrder.anonymizedAt,
    );

    if (isAnonymized) {
      anonymizedOrders.push(normalizeAdminOrderForClient(apiOrder));
      return;
    }

    const customer = apiOrder.customer || {};
    const email = (customer.email || "").trim().toLowerCase();

    if (!email) {
      return;
    }

    const firstName = customer.firstName || "";
    const lastName = customer.lastName || "";
    const phone = customer.phone || "";
    const shippingAddress = apiOrder.shippingAddress || {};
    const addressParts = [
      shippingAddress.addressLine1 || "",
      shippingAddress.addressLine2 || "",
      `${shippingAddress.postalCode || ""} ${
        shippingAddress.city || ""
      }`.trim(),
      shippingAddress.country || "",
    ].filter(Boolean);
    const address = addressParts.join(", ");

    const orderForClient = normalizeAdminOrderForClient(apiOrder);
    const existing = clientsMap.get(email);

    if (existing) {
      existing.orders.push(orderForClient);
      existing.ordersCount += 1;
      existing.totalSpent += orderForClient.total;
    } else {
      const initials = `${(firstName || "C")[0] || "C"}${
        (lastName || "L")[0] || ""
      }`.toUpperCase();

      clientsMap.set(email, {
        id: email,
        initials,
        firstName,
        lastName,
        email,
        phone,
        address,
        ordersCount: 1,
        totalSpent: orderForClient.total,
        orders: [orderForClient],
      });
    }
  });

  const clients = Array.from(clientsMap.values()).sort((a, b) =>
    getClientFullName(a).localeCompare(getClientFullName(b), "fr"),
  );

  return { clients, anonymizedOrders };
}

function OrderHistoryList({ orders, onSelectOrder }) {
  return (
    <div className={styles.clientOrdersList}>
      {orders.map((order) => (
        <article key={order.selectionId} className={styles.clientOrderRow}>
          <div className={styles.clientOrderMain}>
            <p className={styles.clientOrderId}>{order.id}</p>
            <p className={styles.clientOrderMeta}>Date : {order.date || "—"}</p>
            <p className={styles.clientOrderMeta}>
              {order.itemsCount} {order.itemsCount > 1 ? "articles" : "article"}
            </p>
          </div>

          <div className={styles.clientOrderRight}>
            <div className={styles.clientOrderPriceBlock}>
              <p className={styles.clientOrderTotal}>
                {formatPrice(order.total)}
              </p>
              <p className={styles.clientOrderPayment}>{order.paymentMethod}</p>
            </div>

            <span
              className={`${styles.statusBadge} ${getStatusClass(
                order.status,
              )}`}
            >
              {getStatusLabel(order.status)}
            </span>

            <button
              type="button"
              className={styles.viewOrderButton}
              onClick={() => onSelectOrder(order.selectionId)}
              aria-label={`Voir la commande ${order.id}`}
            >
              <FiEye aria-hidden="true" />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function AdminClientsPage() {
  const router = useRouter();
  const { isAuthenticated, isAdmin, isAuthReady } = useAuth();

  const [clients, setClients] = useState([]);
  const [anonymizedOrders, setAnonymizedOrders] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [clientsError, setClientsError] = useState("");

  const anonymizedTotal = useMemo(() => {
    return anonymizedOrders.reduce((sum, order) => sum + order.total, 0);
  }, [anonymizedOrders]);

  const deletedAccountsVirtualClient = useMemo(() => {
    if (anonymizedOrders.length === 0) {
      return null;
    }

    return {
      id: DELETED_ACCOUNT_CLIENT_ID,
      initials: "CS",
      firstName: "Comptes",
      lastName: "supprimés",
      email: "Anonymisé",
      phone: "—",
      address: "Commandes d'utilisateurs supprimés conservées",
      ordersCount: anonymizedOrders.length,
      totalSpent: anonymizedTotal,
      orders: anonymizedOrders,
      isDeletedAccountGroup: true,
    };
  }, [anonymizedOrders, anonymizedTotal]);

  const selectedClient = useMemo(() => {
    if (selectedClientId === DELETED_ACCOUNT_CLIENT_ID) {
      return deletedAccountsVirtualClient;
    }
    return clients.find((client) => client.id === selectedClientId) || null;
  }, [clients, selectedClientId, deletedAccountsVirtualClient]);

  const selectedOrderSummary = useMemo(() => {
    if (!selectedOrderId || !selectedClient) {
      return null;
    }

    return (
      selectedClient.orders.find(
        (order) => order.selectionId === selectedOrderId,
      ) || null
    );
  }, [selectedClient, selectedOrderId]);

  const selectedOrderDetails = useMemo(() => {
    if (!selectedOrderSummary) {
      return null;
    }

    if (
      Array.isArray(selectedOrderSummary.items) &&
      selectedOrderSummary.items.length > 0
    ) {
      return {
        id: selectedOrderSummary.id,
        placedAtLabel: selectedOrderSummary.placedAtLabel,
        status: selectedOrderSummary.status,
        items: selectedOrderSummary.items,
        subtotal: selectedOrderSummary.subtotal,
        shippingAmount: selectedOrderSummary.shippingAmount,
        total: selectedOrderSummary.total,
        paymentMethod: selectedOrderSummary.paymentMethod,
        shippingMethod: selectedOrderSummary.shippingMethod,
      };
    }

    return buildFallbackOrderDetails(selectedOrderSummary);
  }, [selectedOrderSummary]);

  const totalClients = clients.length;
  const totalOrders =
    clients.reduce((sum, client) => sum + (client.ordersCount || 0), 0) +
    anonymizedOrders.length;

  const totalRevenue =
    clients.reduce((sum, client) => sum + (client.totalSpent || 0), 0) +
    anonymizedTotal;

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [selectedClientId, selectedOrderId]);

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/connexion?redirect=/administration/clients");
      return;
    }

    if (!isAdmin) {
      router.replace("/");
    }
  }, [isAuthReady, isAuthenticated, isAdmin, router]);

  useEffect(() => {
    async function loadClientsFromOrders() {
      if (!isAuthReady || !isAuthenticated || !isAdmin) {
        return;
      }

      setIsLoadingClients(true);
      setClientsError("");

      try {
        const response = await fetch("/api/admin/orders");
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            data?.message || "Impossible de récupérer les commandes clients.",
          );
        }

        const apiOrders = Array.isArray(data?.orders) ? data.orders : [];
        const nextData = buildClientsFromOrders(apiOrders);

        setClients(nextData.clients);
        setAnonymizedOrders(nextData.anonymizedOrders);
      } catch (error) {
        setClients([]);
        setAnonymizedOrders([]);
        setClientsError(
          error?.message || "Impossible de charger les fiches clients.",
        );
      } finally {
        setIsLoadingClients(false);
      }
    }

    loadClientsFromOrders();
  }, [isAuthReady, isAuthenticated, isAdmin]);

  if (!isAuthReady || !isAuthenticated || !isAdmin) {
    return (
      <>
        <Head>
          <title>Fiches clients - Administration | Crackers by VB</title>
        </Head>

        <Header />

        <main className={styles.page}>
          <div className={styles.loadingContainer}>
            <div className={styles.loadingBox}>
              {!isAuthReady
                ? "Vérification de la session..."
                : "Redirection en cours..."}
            </div>
          </div>
        </main>

        <Footer />
      </>
    );
  }

  if (selectedOrderDetails && selectedOrderSummary && selectedClient) {
    return (
      <>
        <Head>
          <title>
            {selectedOrderSummary.id} - {getClientFullName(selectedClient)} |
            Administration
          </title>
        </Head>

        <Header />

        <main className={styles.page}>
          <div className={styles.container}>
            <button
              type="button"
              className={styles.backLink}
              onClick={() => setSelectedOrderId("")}
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
                  {selectedClient.isDeletedAccountGroup ? (
                    <p className={styles.orderDetailSubtitle}>
                      Compte supprimé — commande conservée sous forme
                      anonymisée.
                    </p>
                  ) : null}
                </div>

                <span
                  className={`${styles.statusBadge} ${getStatusClass(
                    selectedOrderSummary.status,
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
                setSelectedClientId("");
                setSelectedOrderId("");
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
                        {selectedClient.isDeletedAccountGroup ? (
                          <FiUserX aria-hidden="true" />
                        ) : (
                          <FiMail aria-hidden="true" />
                        )}{" "}
                        <span>{selectedClient.email}</span>
                      </p>
                      <p>
                        <FiPhone aria-hidden="true" />{" "}
                        <span>{selectedClient.phone || "—"}</span>
                      </p>
                      <p>
                        <FiMapPin aria-hidden="true" />{" "}
                        <span>
                          {selectedClient.address || "Adresse inconnue"}
                        </span>
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
                <h2 className={styles.sectionTitle}>
                  Historique des commandes
                </h2>

                <OrderHistoryList
                  orders={selectedClient.orders}
                  onSelectOrder={setSelectedOrderId}
                />
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
                  <p className={styles.kpiValue}>
                    {isLoadingClients ? "..." : totalClients}
                  </p>
                  <p className={styles.kpiLabel}>
                    Clients identifiés dans les commandes, hors comptes
                    supprimés.
                  </p>
                </div>
              </article>

              <article className={styles.kpiCard}>
                <div className={styles.kpiIcon}>
                  <FiEye aria-hidden="true" />
                </div>
                <div className={styles.kpiContent}>
                  <p className={styles.kpiLabel}>Total commandes</p>
                  <p className={styles.kpiValue}>
                    {isLoadingClients ? "..." : totalOrders}
                  </p>
                </div>
              </article>

              <article className={styles.kpiCard}>
                <div className={styles.kpiIcon}>
                  <FiMail aria-hidden="true" />
                </div>
                <div className={styles.kpiContent}>
                  <p className={styles.kpiLabel}>Chiffre d&apos;affaires</p>
                  <p className={styles.kpiValue}>
                    {isLoadingClients ? "..." : formatPrice(totalRevenue)}
                  </p>
                </div>
              </article>
            </section>

            <section className={styles.clientsListSection}>
              {clientsError ? (
                <div className={styles.loadingContainer}>
                  <div className={styles.loadingBox}>{clientsError}</div>
                </div>
              ) : null}

              {isLoadingClients && !clientsError ? (
                <div className={styles.loadingContainer}>
                  <div className={styles.loadingBox}>
                    Chargement des fiches clients...
                  </div>
                </div>
              ) : null}

              {!isLoadingClients && !clientsError ? (
                <div className={styles.clientsList}>
                  {clients.length === 0 && !deletedAccountsVirtualClient ? (
                    <div className={styles.loadingContainer}>
                      <div className={styles.loadingBox}>
                        Aucun client identifié pour le moment.
                      </div>
                    </div>
                  ) : (
                    <>
                      {clients.map((client) => (
                        <article
                          key={client.id}
                          className={styles.clientCard}
                          onClick={() => {
                            setSelectedOrderId("");
                            setSelectedClientId(client.id);
                          }}
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
                                <span>{client.phone || "—"}</span>
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

                      {deletedAccountsVirtualClient ? (
                        <article
                          className={styles.clientCard}
                          onClick={() => {
                            setSelectedOrderId("");
                            setSelectedClientId(
                              deletedAccountsVirtualClient.id,
                            );
                          }}
                        >
                          <div className={styles.clientCardMain}>
                            <div className={styles.avatar}>
                              <span>
                                {deletedAccountsVirtualClient.initials}
                              </span>
                            </div>

                            <div className={styles.clientInfo}>
                              <p className={styles.clientName}>
                                {getClientFullName(
                                  deletedAccountsVirtualClient,
                                )}
                              </p>
                              <p className={styles.clientContact}>
                                <FiUserX aria-hidden="true" />
                                <span>
                                  {deletedAccountsVirtualClient.email}
                                </span>
                              </p>
                              <p className={styles.clientContact}>
                                <FiPhone aria-hidden="true" />
                                <span>
                                  {deletedAccountsVirtualClient.phone}
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className={styles.clientStats}>
                            <p className={styles.clientStat}>
                              <span>Commandes</span>
                              <span>
                                {deletedAccountsVirtualClient.ordersCount}
                              </span>
                            </p>
                            <p className={styles.clientStat}>
                              <span>Total dépensé</span>
                              <span className={styles.clientTotalSpent}>
                                {formatPrice(
                                  deletedAccountsVirtualClient.totalSpent,
                                )}
                              </span>
                            </p>
                          </div>
                        </article>
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}
            </section>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}