// components/product-form/ProductImagesSection.js
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "../../styles/AdminProductForm.module.css";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const MIN_OFFSET = -100;
const MAX_OFFSET = 100;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getSafeImage(image) {
  if (!image || typeof image !== "object") {
    return {
      url: "",
      publicId: "",
      offsetX: 0,
      offsetY: 0,
      offsetXPct: 0,
      offsetYPct: 0,
      zoom: 1,
    };
  }

  return {
    url: image.url || "",
    publicId: typeof image.publicId === "string" ? image.publicId : "",
    offsetX: Number.isFinite(Number(image.offsetX))
      ? clamp(Number(image.offsetX), MIN_OFFSET, MAX_OFFSET)
      : 0,
    offsetY: Number.isFinite(Number(image.offsetY))
      ? clamp(Number(image.offsetY), MIN_OFFSET, MAX_OFFSET)
      : 0,
    offsetXPct: Number.isFinite(Number(image.offsetXPct))
      ? Number(image.offsetXPct)
      : 0,
    offsetYPct: Number.isFinite(Number(image.offsetYPct))
      ? Number(image.offsetYPct)
      : 0,
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

function getNormalizedOffset(offset, zoom) {
  if (zoom <= 1) {
    return 0;
  }

  const zoomOverflowRatio = (zoom - 1) / (MAX_ZOOM - 1);
  const dynamicLimit = clamp(zoomOverflowRatio * 50, 0, 50);

  return clamp(offset, -dynamicLimit, dynamicLimit);
}

function getPreviewStyle(image) {
  const safeZoom = clamp(Number(image.zoom) || 1, MIN_ZOOM, MAX_ZOOM);
  const offsetX = Number(image.offsetX) || 0;
  const offsetY = Number(image.offsetY) || 0;

  const translateXPercent = getNormalizedOffset(offsetX, safeZoom);
  const translateYPercent = getNormalizedOffset(offsetY, safeZoom);

  return {
    transform: `translate(${translateXPercent}%, ${translateYPercent}%) scale(${safeZoom})`,
    transformOrigin: "center center",
  };
}

function getContainSize(frameWidth, frameHeight, imageWidth, imageHeight) {
  if (!frameWidth || !frameHeight || !imageWidth || !imageHeight) {
    return {
      width: frameWidth || 0,
      height: frameHeight || 0,
    };
  }

  const frameRatio = frameWidth / frameHeight;
  const imageRatio = imageWidth / imageHeight;

  if (imageRatio > frameRatio) {
    return {
      width: frameWidth,
      height: frameWidth / imageRatio,
    };
  }

  return {
    width: frameHeight * imageRatio,
    height: frameHeight,
  };
}

export default function ProductImagesSection({
  extraImageInputRef,
  extraImageFileName,
  onExtraImageButtonClick,
  onExtraProductImageUpload,
  isUploadingImage,
  imageUploadError,
  imageUrl,
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
    startOffsetX: 0,
    startOffsetY: 0,
  });

  const previewRefs = useRef({});
  const imageRefs = useRef({});
  const [selectedGalleryIndex, setSelectedGalleryIndex] = useState(0);

  const selectedGalleryImage = useMemo(() => {
    if (!normalizedImages.length) {
      return null;
    }

    const selectedImage =
      normalizedImages[selectedGalleryIndex] || normalizedImages[0] || null;

    if (!selectedImage) {
      return null;
    }

    return selectedImage;
  }, [normalizedImages, selectedGalleryIndex]);

  useEffect(() => {
    setSelectedGalleryIndex((currentIndex) => {
      if (!normalizedImages.length) {
        return 0;
      }

      if (currentIndex >= normalizedImages.length) {
        return normalizedImages.length - 1;
      }

      return currentIndex;
    });
  }, [normalizedImages]);

  useEffect(() => {
    function handlePointerUp() {
      setDragState((currentState) => {
        if (currentState.index === null) {
          return currentState;
        }

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

        if (event.cancelable) {
          event.preventDefault();
        }

        const position = getPointerPosition(event);
        const rect = frame.getBoundingClientRect();
        const imageNode = imageRefs.current[currentState.index];
        const imageRect = imageNode?.getBoundingClientRect();

        const deltaX = position.x - currentState.startPointerX;
        const deltaY = position.y - currentState.startPointerY;

        const displayedWidth = imageRect?.width || rect.width;
        const displayedHeight = imageRect?.height || rect.height;

        const zoomFactor = Math.max(1, Number(currentImage.zoom));
        const maxOffsetX = Math.max(
          0,
          (displayedWidth * zoomFactor - displayedWidth) / 2
        );
        const maxOffsetY = Math.max(
          0,
          (displayedHeight * zoomFactor - displayedHeight) / 2
        );

        const nextOffsetX = clamp(
          currentState.startOffsetX + deltaX,
          -maxOffsetX,
          maxOffsetX
        );
        const nextOffsetY = clamp(
          currentState.startOffsetY + deltaY,
          -maxOffsetY,
          maxOffsetY
        );

        const offsetXPct =
          displayedWidth > 0 ? (nextOffsetX / displayedWidth) * 100 : 0;
        const offsetYPct =
          displayedHeight > 0 ? (nextOffsetY / displayedHeight) * 100 : 0;

        onUpdateProductImageCrop(currentState.index, {
          offsetX: nextOffsetX,
          offsetY: nextOffsetY,
          offsetXPct,
          offsetYPct,
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
  }, [normalizedImages, onUpdateProductImageCrop]);

  function handleDragStart(event, index, image) {
    if (Number(image.zoom) <= 1) {
      return;
    }

    if (event.cancelable) {
      event.preventDefault();
    }

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

    if (nextZoom <= 1) {
      onUpdateProductImageCrop(index, {
        zoom: nextZoom,
        offsetX: 0,
        offsetY: 0,
        offsetXPct: 0,
        offsetYPct: 0,
      });
      return;
    }

    onUpdateProductImageCrop(index, {
      zoom: nextZoom,
    });
  }

  function handleWheelZoom(event, index, image) {
    if (event.cancelable) {
      event.preventDefault();
    }

    const zoomStep = event.deltaY < 0 ? 0.1 : -0.1;
    const nextZoom = clamp(
      (Number(image.zoom) || 1) + zoomStep,
      MIN_ZOOM,
      MAX_ZOOM
    );

    if (nextZoom <= 1) {
      onUpdateProductImageCrop(index, {
        zoom: nextZoom,
        offsetX: 0,
        offsetY: 0,
        offsetXPct: 0,
        offsetYPct: 0,
      });
      return;
    }

    onUpdateProductImageCrop(index, {
      zoom: nextZoom,
    });
  }

  function handleSelectGalleryImage(index) {
    setSelectedGalleryIndex(index);
  }

  return (
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
          <label className={styles.smallLabel}>Aperçu et cadrage</label>

          {normalizedImages.length === 0 ? (
            <p className={styles.stockHint}>
              Ajoute plusieurs photos pour enrichir la fiche produit.
            </p>
          ) : (
            <>
              {selectedGalleryImage?.url && (
                <div className={styles.mainImagePreviewWrapper}>
                  <img
                    src={selectedGalleryImage.url}
                    alt="Aperçu de la photo sélectionnée de la galerie"
                    className={styles.mainImagePreview}
                    style={getPreviewStyle(selectedGalleryImage)}
                    draggable={false}
                  />
                </div>
              )}

              <div className={styles.extraImagesGrid}>
                {normalizedImages.map((image, index) => {
                  const isMainImage = image.url === imageUrl;
                  const isDragging = dragState.index === index;
                  const canDrag = Number(image.zoom) > 1;
                  const isSelected = selectedGalleryIndex === index;

                  const frameRef = (node) => {
                    previewRefs.current[index] = node;
                  };

                  const imageRef = (node) => {
                    imageRefs.current[index] = node;
                  };

                  const displayedSize = (() => {
                    const frame = previewRefs.current[index];
                    const imageNode = imageRefs.current[index];

                    if (!frame || !imageNode) {
                      return null;
                    }

                    const frameRect = frame.getBoundingClientRect();
                    const imageRect = imageNode.getBoundingClientRect();

                    return getContainSize(
                      frameRect.width,
                      frameRect.height,
                      imageRect.width,
                      imageRect.height
                    );
                  })();

                  return (
                    <div
                      key={`${image.url}-${index}`}
                      className={`${styles.extraImageItem} ${
                        isSelected ? styles.extraImageItemSelected : ""
                      }`}
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

                      <div
                        ref={frameRef}
                        className={`${styles.extraImagePreviewFrame} ${
                          isDragging ? styles.extraImagePreviewFrameDragging : ""
                        } ${
                          canDrag ? styles.extraImagePreviewFrameMovable : ""
                        }`}
                        onMouseDown={(event) =>
                          handleDragStart(event, index, image)
                        }
                        onTouchStart={(event) =>
                          handleDragStart(event, index, image)
                        }
                        onWheel={(event) => handleWheelZoom(event, index, image)}
                        onClick={() => handleSelectGalleryImage(index)}
                        role="presentation"
                      >
                        <img
                          ref={imageRef}
                          src={image.url}
                          alt={`Photo produit ${index + 1}`}
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
                            Ajuste le zoom et le cadrage, puis enregistre le
                            produit pour valider.
                          </p>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}