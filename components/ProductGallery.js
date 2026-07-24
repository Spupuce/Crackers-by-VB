// components/ProductGallery.js
import styles from "../styles/ProductDetail.module.css";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getSafeGalleryItem(item) {
  if (!item || typeof item !== "object") {
    return {
      type: "",
      imageUrl: "",
      label: "",
      colorName: "",
      publicId: "",
      offsetX: 0,
      offsetY: 0,
      zoom: 1,
    };
  }

  return {
    type: typeof item.type === "string" ? item.type : "",
    imageUrl: typeof item.imageUrl === "string" ? item.imageUrl : "",
    label: typeof item.label === "string" ? item.label : "",
    colorName: typeof item.colorName === "string" ? item.colorName : "",
    publicId: typeof item.publicId === "string" ? item.publicId : "",
    offsetX: Number.isFinite(Number(item.offsetX)) ? Number(item.offsetX) : 0,
    offsetY: Number.isFinite(Number(item.offsetY)) ? Number(item.offsetY) : 0,
    zoom: Number.isFinite(Number(item.zoom))
      ? clamp(Number(item.zoom), MIN_ZOOM, MAX_ZOOM)
      : 1,
  };
}

function getPreviewStyle(item) {
  const safeItem = getSafeGalleryItem(item);

  return {
    transform: `translate(${safeItem.offsetX}px, ${safeItem.offsetY}px) scale(${safeItem.zoom})`,
    transformOrigin: "center center",
  };
}

export default function ProductGallery({
  items = [],
  productName,
  activeImage = "",
  onSelect,
  showSoldOutBadge = false,
  soldOutBadgeText = "",
}) {
  const normalizedItems = Array.isArray(items)
    ? items.map(getSafeGalleryItem).filter((item) => item.imageUrl)
    : [];

  const activeItem =
    normalizedItems.find((item) => item.imageUrl === activeImage) ||
    normalizedItems[0] ||
    null;

  if (!activeItem?.imageUrl) {
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
          <div className={styles.mainImageBadge}>{soldOutBadgeText}</div>
        )}

        <div className={styles.mainImageViewport}>
          <img
            src={activeItem.imageUrl}
            alt={productName}
            className={styles.mainImageTransformed}
            style={getPreviewStyle(activeItem)}
            draggable={false}
          />
        </div>
      </div>

      <div className={styles.thumbnailRow}>
        {normalizedItems.map((item, index) => {
          const isActive = activeItem.imageUrl === item.imageUrl;

          return (
            <button
              key={`${item.type}-${item.imageUrl}-${index}`}
              type="button"
              className={`${styles.thumbnailButton} ${
                isActive ? styles.thumbnailButtonActive : ""
              }`}
              onClick={() => onSelect?.(item)}
              aria-label={`Voir ${
                item.label ? item.label.toLowerCase() : `l'image ${index + 1}`
              } de ${productName}`}
            >
              <img
                src={item.imageUrl}
                alt={`${productName} miniature ${index + 1}`}
                className={styles.thumbnailImage}
                draggable={false}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}