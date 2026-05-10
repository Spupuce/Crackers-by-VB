/* components/AuthCard.js */

import Link from 'next/link';
import { FiUser } from 'react-icons/fi';
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
  onSubmit,
}) {
  return (
    <div className={styles.card}>
      <div className={styles.iconWrapper}>
        <FiUser className={styles.icon} />
      </div>

      <h1 className={styles.title}>{title}</h1>
      <p className={styles.subtitle}>{subtitle}</p>

      <form className={styles.form} onSubmit={onSubmit}>
        {fields.map((field) => (
          <div className={styles.field} key={field.name}>
            <label htmlFor={field.name} className={styles.label}>
              {field.label}
            </label>

            <input
              id={field.name}
              name={field.name}
              type={field.type}
              placeholder={field.placeholder}
              className={styles.input}
            />
          </div>
        ))}

        <button type="submit" className={styles.submitButton}>
          {submitLabel}
        </button>
      </form>

      {secondaryText && secondaryLinkLabel && secondaryLinkHref && (
        <p className={styles.secondaryAction}>
          {secondaryText}{' '}
          <Link href={secondaryLinkHref} className={styles.secondaryLink}>
            {secondaryLinkLabel}
          </Link>
        </p>
      )}
    </div>
  );
}