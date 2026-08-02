// components/ProductGallery.js
import styles from "../styles/ProductDetail.module.css";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const MIN_OFFSET = -100;
const MAX_OFFSET = 100;

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
      offsetXPct: 0,
      offsetYPct: 0,
      zoom: 1,
    };
  }

  const rawOffsetX = Number(item.offsetX);
  const rawOffsetY = Number(item.offsetY);
  const rawOffsetXPct = Number(item.offsetXPct);
  const rawOffsetYPct = Number(item.offsetYPct);

  const resolvedOffsetXPct = Number.isFinite(rawOffsetXPct)
    ? clamp(rawOffsetXPct, -50, 50)
    : Number.isFinite(rawOffsetX)
    ? clamp(rawOffsetX, -50, 50)
    : 0;

  const resolvedOffsetYPct = Number.isFinite(rawOffsetYPct)
    ? clamp(rawOffsetYPct, -50, 50)
    : Number.isFinite(rawOffsetY)
    ? clamp(rawOffsetY, -50, 50)
    : 0;

  return {
    type: typeof item.type === "string" ? item.type : "",
    imageUrl: typeof item.imageUrl === "string" ? item.imageUrl : "",
    label: typeof item.label === "string" ? item.label : "",
    colorName: typeof item.colorName === "string" ? item.colorName : "",
    publicId: typeof item.publicId === "string" ? item.publicId : "",
    offsetX: Number.isFinite(rawOffsetX)
      ? clamp(rawOffsetX, MIN_OFFSET, MAX_OFFSET)
      : 0,
    offsetY: Number.isFinite(rawOffsetY)
      ? clamp(rawOffsetY, MIN_OFFSET, MAX_OFFSET)
      : 0,
    offsetXPct: resolvedOffsetXPct,
    offsetYPct: resolvedOffsetYPct,
    zoom: Number.isFinite(Number(item.zoom))
      ? clamp(Number(item.zoom), MIN_ZOOM, MAX_ZOOM)
      : 1,
  };
}

function getNormalizedOffset(offsetPct, zoom) {
  if (zoom <= 1) {
    return 0;
  }

  const zoomOverflowRatio = (zoom - 1) / (MAX_ZOOM - 1);
  const dynamicLimit = clamp(zoomOverflowRatio * 50, 0, 50);

  return clamp(offsetPct, -dynamicLimit, dynamicLimit);
}

function getPreviewStyle(item) {
  const safeItem = getSafeGalleryItem(item);
  const translateXPercent = getNormalizedOffset(
    safeItem.offsetXPct,
    safeItem.zoom
  );
  const translateYPercent = getNormalizedOffset(
    safeItem.offsetYPct,
    safeItem.zoom
  );

  return {
    transform: `translate(${translateXPercent}%, ${translateYPercent}%) scale(${safeItem.zoom})`,
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
          <div className={styles.mainImagePreviewWrapper}>
            <img
              src={activeItem.imageUrl}
              alt={productName}
              className={styles.mainImageTransformed}
              style={getPreviewStyle(activeItem)}
              draggable={false}
            />
          </div>
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
              <div className={styles.thumbnailImageWrapper}>
                <img
                  src={item.imageUrl}
                  alt={`${productName} miniature ${index + 1}`}
                  className={styles.thumbnailImage}
                  style={getPreviewStyle(item)}
                  draggable={false}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}