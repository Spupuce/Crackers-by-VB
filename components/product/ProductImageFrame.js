// components/product/ProductImageFrame.js
import styles from '../../styles/ProductImageFrame.module.css';

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const MIN_OFFSET = -100;
const MAX_OFFSET = 100;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getSafeImage(image) {
  if (!image || typeof image !== 'object') {
    return {
      url: '',
      offsetX: 0,
      offsetY: 0,
      offsetXPct: 0,
      offsetYPct: 0,
      zoom: 1,
    };
  }

  const rawOffsetX = Number(image.offsetX);
  const rawOffsetY = Number(image.offsetY);
  const rawOffsetXPct = Number(image.offsetXPct);
  const rawOffsetYPct = Number(image.offsetYPct);
  const rawZoom = Number(image.zoom);

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
    url: typeof image.url === 'string' ? image.url : '',
    offsetX: Number.isFinite(rawOffsetX)
      ? clamp(rawOffsetX, MIN_OFFSET, MAX_OFFSET)
      : 0,
    offsetY: Number.isFinite(rawOffsetY)
      ? clamp(rawOffsetY, MIN_OFFSET, MAX_OFFSET)
      : 0,
    offsetXPct: resolvedOffsetXPct,
    offsetYPct: resolvedOffsetYPct,
    zoom: Number.isFinite(rawZoom) ? clamp(rawZoom, MIN_ZOOM, MAX_ZOOM) : 1,
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

function getTransformStyle(image) {
  const safeImage = getSafeImage(image);
  const translateXPercent = getNormalizedOffset(
    safeImage.offsetXPct,
    safeImage.zoom
  );
  const translateYPercent = getNormalizedOffset(
    safeImage.offsetYPct,
    safeImage.zoom
  );

  return {
    transform: `translate(${translateXPercent}%, ${translateYPercent}%) scale(${safeImage.zoom})`,
    transformOrigin: 'center center',
  };
}

export default function ProductImageFrame({
  image,
  src = '',
  alt = '',
  frameClassName = '',
  viewportClassName = '',
  imageClassName = '',
  draggable = false,
}) {
  const safeImage = getSafeImage(image);
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
          style={getTransformStyle(safeImage)}
          draggable={draggable}
        />
      </div>
    </div>
  );
}