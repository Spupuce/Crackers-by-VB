// components/product-form/ColorPreviewList.js
import { FiArchive, FiEdit2, FiTrash2 } from "react-icons/fi";
import styles from "../../styles/AdminProductForm.module.css";

export default function ColorPreviewList({
  colors,
  activeColors,
  archivedColors,
  onEditColor,
  onArchiveColor,
  onUnarchiveColor,
  onRemoveArchivedColor,
}) {
  return (
    <>
      {activeColors.length > 0 && (
        <div className={styles.colorPreviewList}>
          {activeColors.map((color) => {
            const realIndex = colors.findIndex(
              (entry) =>
                entry.name === color.name &&
                entry.imageUrl === color.imageUrl &&
                Number(entry.quantity) === Number(color.quantity) &&
                entry.isArchived === color.isArchived
            );

            return (
              <div
                key={`${color.name}-${realIndex}`}
                className={styles.colorPreviewItem}
              >
                {color.imageUrl && (
                  <div className={styles.colorPreviewImageWrapper}>
                    <img
                      src={color.imageUrl}
                      alt={color.name}
                      className={styles.colorPreviewImage}
                    />
                  </div>
                )}

                <div className={styles.colorPreviewInfo}>
                  <span className={styles.colorPreviewName}>{color.name}</span>
                  <span className={styles.colorPreviewQuantity}>
                    Quantité : {color.quantity}
                  </span>
                </div>

                <div className={styles.colorPreviewActions}>
                  <button
                    type="button"
                    className={styles.colorPreviewEdit}
                    onClick={() => onEditColor(realIndex)}
                    aria-label={`Modifier la couleur ${color.name}`}
                    title={`Modifier la couleur ${color.name}`}
                  >
                    <FiEdit2 />
                  </button>

                  <button
                    type="button"
                    className={styles.colorPreviewArchive}
                    onClick={() => onArchiveColor(realIndex)}
                    aria-label={`Archiver la couleur ${color.name}`}
                    title={`Archiver la couleur ${color.name}`}
                  >
                    <FiArchive />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {archivedColors.length > 0 && (
        <div className={styles.archivedColorsSection}>
          <h3 className={styles.archivedColorsTitle}>
            Couleurs archivées ({archivedColors.length})
          </h3>

          <div className={styles.colorPreviewList}>
            {archivedColors.map((color) => {
              const realIndex = colors.findIndex(
                (entry) =>
                  entry.name === color.name &&
                  entry.imageUrl === color.imageUrl &&
                  Number(entry.quantity) === Number(color.quantity) &&
                  entry.isArchived === color.isArchived
              );

              return (
                <div
                  key={`${color.name}-${realIndex}`}
                  className={styles.colorPreviewItemArchived}
                >
                  {color.imageUrl && (
                    <div className={styles.colorPreviewImageWrapper}>
                      <img
                        src={color.imageUrl}
                        alt={color.name}
                        className={styles.colorPreviewImage}
                      />
                    </div>
                  )}

                  <div className={styles.colorPreviewInfo}>
                    <span className={styles.colorPreviewName}>{color.name}</span>
                    <span className={styles.colorPreviewQuantity}>
                      Quantité : {color.quantity}
                    </span>
                  </div>

                  <div className={styles.colorPreviewActions}>
                    <button
                      type="button"
                      className={styles.colorPreviewRestore}
                      onClick={() => onUnarchiveColor(realIndex)}
                      aria-label={`Désarchiver la couleur ${color.name}`}
                      title={`Désarchiver la couleur ${color.name}`}
                    >
                      Désarchiver
                    </button>

                    <button
                      type="button"
                      className={styles.colorPreviewDelete}
                      onClick={() => onRemoveArchivedColor(realIndex)}
                      aria-label={`Supprimer définitivement la couleur ${color.name}`}
                      title={`Supprimer définitivement la couleur ${color.name}`}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}