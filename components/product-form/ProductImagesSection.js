// components/product-form/ProductImagesSection.js
import styles from "../../styles/AdminProductForm.module.css";

function getSafeImage(image) {
  if (!image || typeof image !== "object") {
    return {
      url: "",
      cropX: 50,
      cropY: 50,
      zoom: 1,
    };
  }

  return {
    url: image.url || "",
    cropX: Number.isFinite(Number(image.cropX)) ? Number(image.cropX) : 50,
    cropY: Number.isFinite(Number(image.cropY)) ? Number(image.cropY) : 50,
    zoom: Number.isFinite(Number(image.zoom)) ? Number(image.zoom) : 1,
  };
}

export default function ProductImagesSection({
  mainImageInputRef,
  extraImageInputRef,
  mainImageFileName,
  extraImageFileName,
  onMainImageButtonClick,
  onExtraImageButtonClick,
  onMainImageUpload,
  onExtraProductImageUpload,
  isUploadingImage,
  imageUploadError,
  imageUrl,
  onImageUrlChange,
  productImages,
  onRemoveProductImage,
  onSetMainProductImage,
  onUpdateProductImageCrop,
}) {
  const normalizedImages = Array.isArray(productImages)
    ? productImages.map(getSafeImage)
    : [];

  return (
    <>
      <div className={styles.field}>
        <label className={styles.label}>Image principale *</label>

        <div className={styles.imageFieldRow}>
          <div className={styles.imageUploadColumn}>
            <label htmlFor="mainImageFile" className={styles.smallLabel}>
              Fichier image principale
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
              URL de l’image principale
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
        <label className={styles.label}>Galerie du produit</label>

        <div className={styles.imageFieldRow}>
          <div className={styles.imageUploadColumn}>
            <label htmlFor="productExtraImageFile" className={styles.smallLabel}>
              Ajouter une photo à la galerie
            </label>

            <input
              ref={extraImageInputRef}
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
                onClick={onExtraImageButtonClick}
              >
                Choisir un fichier
              </button>
              <span className={styles.fileName}>
                {extraImageFileName ||
                  (normalizedImages.length > 0
                    ? `${normalizedImages.length} photo(s) ajoutée(s)`
                    : "Aucune photo supplémentaire")}
              </span>
            </div>
          </div>

          <div className={styles.imageUrlColumn}>
            <label className={styles.smallLabel}>Aperçu et cadrage</label>

            {normalizedImages.length === 0 ? (
              <p className={styles.stockHint}>
                Ajoute plusieurs photos pour enrichir la fiche produit.
              </p>
            ) : (
              <div className={styles.extraImagesGrid}>
                {normalizedImages.map((image, index) => {
                  const isMainImage = image.url === imageUrl;

                  return (
                    <div
                      key={`${image.url}-${index}`}
                      className={styles.extraImageItem}
                    >
                      <div className={styles.extraImageBadgeRow}>
                        <span
                          className={
                            isMainImage
                              ? styles.primaryImageBadge
                              : styles.secondaryImageBadge
                          }
                        >
                          {isMainImage ? "Image principale" : `Image ${index + 1}`}
                        </span>

                        {!isMainImage && (
                          <button
                            type="button"
                            className={styles.outlineButton}
                            onClick={() => onSetMainProductImage(index)}
                          >
                            Définir comme principale
                          </button>
                        )}
                      </div>

                      <div className={styles.extraImagePreviewFrame}>
                        <img
                          src={image.url}
                          alt={`Photo produit ${index + 1}`}
                          className={styles.extraImagePreview}
                          style={{
                            objectPosition: `${image.cropX}% ${image.cropY}%`,
                            transform: `scale(${image.zoom})`,
                          }}
                        />
                      </div>

                      <div className={styles.cropControls}>
                        <label className={styles.cropControl}>
                          <span className={styles.smallLabel}>Horizontal</span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={image.cropX}
                            onChange={(event) =>
                              onUpdateProductImageCrop(index, {
                                cropX: Number(event.target.value),
                              })
                            }
                          />
                        </label>

                        <label className={styles.cropControl}>
                          <span className={styles.smallLabel}>Vertical</span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={image.cropY}
                            onChange={(event) =>
                              onUpdateProductImageCrop(index, {
                                cropY: Number(event.target.value),
                              })
                            }
                          />
                        </label>

                        <label className={styles.cropControl}>
                          <span className={styles.smallLabel}>Zoom</span>
                          <input
                            type="range"
                            min="1"
                            max="3"
                            step="0.1"
                            value={image.zoom}
                            onChange={(event) =>
                              onUpdateProductImageCrop(index, {
                                zoom: Number(event.target.value),
                              })
                            }
                          />
                        </label>
                      </div>

                      <div className={styles.extraImageActions}>
                        <button
                          type="button"
                          className={styles.extraImageRemove}
                          onClick={() => onRemoveProductImage(index)}
                        >
                          Retirer
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}