// components/product-form/ProductImagesSection.js
import styles from "../../styles/AdminProductForm.module.css";

export default function ProductImagesSection({
  mainImageInputRef,
  mainImageFileName,
  onMainImageButtonClick,
  onMainImageUpload,
  isUploadingImage,
  imageUploadError,
  imageUrl,
  onImageUrlChange,
  onExtraProductImageUpload,
  productImages,
  onRemoveProductImage,
}) {
  return (
    <>
      <div className={styles.field}>
        <label className={styles.label}>Image principale *</label>

        <div className={styles.imageFieldRow}>
          <div className={styles.imageUploadColumn}>
            <label htmlFor="mainImageFile" className={styles.smallLabel}>
              Fichier image
            </label>

            <input
              ref={mainImageInputRef}
              id="mainImageFile"
              name="mainImageFile"
              type="file"
              accept="image/*"
              className={styles.hiddenFileInput}
              onChange={onMainImageUpload}
            />

            <div className={styles.fileControl}>
              <button
                type="button"
                className={styles.fileButton}
                onClick={onMainImageButtonClick}
              >
                Choisir un fichier
              </button>
              <span className={styles.fileName}>{mainImageFileName}</span>
            </div>

            {isUploadingImage && (
              <p className={styles.stockHint}>
                Téléversement de l’image en cours...
              </p>
            )}

            {imageUploadError && (
              <p className={styles.errorText}>{imageUploadError}</p>
            )}
          </div>

          <div className={styles.imageUrlColumn}>
            <label htmlFor="imageUrl" className={styles.smallLabel}>
              URL de l’image (remplie automatiquement)
            </label>
            <input
              id="imageUrl"
              name="imageUrl"
              type="url"
              placeholder="https://..."
              className={styles.input}
              value={imageUrl}
              onChange={onImageUrlChange}
              autoComplete="url"
              required
            />
          </div>
        </div>

        {imageUrl && (
          <div className={styles.mainImagePreviewWrapper}>
            <img
              src={imageUrl}
              alt="Prévisualisation de l’image principale du produit"
              className={styles.mainImagePreview}
            />
          </div>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Photos supplémentaires du produit</label>

        <div className={styles.imageFieldRow}>
          <div className={styles.imageUploadColumn}>
            <label htmlFor="productExtraImageFile" className={styles.smallLabel}>
              Ajouter une photo
            </label>

            <input
              id="productExtraImageFile"
              name="productExtraImageFile"
              type="file"
              accept="image/*"
              className={styles.hiddenFileInput}
              onChange={onExtraProductImageUpload}
            />

            <div className={styles.fileControl}>
              <button
                type="button"
                className={styles.fileButton}
                onClick={() =>
                  document.getElementById("productExtraImageFile")?.click()
                }
              >
                Choisir un fichier
              </button>
              <span className={styles.fileName}>
                {productImages.length > 0
                  ? `${productImages.length} photo(s) ajoutée(s)`
                  : "Aucune photo supplémentaire"}
              </span>
            </div>
          </div>

          <div className={styles.imageUrlColumn}>
            <label className={styles.smallLabel}>Aperçu des photos</label>
            <div className={styles.extraImagesGrid}>
              {productImages.map((image, index) => (
                <div
                  key={`${image.url}-${index}`}
                  className={styles.extraImageItem}
                >
                  <img
                    src={image.url}
                    alt={`Photo supplémentaire ${index + 1}`}
                    className={styles.extraImagePreview}
                  />
                  <button
                    type="button"
                    className={styles.extraImageRemove}
                    onClick={() => onRemoveProductImage(index)}
                  >
                    Retirer
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}