// pages/mon-compte.js

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { FiLock, FiPackage, FiUser, FiX } from 'react-icons/fi';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/AccountPage.module.css';

function buildInitialForm(user) {
  return {
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    addressLine1: user?.addressLine1 || '',
    addressLine2: user?.addressLine2 || '',
    postalCode: user?.postalCode || '',
    city: user?.city || '',
  };
}

function buildInitialPasswordForm() {
  return {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };
}

const mockOrders = [
  {
    id: 'CMD-2026-001',
    createdAt: '2026-05-28',
    status: 'Livrée',
    total: 42.5,
    itemCount: 3,
    items: [
      {
        id: '1',
        name: 'Cracker fleuri rose poudré',
        quantity: 1,
        price: 14.5,
        image: '/images/placeholder-product.jpg',
      },
      {
        id: '2',
        name: 'Décoration crochet eucalyptus',
        quantity: 2,
        price: 14.0,
        image: '/images/placeholder-product.jpg',
      },
    ],
  },
  {
    id: 'CMD-2026-002',
    createdAt: '2026-04-16',
    status: 'En préparation',
    total: 27.0,
    itemCount: 1,
    items: [
      {
        id: '3',
        name: 'Suspension tricot naturel',
        quantity: 1,
        price: 27.0,
        image: '/images/placeholder-product.jpg',
      },
    ],
  },
  {
    id: 'CMD-2026-003',
    createdAt: '2026-03-02',
    status: 'Payée',
    total: 18.9,
    itemCount: 1,
    items: [
      {
        id: '4',
        name: 'Petit accessoire crochet lavande',
        quantity: 1,
        price: 18.9,
        image: '/images/placeholder-product.jpg',
      },
    ],
  },
];

function formatOrderDate(value) {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function getStatusClassName(status, stylesObject) {
  switch (status) {
    case 'Livrée':
      return stylesObject.orderStatusDelivered;
    case 'En préparation':
      return stylesObject.orderStatusPreparing;
    case 'Payée':
      return stylesObject.orderStatusPaid;
    default:
      return '';
  }
}

export default function MonComptePage() {
  const router = useRouter();
  const { user, isAuthenticated, isAuthReady, logout, updateUser } = useAuth();

  const [formValues, setFormValues] = useState(buildInitialForm(user));
  const [passwordValues, setPasswordValues] = useState(buildInitialPasswordForm());

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);

  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isDeleteSectionOpen, setIsDeleteSectionOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteErrorMessage, setDeleteErrorMessage] = useState('');
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('');
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState('');

  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    if (isAuthReady && !isAuthenticated) {
      router.replace('/connexion');
    }
  }, [isAuthReady, isAuthenticated, router]);

  useEffect(() => {
    setFormValues(buildInitialForm(user));
  }, [user]);

  useEffect(() => {
    if (!selectedOrder) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedOrder(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedOrder]);

  const fullName = useMemo(() => {
    const parts = [user?.firstName || '', user?.lastName || ''].filter(Boolean);
    return parts.length ? parts.join(' ') : 'Non renseigné';
  }, [user]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setErrorMessage('');

    setFormValues((previousValues) => ({
      ...previousValues,
      [name]: value,
    }));
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;

    setPasswordErrorMessage('');
    setPasswordSuccessMessage('');

    setPasswordValues((previousValues) => ({
      ...previousValues,
      [name]: value,
    }));
  };

  const resetPasswordBlock = () => {
    setPasswordValues(buildInitialPasswordForm());
    setPasswordErrorMessage('');
    setPasswordSuccessMessage('');
  };

  const handlePasswordToggle = () => {
    if (isChangingPassword) {
      return;
    }

    if (isPasswordOpen) {
      resetPasswordBlock();
      setIsPasswordOpen(false);
      return;
    }

    setPasswordErrorMessage('');
    setPasswordSuccessMessage('');
    setIsPasswordOpen(true);
  };

  const handleEditToggle = () => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormValues(buildInitialForm(user));
    setErrorMessage('');
    setSuccessMessage('');
    setIsEditing(false);
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
    } finally {
      logout();
      router.push('/');
      setIsLoggingOut(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!user?.id || isSaving) return;

    setErrorMessage('');
    setSuccessMessage('');

    const trimmedFirstName = formValues.firstName.trim();
    const trimmedLastName = formValues.lastName.trim();
    const trimmedEmail = formValues.email.trim();
    const trimmedPhone = formValues.phone.trim();
    const trimmedPostalCode = formValues.postalCode.trim();

    const phoneRegex = /^(?:(?:\+33|0)[1-9](?:[ .-]?\d{2}){4})$/;
    const postalCodeRegex = /^\d{5}$/;

    if (!trimmedFirstName || !trimmedLastName || !trimmedEmail) {
      setErrorMessage('Le prénom, le nom et l’email sont obligatoires.');
      return;
    }

    if (trimmedFirstName.length < 2) {
      setErrorMessage('Le prénom doit contenir au moins 2 caractères.');
      return;
    }

    if (trimmedLastName.length < 2) {
      setErrorMessage('Le nom doit contenir au moins 2 caractères.');
      return;
    }

    if (trimmedPhone && !phoneRegex.test(trimmedPhone)) {
      setErrorMessage(
        'Le numéro de téléphone doit être un numéro français valide.'
      );
      return;
    }

    if (trimmedPostalCode && !postalCodeRegex.test(trimmedPostalCode)) {
      setErrorMessage('Le code postal doit contenir 5 chiffres.');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: user.id,
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
          email: trimmedEmail,
          phone: trimmedPhone,
          addressLine1: formValues.addressLine1,
          addressLine2: formValues.addressLine2,
          postalCode: trimmedPostalCode,
          city: formValues.city,
          country: 'France',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(
          data.message || 'Une erreur est survenue lors de la mise à jour.'
        );
        return;
      }

      updateUser(data.user);
      setFormValues(buildInitialForm(data.user));
      setSuccessMessage('Vos informations ont bien été mises à jour.');
      setIsEditing(false);
    } catch (error) {
      setErrorMessage('Une erreur est survenue lors de la mise à jour.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    if (isChangingPassword) return;

    setPasswordErrorMessage('');
    setPasswordSuccessMessage('');

    const currentPassword = passwordValues.currentPassword;
    const newPassword = passwordValues.newPassword;
    const confirmPassword = passwordValues.confirmPassword;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordErrorMessage('Tous les champs mot de passe sont obligatoires.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordErrorMessage(
        'Le nouveau mot de passe doit contenir au moins 8 caractères.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMessage(
        'La confirmation du nouveau mot de passe ne correspond pas.'
      );
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordErrorMessage(
        'Le nouveau mot de passe doit être différent de l’ancien.'
      );
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPasswordErrorMessage(
          data.message ||
            'Une erreur est survenue lors du changement de mot de passe.'
        );
        return;
      }

      setPasswordValues(buildInitialPasswordForm());
      setPasswordSuccessMessage('Votre mot de passe a bien été mis à jour.');
      setIsPasswordOpen(false);
    } catch (error) {
      setPasswordErrorMessage(
        'Une erreur est survenue lors du changement de mot de passe.'
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteSectionToggle = () => {
    if (isDeletingAccount) return;

    if (isDeleteSectionOpen) {
      setDeletePassword('');
      setDeleteErrorMessage('');
      setDeleteSuccessMessage('');
      setIsDeleteSectionOpen(false);
      return;
    }

    setDeleteErrorMessage('');
    setDeleteSuccessMessage('');
    setDeletePassword('');
    setIsDeleteSectionOpen(true);
  };

  const handleDeleteSubmit = async (event) => {
    event.preventDefault();

    if (isDeletingAccount) return;

    setDeleteErrorMessage('');
    setDeleteSuccessMessage('');

    const trimmedPassword = deletePassword.trim();

    if (!trimmedPassword) {
      setDeleteErrorMessage('Le mot de passe actuel est obligatoire.');
      return;
    }

    setIsDeletingAccount(true);

    try {
      const response = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: trimmedPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setDeleteErrorMessage(
          data.message ||
            'Une erreur est survenue lors de la suppression du compte.'
        );
        return;
      }

      setDeleteSuccessMessage('Votre compte a bien été supprimé.');
      setTimeout(() => {
        logout();
        router.push('/');
      }, 800);
    } catch (error) {
      setDeleteErrorMessage(
        'Une erreur est survenue lors de la suppression du compte.'
      );
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleReorder = (order) => {
    if (!order) return;

    console.log('Commander à nouveau :', order.id);
  };

  const handleDownloadInvoice = (order) => {
    if (!order) return;

    console.log('Télécharger la facture :', order.id);
  };

  if (!isAuthReady || !isAuthenticated) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Mon compte - Crackers by VB</title>
      </Head>

      <Header />

      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.topBar}>
            <div>
              <h1 className={styles.pageTitle}>Mon compte</h1>
            </div>

            <button
              type="button"
              className={styles.logoutButton}
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? 'Déconnexion...' : 'Déconnexion'}
            </button>
          </div>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeading}>
                <span className={styles.iconBadge} aria-hidden="true">
                  <FiUser />
                </span>
                <p className={styles.cardEyebrow}>Gérez vos informations</p>
              </div>

              {!isEditing ? (
                <button
                  type="button"
                  className={styles.editButton}
                  onClick={handleEditToggle}
                >
                  Modifier
                </button>
              ) : null}
            </div>

            {!isEditing && successMessage ? (
              <p className={styles.successMessage}>{successMessage}</p>
            ) : null}

            {!isEditing && errorMessage ? (
              <p className={styles.errorMessage}>{errorMessage}</p>
            ) : null}

            {!isEditing ? (
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Nom</span>
                  <span className={styles.infoValue}>{fullName}</span>
                </div>

                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Email</span>
                  <span className={styles.infoValue}>
                    {user?.email || 'Non renseigné'}
                  </span>
                </div>

                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Téléphone</span>
                  <span className={styles.infoValue}>
                    {user?.phone || 'Non renseigné'}
                  </span>
                </div>

                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Adresse</span>
                  <span className={styles.infoValue}>
                    {user?.addressLine1 || 'Non renseigné'}
                  </span>
                </div>

                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Complément d’adresse</span>
                  <span className={styles.infoValue}>
                    {user?.addressLine2 || 'Non renseigné'}
                  </span>
                </div>

                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Code postal</span>
                  <span className={styles.infoValue}>
                    {user?.postalCode || 'Non renseigné'}
                  </span>
                </div>

                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Ville</span>
                  <span className={styles.infoValue}>
                    {user?.city || 'Non renseigné'}
                  </span>
                </div>

                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Pays</span>
                  <span className={styles.infoValue}>France</span>
                </div>
              </div>
            ) : (
              <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label htmlFor="firstName" className={styles.label}>
                      Prénom
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      className={styles.input}
                      value={formValues.firstName}
                      onChange={handleChange}
                      disabled={isSaving}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="lastName" className={styles.label}>
                      Nom
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      className={styles.input}
                      value={formValues.lastName}
                      onChange={handleChange}
                      disabled={isSaving}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="email" className={styles.label}>
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      className={styles.input}
                      value={formValues.email}
                      onChange={handleChange}
                      disabled={isSaving}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="phone" className={styles.label}>
                      Téléphone
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      className={styles.input}
                      value={formValues.phone}
                      onChange={handleChange}
                      disabled={isSaving}
                      placeholder="Votre numéro de téléphone"
                    />
                  </div>

                  <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                    <label htmlFor="addressLine1" className={styles.label}>
                      Adresse
                    </label>
                    <input
                      id="addressLine1"
                      name="addressLine1"
                      className={styles.input}
                      value={formValues.addressLine1}
                      onChange={handleChange}
                      disabled={isSaving}
                      placeholder="Ex. 12 rue des Lilas"
                    />
                  </div>

                  <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                    <label htmlFor="addressLine2" className={styles.label}>
                      Complément d’adresse
                    </label>
                    <input
                      id="addressLine2"
                      name="addressLine2"
                      className={styles.input}
                      value={formValues.addressLine2}
                      onChange={handleChange}
                      disabled={isSaving}
                      placeholder="Appartement, bâtiment, étage..."
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="postalCode" className={styles.label}>
                      Code postal
                    </label>
                    <input
                      id="postalCode"
                      name="postalCode"
                      className={styles.input}
                      value={formValues.postalCode}
                      onChange={handleChange}
                      disabled={isSaving}
                      placeholder="Votre code postal"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="city" className={styles.label}>
                      Ville
                    </label>
                    <input
                      id="city"
                      name="city"
                      className={styles.input}
                      value={formValues.city}
                      onChange={handleChange}
                      disabled={isSaving}
                      placeholder="Votre ville"
                    />
                  </div>
                </div>

                {errorMessage ? (
                  <p className={styles.errorMessage}>{errorMessage}</p>
                ) : null}

                {successMessage ? (
                  <p className={styles.successMessage}>{successMessage}</p>
                ) : null}

                <div className={styles.formActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={handleCancel}
                    disabled={isSaving}
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            )}
          </section>

          <section className={styles.card}>
            <div className={styles.passwordBlock}>
              <div className={styles.passwordHeader}>
                <div className={styles.cardHeading}>
                  <span className={styles.iconBadge} aria-hidden="true">
                    <FiLock />
                  </span>
                  <p className={styles.cardEyebrow}>Modifiez votre mot de passe</p>
                </div>
              </div>

              {!isPasswordOpen ? (
                <>
                  {passwordSuccessMessage ? (
                    <p className={styles.successMessage}>{passwordSuccessMessage}</p>
                  ) : null}

                  <button
                    id="password-panel-trigger"
                    type="button"
                    className={styles.passwordToggleButton}
                    onClick={handlePasswordToggle}
                    aria-expanded={false}
                    aria-controls="password-panel"
                  >
                    Modifier le mot de passe
                  </button>
                </>
              ) : (
                <div
                  id="password-panel"
                  className={styles.passwordPanel}
                  role="region"
                  aria-labelledby="password-panel-trigger"
                >
                  <form className={styles.form} onSubmit={handlePasswordSubmit}>
                    <div className={styles.formGrid}>
                      <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                        <label htmlFor="currentPassword" className={styles.label}>
                          Mot de passe actuel
                        </label>
                        <input
                          id="currentPassword"
                          name="currentPassword"
                          type="password"
                          className={styles.input}
                          value={passwordValues.currentPassword}
                          onChange={handlePasswordChange}
                          disabled={isChangingPassword}
                          autoComplete="current-password"
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label htmlFor="newPassword" className={styles.label}>
                          Nouveau mot de passe
                        </label>
                        <input
                          id="newPassword"
                          name="newPassword"
                          type="password"
                          className={styles.input}
                          value={passwordValues.newPassword}
                          onChange={handlePasswordChange}
                          disabled={isChangingPassword}
                          autoComplete="new-password"
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label htmlFor="confirmPassword" className={styles.label}>
                          Confirmer le mot de passe
                        </label>
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type="password"
                          className={styles.input}
                          value={passwordValues.confirmPassword}
                          onChange={handlePasswordChange}
                          disabled={isChangingPassword}
                          autoComplete="new-password"
                        />
                      </div>
                    </div>

                    {passwordErrorMessage ? (
                      <p className={styles.errorMessage}>{passwordErrorMessage}</p>
                    ) : null}

                    {passwordSuccessMessage ? (
                      <p className={styles.successMessage}>
                        {passwordSuccessMessage}
                      </p>
                    ) : null}

                    <div className={styles.formActions}>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={handlePasswordToggle}
                        disabled={isChangingPassword}
                      >
                        Annuler
                      </button>

                      <button
                        type="submit"
                        className={styles.primaryButton}
                        disabled={isChangingPassword}
                      >
                        {isChangingPassword
                          ? 'Mise à jour...'
                          : 'Enregistrer le nouveau mot de passe'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeading}>
                <span className={styles.iconBadge} aria-hidden="true">
                  <FiPackage />
                </span>
                <p className={styles.cardEyebrow}>Historique de commandes</p>
              </div>
            </div>

            {mockOrders.length === 0 ? (
              <div className={styles.ordersEmpty}>
                <p className={styles.emptyTitle}>Aucune commande pour le moment</p>
                <p className={styles.emptyText}>
                  Vos futures commandes apparaîtront ici.
                </p>
              </div>
            ) : (
              <div className={styles.ordersList}>
                {mockOrders.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    className={styles.orderCardButton}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className={styles.orderTopRow}>
                      <div className={styles.orderIdentity}>
                        <p className={styles.orderNumber}>{order.id}</p>
                        <p className={styles.orderDate}>
                          Commande du {formatOrderDate(order.createdAt)}
                        </p>
                      </div>

                      <span
                        className={`${styles.orderStatus} ${getStatusClassName(
                          order.status,
                          styles
                        )}`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <div className={styles.orderSummaryRow}>
                      <span className={styles.orderSummaryText}>
                        {order.itemCount} article{order.itemCount > 1 ? 's' : ''}
                      </span>
                      <span className={styles.orderTotalValue}>
                        {order.total.toFixed(2)} €
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className={styles.dangerZone}>
            <h2 className={styles.dangerTitle}>Zone dangereuse</h2>
            <p className={styles.dangerText}>
              La suppression de votre compte est irréversible. Toutes vos données
              seront définitivement perdues.
            </p>

            {!isDeleteSectionOpen ? (
              <>
                {deleteErrorMessage ? (
                  <p className={styles.errorMessage}>{deleteErrorMessage}</p>
                ) : null}
                {deleteSuccessMessage ? (
                  <p className={styles.successMessage}>
                    {deleteSuccessMessage}
                  </p>
                ) : null}

                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={handleDeleteSectionToggle}
                  disabled={isDeletingAccount}
                >
                  Supprimer mon compte
                </button>
              </>
            ) : (
              <form
                className={styles.deleteForm}
                onSubmit={handleDeleteSubmit}
              >
                <div className={styles.formGroup}>
                  <label
                    htmlFor="deletePassword"
                    className={styles.label}
                  >
                    Mot de passe actuel
                  </label>
                  <input
                    id="deletePassword"
                    name="deletePassword"
                    type="password"
                    className={styles.input}
                    value={deletePassword}
                    onChange={(event) =>
                      setDeletePassword(event.target.value)
                    }
                    disabled={isDeletingAccount}
                    autoComplete="current-password"
                  />
                </div>

                {deleteErrorMessage ? (
                  <p className={styles.errorMessage}>{deleteErrorMessage}</p>
                ) : null}

                <div className={styles.formActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={handleDeleteSectionToggle}
                    disabled={isDeletingAccount}
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    className={styles.dangerButton}
                    disabled={isDeletingAccount}
                  >
                    {isDeletingAccount
                      ? 'Suppression...'
                      : 'Confirmer la suppression'}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>

        {selectedOrder ? (
          <div
            className={styles.orderModalOverlay}
            role="presentation"
            onClick={() => setSelectedOrder(null)}
          >
            <div
              className={styles.orderModal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="order-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className={styles.orderModalHeader}>
                <div>
                  <h2 id="order-modal-title" className={styles.orderModalTitle}>
                    {selectedOrder.id}
                  </h2>
                  <p className={styles.orderModalSubtitle}>
                    Commande du {formatOrderDate(selectedOrder.createdAt)}
                  </p>
                </div>

                <button
                  type="button"
                  className={styles.orderModalClose}
                  onClick={() => setSelectedOrder(null)}
                  aria-label="Fermer le détail de la commande"
                >
                  <FiX />
                </button>
              </div>

              <div className={styles.orderModalStatusRow}>
                <span
                  className={`${styles.orderStatus} ${getStatusClassName(
                    selectedOrder.status,
                    styles
                  )}`}
                >
                  {selectedOrder.status}
                </span>
                <span className={styles.orderSummaryText}>
                  {selectedOrder.itemCount} article
                  {selectedOrder.itemCount > 1 ? 's' : ''}
                </span>
              </div>

              <div className={styles.orderModalItems}>
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className={styles.orderModalItem}>
                    <div className={styles.orderModalImageWrapper}>
                      <img
                        src={item.image}
                        alt={item.name}
                        className={styles.orderModalImage}
                      />
                    </div>

                    <div className={styles.orderModalItemContent}>
                      <p className={styles.orderModalItemName}>{item.name}</p>
                      <p className={styles.orderModalItemMeta}>
                        Quantité : {item.quantity}
                      </p>
                    </div>

                    <p className={styles.orderModalItemPrice}>
                      {(item.price * item.quantity).toFixed(2)} €
                    </p>
                  </div>
                ))}
              </div>

              <div className={styles.orderModalFooter}>
                <div className={styles.orderModalFooterSummary}>
                  <span className={styles.orderTotalLabel}>Total</span>
                  <span className={styles.orderModalTotal}>
                    {selectedOrder.total.toFixed(2)} €
                  </span>
                </div>

                <div className={styles.orderModalFooterActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => handleDownloadInvoice(selectedOrder)}
                  >
                    Télécharger la facture
                  </button>

                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => handleReorder(selectedOrder)}
                  >
                    Commander à nouveau
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      <Footer />
    </>
  );
}