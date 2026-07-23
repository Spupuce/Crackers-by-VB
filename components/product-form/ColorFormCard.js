// components/product-form/ColorFormCard.js
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "../../styles/AdminProductForm.module.css";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const DRAG_LIMIT_PX = 80;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getSafeImage(image) {
  if (!image || typeof image !== "object") {
    return {
      url: "",
      offsetX: 0,
      offsetY: 0,
      zoom: 1,
    };
  }

  return {
    url: image.url || "",
    offsetX: Number.isFinite(Number(image.offsetX)) ? Number(image.offsetX) : 0,
    offsetY: Number.isFinite(Number(image.offsetY)) ? Number(image.offsetY) : 0,
    zoom: Number.isFinite(Number(image.zoom))
      ? clamp(Number(image.zoom), MIN_ZOOM, MAX_ZOOM)
      : 1,
  };
}

function getPointerPosition(event) {
  if (event.touches?.length) {
    return {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    };
  }

  return {
    x: event.clientX,
    y: event.clientY,
  };
}

function getPreviewStyle(image) {
  const safeZoom = clamp(Number(image.zoom) || 1, MIN_ZOOM, MAX_ZOOM);
  const offsetX = Number(image.offsetX) || 0;
  const offsetY = Number(image.offsetY) || 0;

  return {
    transform: `translate(${offsetX}px, ${offsetY}px) scale(${safeZoom})`,
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
  const normalizedImages = useMemo(
    () => (Array.isArray(colorDraft.images) ? colorDraft.images.map(getSafeImage) : []),
    [colorDraft.images]
  );

  const [dragState, setDragState] = useState({
    index: null,
    startPointerX: 0,
    startPointerY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
  });

  const [pendingImageIndex, setPendingImageIndex] = useState(null);
  const previewRefs = useRef({});

  useEffect(() => {
    function handlePointerUp() {
      setDragState((currentState) => {
        if (currentState.index === null) {
          return currentState;
        }

        setPendingImageIndex(currentState.index);
        return {
          index: null,
          startPointerX: 0,
          startPointerY: 0,
          startOffsetX: 0,
          startOffsetY: 0,
        };
      });
    }

    function handlePointerMove(event) {
      setDragState((currentState) => {
        if (currentState.index === null) {
          return currentState;
        }

        const frame = previewRefs.current[currentState.index];
        const currentImage = normalizedImages[currentState.index];

        if (!frame || !currentImage || Number(currentImage.zoom) <= 1) {
          return currentState;
        }

        event.preventDefault();

        const position = getPointerPosition(event);
        const rect = frame.getBoundingClientRect();
        const deltaX = position.x - currentState.startPointerX;
        const deltaY = position.y - currentState.startPointerY;

        const zoomFactor = Math.max(1, Number(currentImage.zoom));
        const maxOffsetX = (rect.width * (zoomFactor - 1)) / 2;
        const maxOffsetY = (rect.height * (zoomFactor - 1)) / 2;

        const nextOffsetX = clamp(
          currentState.startOffsetX + deltaX,
          -Math.min(maxOffsetX, DRAG_LIMIT_PX),
          Math.min(maxOffsetX, DRAG_LIMIT_PX)
        );
        const nextOffsetY = clamp(
          currentState.startOffsetY + deltaY,
          -Math.min(maxOffsetY, DRAG_LIMIT_PX),
          Math.min(maxOffsetY, DRAG_LIMIT_PX)
        );

        onUpdateColorImageCrop(currentState.index, {
          offsetX: nextOffsetX,
          offsetY: nextOffsetY,
        });

        return currentState;
      });
    }

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);
    window.addEventListener("touchmove", handlePointerMove, { passive: false });
    window.addEventListener("touchend", handlePointerUp);
    window.addEventListener("touchcancel", handlePointerUp);

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", handlePointerUp);
      window.removeEventListener("touchcancel", handlePointerUp);
    };
  }, [normalizedImages, onUpdateColorImageCrop]);

  if (!showColorForm) {
    return null;
  }

  function handleDragStart(event, index, image) {
    if (Number(image.zoom) <= 1) {
      return;
    }

    event.preventDefault();

    const position = getPointerPosition(event);

    setDragState({
      index,
      startPointerX: position.x,
      startPointerY: position.y,
      startOffsetX: Number(image.offsetX) || 0,
      startOffsetY: Number(image.offsetY) || 0,
    });
  }

  function handleZoomChange(index, value) {
    const nextZoom = clamp(Number(value), MIN_ZOOM, MAX_ZOOM);

    setPendingImageIndex(index);

    onUpdateColorImageCrop(index, {
      zoom: nextZoom,
      ...(nextZoom <= 1
        ? {
            offsetX: 0,
            offsetY: 0,
          }
        : {}),
    });
  }

  function handleWheelZoom(event, index, image) {
    event.preventDefault();

    const zoomStep = event.deltaY < 0 ? 0.1 : -0.1;
    const nextZoom = clamp((Number(image.zoom) || 1) + zoomStep, MIN_ZOOM, MAX_ZOOM);

    setPendingImageIndex(index);

    onUpdateColorImageCrop(index, {
      zoom: nextZoom,
      ...(nextZoom <= 1
        ? {
            offsetX: 0,
            offsetY: 0,
          }
        : {}),
    });
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
              const isDragging = dragState.index === index;
              const hasPendingSave = pendingImageIndex === index;
              const canDrag = Number(image.zoom) > 1;

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
                        onClick={() => {
                          setPendingImageIndex(index);
                          onSetMainColorImage(index);
                        }}
                      >
                        Définir comme principale
                      </button>
                    )}
                  </div>

                  <div
                    ref={(node) => {
                      previewRefs.current[index] = node;
                    }}
                    className={`${styles.extraImagePreviewFrame} ${
                      isDragging ? styles.extraImagePreviewFrameDragging : ""
                    } ${canDrag ? styles.extraImagePreviewFrameMovable : ""}`}
                    onMouseDown={(event) => handleDragStart(event, index, image)}
                    onTouchStart={(event) => handleDragStart(event, index, image)}
                    onWheel={(event) => handleWheelZoom(event, index, image)}
                    role="presentation"
                  >
                    <img
                      src={image.url}
                      alt={`Photo couleur ${index + 1}`}
                      className={styles.extraImagePreviewContain}
                      style={getPreviewStyle(image)}
                      draggable={false}
                    />

                    <div className={styles.imageDragOverlay}>
                      <span className={styles.imageDragOverlayText}>
                        {canDrag
                          ? "Zoome puis glisse pour ajuster"
                          : "Image entière visible • zoome pour ajuster"}
                      </span>
                    </div>
                  </div>

                  <div className={styles.cropControls}>
                    <label className={styles.cropControl}>
                      <span className={styles.smallLabel}>Zoom</span>
                      <input
                        type="range"
                        min={MIN_ZOOM}
                        max={MAX_ZOOM}
                        step="0.1"
                        value={image.zoom}
                        onChange={(event) =>
                          handleZoomChange(index, event.target.value)
                        }
                      />
                    </label>

                    <div className={styles.imageCardHintRow}>
                      <p className={styles.stockHint}>
                        Le cadrage sera enregistré avec la couleur.
                      </p>

                      {hasPendingSave && (
                        <span className={styles.imagePendingBadge}>
                          Modifications en attente
                        </span>
                      )}
                    </div>
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