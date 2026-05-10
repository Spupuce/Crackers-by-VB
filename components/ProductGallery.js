/* components/ProductGallery.js */

import { useState } from 'react';
import styles from '../styles/ProductDetail.module.css';

export default function ProductGallery({ images = [], productName }) {
  const fallbackImage = images[0] || '';
  const [activeImage, setActiveImage] = useState(fallbackImage);

  if (!images.length) {
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
        <img
          src={activeImage}
          alt={productName}
          className={styles.mainImage}
        />
      </div>

      <div className={styles.thumbnailRow}>
        {images.map((image, index) => (
          <button
            key={`${image}-${index}`}
            type="button"
            className={`${styles.thumbnailButton} ${
              activeImage === image ? styles.thumbnailButtonActive : ''
            }`}
            onClick={() => setActiveImage(image)}
            aria-label={`Voir l’image ${index + 1} de ${productName}`}
          >
            <img
              src={image}
              alt={`${productName} miniature ${index + 1}`}
              className={styles.thumbnailImage}
            />
          </button>
        ))}
      </div>
    </div>
  );
}