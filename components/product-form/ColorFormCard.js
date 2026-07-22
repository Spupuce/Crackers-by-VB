// components/product-form/ColorFormCard.js
import styles from "../../styles/AdminProductForm.module.css";

export default function ColorFormCard({
  showColorForm,
  isEditingColor,
  colorDraft,
  onColorDraftChange,
  colorImageInputRef,
  onColorImageButtonClick,
  colorImageFileName,
  onColorImageUpload,
  isUploadingColorImage,
  colorImageUploadError,
  onValidateColor,
  onCancelColor,
}) {
  if (!showColorForm) {
    return null;
  }

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
            Téléverser une photo couleur
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
            URL photo couleur
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
            alt="Prévisualisation de la photo couleur"
            className={styles.mainImagePreview}
          />
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