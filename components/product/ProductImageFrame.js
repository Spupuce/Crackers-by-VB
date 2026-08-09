// components/product/ProductImageFrame.js
import {
  getProductImageTransformStyle,
  getSafeProductImage,
} from '../../utils/product';
import styles from '../../styles/ProductImageFrame.module.css';

export default function ProductImageFrame({
  image,
  src = '',
  alt = '',
  frameClassName = '',
  viewportClassName = '',
  imageClassName = '',
  draggable = false,
}) {
  const safeImage = getSafeProductImage(image);
  const resolvedSrc = safeImage.url || src;

  if (!resolvedSrc) {
    return null;
  }

  return (
    <div className={`${styles.frame} ${frameClassName}`.trim()}>
      <div className={`${styles.viewport} ${viewportClassName}`.trim()}>
        <img
          src={resolvedSrc}
          alt={alt}
          className={`${styles.image} ${imageClassName}`.trim()}
          style={getProductImageTransformStyle(safeImage)}
          draggable={draggable}
        />
      </div>
    </div>
  );
}