// components/CartShippingForm.js

import internalStyles from '../styles/InternalPages.module.css';
import styles from '../styles/CartPage.module.css';

export default function CartShippingForm({
  shipping,
  fieldErrors,
  handleShippingChange,
  handleShippingBlur,
}) {
  return (
    <section className={internalStyles.card}>
      <h2 className={styles.sectionTitle}>Adresse de livraison</h2>

      <div className={styles.formStack}>
        <div className={styles.formBlock}>
          <div className={internalStyles.formGroup}>
            <label
              htmlFor="shipping-address"
              className={internalStyles.label}
            >
              Adresse
            </label>
            <input
              id="shipping-address"
              name="address"
              type="text"
              autoComplete="street-address"
              className={`${internalStyles.input} ${
                fieldErrors.address ? styles.inputError : ''
              }`}
              value={shipping.address}
              onChange={handleShippingChange}
              onBlur={handleShippingBlur}
            />
            {fieldErrors.address && (
              <p className={styles.fieldError} role="alert">
                {fieldErrors.address}
              </p>
            )}
          </div>
        </div>

        <div className={styles.formBlock}>
          <div className={styles.gridTwo}>
            <div className={internalStyles.formGroup}>
              <label
                htmlFor="shipping-zip"
                className={internalStyles.label}
              >
                Code postal
              </label>
              <input
                id="shipping-zip"
                name="zip"
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                className={`${internalStyles.input} ${
                  fieldErrors.zip ? styles.inputError : ''
                }`}
                value={shipping.zip}
                onChange={handleShippingChange}
                onBlur={handleShippingBlur}
              />
              {fieldErrors.zip && (
                <p className={styles.fieldError} role="alert">
                  {fieldErrors.zip}
                </p>
              )}
            </div>

            <div className={internalStyles.formGroup}>
              <label
                htmlFor="shipping-city"
                className={internalStyles.label}
              >
                Ville
              </label>
              <input
                id="shipping-city"
                name="city"
                type="text"
                autoComplete="address-level2"
                className={`${internalStyles.input} ${
                  fieldErrors.city ? styles.inputError : ''
                }`}
                value={shipping.city}
                onChange={handleShippingChange}
                onBlur={handleShippingBlur}
              />
              {fieldErrors.city && (
                <p className={styles.fieldError} role="alert">
                  {fieldErrors.city}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className={styles.formBlock}>
          <div className={internalStyles.formGroup}>
            <label
              htmlFor="shipping-country"
              className={internalStyles.label}
            >
              Pays
            </label>
            <input
              id="shipping-country"
              name="country"
              type="text"
              autoComplete="country-name"
              className={`${internalStyles.input} ${
                fieldErrors.country ? styles.inputError : ''
              }`}
              value={shipping.country}
              onChange={handleShippingChange}
              onBlur={handleShippingBlur}
            />
            {fieldErrors.country && (
              <p className={styles.fieldError} role="alert">
                {fieldErrors.country}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}