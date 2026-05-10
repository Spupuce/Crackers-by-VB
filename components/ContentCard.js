/* components/ContentCard.js */

import styles from '../styles/InternalPages.module.css';

export default function ContentCard({ children, className = '' }) {
  return (
    <section className={`${styles.card} ${className}`}>
      {children}
    </section>
  );
}