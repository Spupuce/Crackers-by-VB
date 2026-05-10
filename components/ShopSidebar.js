/* components/ShopSidebar.js */

import { FiSliders } from 'react-icons/fi';
import styles from '../styles/Boutique.module.css';

export default function ShopSidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <FiSliders />
        <span>Filtres</span>
      </div>

      <div className={styles.filterBlock}>
        <h3 className={styles.filterTitle}>Catégorie</h3>

        <button className={`${styles.filterButton} ${styles.filterButtonActive}`}>
          Tous
        </button>
        <button className={styles.filterButton}>Couture</button>
        <button className={styles.filterButton}>Crochet</button>
        <button className={styles.filterButton}>Tricot</button>
        <button className={styles.filterButton}>Créations enfants</button>
      </div>

      <div className={styles.filterBlock}>
        <h3 className={styles.filterTitle}>Prix par tranche</h3>

        <button className={`${styles.filterButton} ${styles.filterButtonActive}`}>
          Tous
        </button>
        <button className={styles.filterButton}>Moins de 30€</button>
        <button className={styles.filterButton}>30€ - 50€</button>
        <button className={styles.filterButton}>50€ - 100€</button>
        <button className={styles.filterButton}>Plus de 100€</button>
      </div>

      <div className={styles.filterBlock}>
        <h3 className={styles.filterTitle}>Prix personnalisé</h3>

        <label className={styles.inputLabel}>Minimum (€)</label>
        <input type="number" defaultValue="0" className={styles.filterInput} />

        <label className={styles.inputLabel}>Maximum (€)</label>
        <input type="number" defaultValue="200" className={styles.filterInput} />
      </div>
    </aside>
  );
}