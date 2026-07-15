// components/CartContactForm.js

import internalStyles from '../styles/InternalPages.module.css';
import styles from '../styles/CartPage.module.css';

export default function CartContactForm({
  contact,
  fieldErrors,
  handleContactChange,
  handleContactBlur,
}) {
  return (
    <section className={internalStyles.card}>
      <h2 className={styles.sectionTitle}>Informations de contact</h2>

      <div className={styles.formStack}>
        <div className={styles.formBlock}>
          <div className={styles.gridTwo}>
            <div className={internalStyles.formGroup}>
              <label
                htmlFor="contact-firstName"
                className={internalStyles.label}
              >
                Prénom
              </label>
              <input
                id="contact-firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                className={`${internalStyles.input} ${
                  fieldErrors.firstName ? styles.inputError : ''
                }`}
                value={contact.firstName}
                onChange={handleContactChange}
                onBlur={handleContactBlur}
              />
              {fieldErrors.firstName && (
                <p className={styles.fieldError} role="alert">
                  {fieldErrors.firstName}
                </p>
              )}
            </div>

            <div className={internalStyles.formGroup}>
              <label
                htmlFor="contact-lastName"
                className={internalStyles.label}
              >
                Nom
              </label>
              <input
                id="contact-lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                className={`${internalStyles.input} ${
                  fieldErrors.lastName ? styles.inputError : ''
                }`}
                value={contact.lastName}
                onChange={handleContactChange}
                onBlur={handleContactBlur}
              />
              {fieldErrors.lastName && (
                <p className={styles.fieldError} role="alert">
                  {fieldErrors.lastName}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className={styles.formBlock}>
          <div className={internalStyles.formGroup}>
            <label
              htmlFor="contact-email"
              className={internalStyles.label}
            >
              Adresse email
            </label>
            <input
              id="contact-email"
              name="email"
              type="email"
              autoComplete="email"
              className={`${internalStyles.input} ${
                fieldErrors.email ? styles.inputError : ''
              }`}
              value={contact.email}
              onChange={handleContactChange}
              onBlur={handleContactBlur}
            />
            {fieldErrors.email && (
              <p className={styles.fieldError} role="alert">
                {fieldErrors.email}
              </p>
            )}
          </div>
        </div>

        <div className={styles.formBlock}>
          <div className={internalStyles.formGroup}>
            <label
              htmlFor="contact-phone"
              className={internalStyles.label}
            >
              Téléphone
            </label>
            <input
              id="contact-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              className={`${internalStyles.input} ${
                fieldErrors.phone ? styles.inputError : ''
              }`}
              value={contact.phone}
              onChange={handleContactChange}
              onBlur={handleContactBlur}
            />
            {fieldErrors.phone && (
              <p className={styles.fieldError} role="alert">
                {fieldErrors.phone}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}