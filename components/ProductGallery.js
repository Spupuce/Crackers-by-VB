// components/ProductGallery.js
import ProductImageFrame from './product/ProductImageFrame';
import styles from "../styles/ProductDetail.module.css";

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

  return {
    type: typeof item.type === "string" ? item.type : "",
    imageUrl: typeof item.imageUrl === "string" ? item.imageUrl : "",
    label: typeof item.label === "string" ? item.label : "",
    colorName: typeof item.colorName === "string" ? item.colorName : "",
    publicId: typeof item.publicId === "string" ? item.publicId : "",
    offsetX: Number(item.offsetX) || 0,
    offsetY: Number(item.offsetY) || 0,
    offsetXPct: Number(item.offsetXPct) || 0,
    offsetYPct: Number(item.offsetYPct) || 0,
    zoom: Number(item.zoom) || 1,
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
          <ProductImageFrame
            image={{
              url: activeItem.imageUrl,
              offsetX: activeItem.offsetX,
              offsetY: activeItem.offsetY,
              offsetXPct: activeItem.offsetXPct,
              offsetYPct: activeItem.offsetYPct,
              zoom: activeItem.zoom,
            }}
            src={activeItem.imageUrl}
            alt={productName}
            frameClassName={styles.mainImagePreviewFrame}
            viewportClassName={styles.mainImagePreviewViewport}
            imageClassName={styles.mainImagePreviewImage}
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
              <div className={styles.thumbnailImageWrapper}>
                <ProductImageFrame
                  image={{
                    url: item.imageUrl,
                    offsetX: item.offsetX,
                    offsetY: item.offsetY,
                    offsetXPct: item.offsetXPct,
                    offsetYPct: item.offsetYPct,
                    zoom: item.zoom,
                  }}
                  src={item.imageUrl}
                  alt={`${productName} miniature ${index + 1}`}
                  frameClassName={styles.thumbnailPreviewFrame}
                  viewportClassName={styles.thumbnailPreviewViewport}
                  imageClassName={styles.thumbnailPreviewImage}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}