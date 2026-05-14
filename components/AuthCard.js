// components/AuthCard.js

import { useState } from 'react';
import Link from 'next/link';
import { FiUser, FiEye, FiEyeOff } from 'react-icons/fi';
import styles from '../styles/Auth.module.css';

export default function AuthCard({
  title,
  subtitle,
  fields,
  submitLabel,
  secondaryText,
  secondaryLinkLabel,
  secondaryLinkHref,
  note,
  errorMessage,
  successMessage,
  initialValues,
  onSubmit,
  isSubmitting = false,
}) {
  const defaultValues = fields.reduce((accumulator, field) => {
    accumulator[field.name] = initialValues?.[field.name] ?? '';
    return accumulator;
  }, {});

  const [formValues, setFormValues] = useState(defaultValues);
  const [visiblePasswords, setVisiblePasswords] = useState({});

  function handleChange(event) {
    const { name, value } = event.target;

    setFormValues((previousValues) => ({
      ...previousValues,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) return;

    if (onSubmit) {
      onSubmit(formValues, event);
    }
  }

  function togglePasswordVisibility(fieldName) {
    if (isSubmitting) return;

    setVisiblePasswords((previousValues) => ({
      ...previousValues,
      [fieldName]: !previousValues[fieldName],
    }));
  }

  return (
    <div className={styles.card}>
      <div className={styles.iconWrapper}>
        <FiUser className={styles.icon} />
      </div>

      <h1 className={styles.title}>{title}</h1>
      <p className={styles.subtitle}>{subtitle}</p>

      <form className={styles.form} onSubmit={handleSubmit}>
        {fields.map((field) => {
          const isPasswordField = field.type === 'password';
          const isVisible = Boolean(visiblePasswords[field.name]);

          return (
            <div className={styles.field} key={field.name}>
              <label htmlFor={field.name} className={styles.label}>
                {field.label}
              </label>

              <div className={styles.inputWrapper}>
                <input
                  id={field.name}
                  name={field.name}
                  type={isPasswordField && isVisible ? 'text' : field.type}
                  placeholder={field.placeholder}
                  className={styles.input}
                  value={formValues[field.name] ?? ''}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />

                {isPasswordField ? (
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => togglePasswordVisibility(field.name)}
                    aria-label={
                      isVisible
                        ? 'Masquer le mot de passe'
                        : 'Afficher le mot de passe'
                    }
                    disabled={isSubmitting}
                  >
                    {isVisible ? (
                      <FiEyeOff className={styles.passwordToggleIcon} />
                    ) : (
                      <FiEye className={styles.passwordToggleIcon} />
                    )}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}

        {errorMessage ? (
          <p className={styles.errorMessage}>{errorMessage}</p>
        ) : null}

        {successMessage ? (
          <p className={styles.successMessage}>{successMessage}</p>
        ) : null}

        <button
          type="submit"
          className={styles.submitButton}
          disabled={isSubmitting}
        >
          {submitLabel}
        </button>
      </form>

      {secondaryText && secondaryLinkLabel && secondaryLinkHref && (
        <p className={styles.secondaryAction}>
          {secondaryText}{' '}
          <Link href={secondaryLinkHref} legacyBehavior>
            <a className={styles.secondaryLink}>{secondaryLinkLabel}</a>
          </Link>
        </p>
      )}

      {note ? <p className={styles.note}>{note}</p> : null}
    </div>
  );
}