// pages/mon-compte.js

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
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

export default function MonComptePage() {
  const router = useRouter();
  const { user, isAuthenticated, isAuthReady, logout, updateUser } = useAuth();

  const [formValues, setFormValues] = useState(buildInitialForm(user));
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (isAuthReady && !isAuthenticated) {
      router.replace('/connexion');
    }
  }, [isAuthReady, isAuthenticated, router]);

  useEffect(() => {
    setFormValues(buildInitialForm(user));
  }, [user]);

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

  const handleLogout = () => {
    logout();
    router.push('/');
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
            >
              Déconnexion
            </button>
          </div>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
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
              <p className={styles.cardEyebrow}>Modifiez votre mot de passe</p>
              <button type="button" className={styles.primaryButton} disabled>
                Modifier le mot de passe
              </button>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.ordersEmpty}>
              <p className={styles.emptyTitle}>Aucune commande pour le moment</p>
              <p className={styles.emptyText}>
                Vos futures commandes apparaîtront ici.
              </p>
            </div>
          </section>

          <section className={styles.dangerZone}>
            <h2 className={styles.dangerTitle}>Zone dangereuse</h2>
            <p className={styles.dangerText}>
              La suppression de votre compte est irréversible. Toutes vos données
              seront définitivement perdues.
            </p>
            <button type="button" className={styles.dangerButton} disabled>
              Supprimer mon compte
            </button>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}