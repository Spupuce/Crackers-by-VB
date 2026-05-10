/* components/PageContainer.js */

import styles from '../styles/InternalPages.module.css';

export default function PageContainer({ title, subtitle, children, narrow = false }) {
  return (
    <main className={styles.page}>
      <div className={`${styles.container} ${narrow ? styles.containerNarrow : ''}`}>
        {(title || subtitle) && (
          <div className={styles.pageIntro}>
            {title && <h1 className={styles.pageTitle}>{title}</h1>}
            {subtitle && <p className={styles.pageSubtitle}>{subtitle}</p>}
          </div>
        )}

        {children}
      </div>
    </main>
  );
}