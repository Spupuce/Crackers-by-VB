// components/product-form/ProductImagesSection.js
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "../../styles/AdminProductForm.module.css";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const DRAG_LIMIT = 40;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

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
  const translateX = ((Number(image.cropX) || 50) - 50) * 0.8;
  const translateY = ((Number(image.cropY) || 50) - 50) * 0.8;

  return {
    transform: `translate(${translateX}px, ${translateY}px) scale(${safeZoom})`,
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
  const normalizedImages = useMemo(
    () => (Array.isArray(productImages) ? productImages.map(getSafeImage) : []),
    [productImages]
  );

  const [dragState, setDragState] = useState({
    index: null,
    startPointerX: 0,
    startPointerY: 0,
    startCropX: 50,
    startCropY: 50,
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
          startCropX: 50,
          startCropY: 50,
        };
      });
    }

    function handlePointerMove(event) {
      setDragState((currentState) => {
        if (currentState.index === null) {
          return currentState;
        }

        const frame = previewRefs.current[currentState.index];

        if (!frame) {
          return currentState;
        }

        const position = getPointerPosition(event);
        const rect = frame.getBoundingClientRect();
        const deltaX = position.x - currentState.startPointerX;
        const deltaY = position.y - currentState.startPointerY;

        const nextCropX = clamp(
          currentState.startCropX + (deltaX / rect.width) * DRAG_LIMIT,
          0,
          100
        );
        const nextCropY = clamp(
          currentState.startCropY + (deltaY / rect.height) * DRAG_LIMIT,
          0,
          100
        );

        onUpdateProductImageCrop(currentState.index, {
          cropX: nextCropX,
          cropY: nextCropY,
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
  }, [onUpdateProductImageCrop]);

  function handleDragStart(event, index, image) {
    event.preventDefault();

    const position = getPointerPosition(event);

    setDragState({
      index,
      startPointerX: position.x,
      startPointerY: position.y,
      startCropX: image.cropX,
      startCropY: image.cropY,
    });
  }

  function handleZoomChange(index, value) {
    setPendingImageIndex(index);
    onUpdateProductImageCrop(index, {
      zoom: clamp(Number(value), MIN_ZOOM, MAX_ZOOM),
    });
  }

  function handleWheelZoom(event, index, image) {
    event.preventDefault();

    const zoomStep = event.deltaY < 0 ? 0.1 : -0.1;
    const nextZoom = clamp((Number(image.zoom) || 1) + zoomStep, MIN_ZOOM, MAX_ZOOM);

    setPendingImageIndex(index);
    onUpdateProductImageCrop(index, {
      zoom: nextZoom,
    });
  }

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
                  const isDragging = dragState.index === index;
                  const hasPendingSave = pendingImageIndex === index;

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
                              onSetMainProductImage(index);
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
                        }`}
                        onMouseDown={(event) => handleDragStart(event, index, image)}
                        onTouchStart={(event) => handleDragStart(event, index, image)}
                        onWheel={(event) => handleWheelZoom(event, index, image)}
                        role="presentation"
                      >
                        <img
                          src={image.url}
                          alt={`Photo produit ${index + 1}`}
                          className={styles.extraImagePreview}
                          style={getPreviewStyle(image)}
                          draggable={false}
                        />

                        <div className={styles.imageDragOverlay}>
                          <span className={styles.imageDragOverlayText}>
                            Glisse pour cadrer • molette pour zoomer
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
                            Le cadrage sera enregistré avec le produit.
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