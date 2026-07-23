// components/product-form/ColorFormCard.js
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

export default function ColorFormCard({
  showColorForm,
  isEditingColor,
  colorDraft,
  onColorDraftChange,
  colorImageInputRef,
  extraColorImageInputRef,
  onColorImageButtonClick,
  onExtraColorImageButtonClick,
  colorImageFileName,
  extraColorImageFileName,
  onColorImageUpload,
  onExtraColorImageUpload,
  isUploadingColorImage,
  colorImageUploadError,
  onValidateColor,
  onCancelColor,
  onSetMainColorImage,
  onRemoveColorImage,
  onUpdateColorImageCrop,
}) {
  if (!showColorForm) {
    return null;
  }

  const normalizedImages = Array.isArray(colorDraft.images)
    ? colorDraft.images.map(getSafeImage)
    : [];

  return (
    <div className={styles.colorCard}>
      <div className={styles.colorCardHeader}>
        <p className={styles.colorCardTitle}>
          {isEditingColor ? "Modifier la couleur" : "Ajouter une couleur"}
        </p>
      </div>

      <div className={styles.colorRow}>
        <div className={styles.field}>
          <label htmlFor="colorName" className={styles.smallLabel}>
            Nom de la couleur
          </label>
          <input
            id="colorName"
            name="colorName"
            type="text"
            placeholder="Ex : Rose poudré"
            className={styles.input}
            value={colorDraft.name}
            onChange={(e) => onColorDraftChange("name", e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="colorQuantity" className={styles.smallLabel}>
            Quantité
          </label>
          <input
            id="colorQuantity"
            name="colorQuantity"
            type="number"
            min="0"
            placeholder="Ex : 2"
            className={styles.input}
            value={colorDraft.quantity}
            onChange={(e) => onColorDraftChange("quantity", e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>

      <div className={styles.imageFieldRow}>
        <div className={styles.imageUploadColumn}>
          <input
            ref={colorImageInputRef}
            id="colorImageFile"
            name="colorImageFile"
            type="file"
            accept="image/*"
            className={styles.hiddenFileInput}
            onChange={onColorImageUpload}
          />

          <label htmlFor="colorImageFile" className={styles.smallLabel}>
            Téléverser l’image principale de la couleur
          </label>

          <div className={styles.fileControl}>
            <button
              type="button"
              className={styles.fileButton}
              onClick={onColorImageButtonClick}
            >
              Choisir un fichier
            </button>
            <span className={styles.fileName}>{colorImageFileName}</span>
          </div>

          <input
            ref={extraColorImageInputRef}
            id="extraColorImageFile"
            name="extraColorImageFile"
            type="file"
            accept="image/*"
            className={styles.hiddenFileInput}
            onChange={onExtraColorImageUpload}
          />

          <label htmlFor="extraColorImageFile" className={styles.smallLabel}>
            Ajouter d’autres photos pour cette couleur
          </label>

          <div className={styles.fileControl}>
            <button
              type="button"
              className={styles.fileButton}
              onClick={onExtraColorImageButtonClick}
            >
              Ajouter une photo
            </button>
            <span className={styles.fileName}>
              {extraColorImageFileName ||
                (normalizedImages.length > 0
                  ? `${normalizedImages.length} photo(s) couleur`
                  : "Aucune photo couleur supplémentaire")}
            </span>
          </div>

          {isUploadingColorImage && (
            <p className={styles.stockHint}>
              Téléversement de la photo couleur en cours...
            </p>
          )}

          {colorImageUploadError && (
            <p className={styles.errorText}>{colorImageUploadError}</p>
          )}
        </div>

        <div className={styles.imageUrlColumn}>
          <label htmlFor="colorImageUrl" className={styles.smallLabel}>
            URL photo principale de la couleur
          </label>
          <input
            id="colorImageUrl"
            name="colorImageUrl"
            type="url"
            placeholder="https://..."
            className={styles.input}
            value={colorDraft.imageUrl}
            onChange={(e) => onColorDraftChange("imageUrl", e.target.value)}
            autoComplete="url"
          />
        </div>
      </div>

      {colorDraft.imageUrl && (
        <div className={styles.mainImagePreviewWrapper}>
          <img
            src={colorDraft.imageUrl}
            alt="Prévisualisation de la photo principale de la couleur"
            className={styles.mainImagePreview}
          />
        </div>
      )}

      {normalizedImages.length > 0 && (
        <div className={styles.field}>
          <label className={styles.smallLabel}>Galerie de la couleur</label>

          <div className={styles.extraImagesGrid}>
            {normalizedImages.map((image, index) => {
              const isMainImage = image.url === colorDraft.imageUrl;

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
                        onClick={() => onSetMainColorImage(index)}
                      >
                        Définir comme principale
                      </button>
                    )}
                  </div>

                  <div className={styles.extraImagePreviewFrame}>
                    <img
                      src={image.url}
                      alt={`Photo couleur ${index + 1}`}
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
                          onUpdateColorImageCrop(index, {
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
                          onUpdateColorImageCrop(index, {
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
                          onUpdateColorImageCrop(index, {
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
                      onClick={() => onRemoveColorImage(index)}
                    >
                      Retirer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className={styles.colorActions}>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={onValidateColor}
        >
          {isEditingColor ? "Mettre à jour la couleur" : "Ajouter la couleur"}
        </button>

        <button
          type="button"
          className={styles.outlineButton}
          onClick={onCancelColor}
        >
          Annuler
        </button>
      </div>
    </div>
  );
}