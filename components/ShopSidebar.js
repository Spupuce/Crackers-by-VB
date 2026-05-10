// components/ShopSidebar.js

import { FiSliders } from 'react-icons/fi';
import styles from '../styles/Boutique.module.css';

const CATEGORY_LABELS = [
  'Tous',
  'Couture',
  'Crochet',
  'Tricot',
  'Créations enfants',
];

const PRICE_RANGE_ITEMS = [
  { key: 'all', label: 'Tous' },
  { key: 'lt30', label: 'Moins de 30€' },
  { key: '30-50', label: '30€ - 50€' },
  { key: '50-100', label: '50€ - 100€' },
  { key: 'gt100', label: 'Plus de 100€' },
];

export default function ShopSidebar({
  category,
  onCategoryChange,
  priceRangeKey,
  onPriceRangeKeyChange,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  onApplyFilters,
  onResetFilters,
}) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <FiSliders className={styles.filterIcon} />
        <span>Filtres</span>
      </div>

      <div className={styles.filterBlock}>
        <h3 className={styles.filterTitle}>Catégorie</h3>

        {CATEGORY_LABELS.map((label) => (
          <button
            key={label}
            type="button"
            className={`${styles.filterButton} ${
              category === label ? styles.filterButtonActive : ''
            }`}
            onClick={() => onCategoryChange(label)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={styles.filterBlock}>
        <h3 className={styles.filterTitle}>Prix par tranche</h3>

        {PRICE_RANGE_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`${styles.filterButton} ${
              priceRangeKey === item.key ? styles.filterButtonActive : ''
            }`}
            onClick={() => onPriceRangeKeyChange(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className={styles.filterBlock}>
        <h3 className={styles.filterTitle}>Prix personnalisé</h3>

        <label className={styles.inputLabel} htmlFor="min-price-input">
          Minimum (€)
        </label>
        <input
          id="min-price-input"
          type="number"
          value={minPrice}
          onChange={(e) => onMinPriceChange(e.target.value)}
          className={styles.filterInput}
          min="0"
        />

        <label className={styles.inputLabel} htmlFor="max-price-input">
          Maximum (€)
        </label>
        <input
          id="max-price-input"
          type="number"
          value={maxPrice}
          onChange={(e) => onMaxPriceChange(e.target.value)}
          className={styles.filterInput}
          min="0"
        />
      </div>

      <div className={styles.filterActions}>
        <button
          type="button"
          className={styles.applyButton}
          onClick={onApplyFilters}
        >
          Appliquer mes filtres
        </button>
        <button
          type="button"
          className={styles.resetButton}
          onClick={onResetFilters}
        >
          Réinitialiser
        </button>
      </div>
    </aside>
  );
}