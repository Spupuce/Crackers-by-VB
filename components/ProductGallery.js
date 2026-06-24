// components/ProductGallery.js
import styles from '../styles/ProductDetail.module.css';

export default function ProductGallery({
  items = [],
  productName,
  activeImage = '',
  onSelect,
  showSoldOutBadge = false,
  soldOutBadgeText = '',
}) {
  const fallbackImage = activeImage || items[0]?.imageUrl || '';

  if (!fallbackImage) {
    return (
      <div className={styles.gallery}>
        <div className={styles.mainImageWrapper}>
          <div className={styles.emptyGallery}>Aucune image disponible</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.gallery}>
      <div className={styles.mainImageWrapper}>
        {showSoldOutBadge && soldOutBadgeText && (
          <div className={styles.mainImageBadge}>
            {soldOutBadgeText}
          </div>
        )}

        <img
          src={fallbackImage}
          alt={productName}
          className={styles.mainImage}
        />
      </div>

      <div className={styles.thumbnailRow}>
        {items.map((item, index) => {
          const isActive = activeImage === item.imageUrl;

          return (
            <button
              key={`${item.type}-${item.imageUrl}-${index}`}
              type="button"
              className={`${styles.thumbnailButton} ${
                isActive ? styles.thumbnailButtonActive : ''
              }`}
              onClick={() => onSelect?.(item)}
              aria-label={`Voir ${item.label.toLowerCase()} de ${productName}`}
            >
              <img
                src={item.imageUrl}
                alt={`${productName} miniature ${index + 1}`}
                className={styles.thumbnailImage}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}