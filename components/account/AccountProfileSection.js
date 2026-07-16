// components/account/AccountProfileSection.js

import { FiUser } from 'react-icons/fi';

export default function AccountProfileSection({
  user,
  fullName,
  isEditing,
  isSaving,
  formValues,
  errorMessage,
  successMessage,
  handleEditToggle,
  handleCancel,
  handleChange,
  handleSubmit,
  styles,
}) {
  return (
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
  );
}