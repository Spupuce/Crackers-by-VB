// components/ProductForm.js
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "../styles/AdminProductForm.module.css";
import ProductImagesSection from "./product-form/ProductImagesSection";
import ColorFormCard from "./product-form/ColorFormCard";
import ColorPreviewList from "./product-form/ColorPreviewList";
import {
  buildInitialFormValues,
  createEmptyColorDraft,
  getFileLabel,
  normalizeColorName,
  sanitizeColors,
  sanitizeImages,
  serializeProductSnapshot,
} from "../utils/productForm";

const MIN_OFFSET = -80;
const MAX_OFFSET = 80;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function buildDefaultImage(url, publicId = "") {
  return {
    url,
    publicId,
    offsetX: 0,
    offsetY: 0,
    zoom: 1,
  };
}

function normalizePreviewImage(image) {
  if (!image || typeof image !== "object") {
    return null;
  }

  const url = typeof image.url === "string" ? image.url.trim() : "";

  if (!url) {
    return null;
  }

  const publicId =
    typeof image.publicId === "string" ? image.publicId.trim() : "";

  const offsetX = Number(image.offsetX);
  const offsetY = Number(image.offsetY);
  const zoom = Number(image.zoom);
  const cropX = Number(image.cropX);
  const cropY = Number(image.cropY);

  const hasOffsetCoordinates =
    Number.isFinite(offsetX) || Number.isFinite(offsetY);

  const fallbackOffsetX = Number.isFinite(cropX) ? (cropX - 50) * 1.6 : 0;
  const fallbackOffsetY = Number.isFinite(cropY) ? (cropY - 50) * 1.6 : 0;

  return {
    url,
    publicId,
    offsetX: Number.isFinite(offsetX)
      ? clamp(offsetX, MIN_OFFSET, MAX_OFFSET)
      : hasOffsetCoordinates
      ? 0
      : clamp(fallbackOffsetX, MIN_OFFSET, MAX_OFFSET),
    offsetY: Number.isFinite(offsetY)
      ? clamp(offsetY, MIN_OFFSET, MAX_OFFSET)
      : hasOffsetCoordinates
      ? 0
      : clamp(fallbackOffsetY, MIN_OFFSET, MAX_OFFSET),
    zoom: Number.isFinite(zoom) ? clamp(zoom, MIN_ZOOM, MAX_ZOOM) : 1,
  };
}

function normalizePreviewImages(images) {
  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .map((image) => {
      if (!image) {
        return null;
      }

      if (typeof image === "string") {
        return normalizePreviewImage(buildDefaultImage(image.trim()));
      }

      return normalizePreviewImage(image);
    })
    .filter(Boolean);
}

export default function ProductForm({
  mode = "create",
  initialValues = null,
  onSubmit,
  hasPendingRestockRequests = false,
  onUnsavedChangesChange,
}) {
  const [showColorForm, setShowColorForm] = useState(false);
  const [colorDraft, setColorDraft] = useState(createEmptyColorDraft());
  const [editingColorIndex, setEditingColorIndex] = useState(null);
  const [submitAction, setSubmitAction] = useState("save");

  const [formValues, setFormValues] = useState(
    buildInitialFormValues(initialValues)
  );
  const [stockInputValue, setStockInputValue] = useState(
    initialValues?.stock ?? ""
  );

  const [colors, setColors] = useState(
    initialValues?.colors && Array.isArray(initialValues.colors)
      ? sanitizeColors(initialValues.colors).map((color) => ({
          ...color,
          images: normalizePreviewImages(color.images),
        }))
      : []
  );

  const initialColorsSnapshotRef = useRef(
    sanitizeColors(initialValues?.colors).map((color) => ({
      ...color,
      images: normalizePreviewImages(color.images),
    }))
  );

  const initialProductSnapshotRef = useRef(
    serializeProductSnapshot({
      ...buildInitialFormValues(initialValues),
      imageUrl: initialValues?.imageUrl || "",
      images: normalizePreviewImages(initialValues?.images),
      colors: sanitizeColors(initialValues?.colors).map((color) => ({
        ...color,
        images: normalizePreviewImages(color.images),
      })),
    })
  );

  const mainImageInputRef = useRef(null);
  const extraImageInputRef = useRef(null);
  const colorImageInputRef = useRef(null);
  const extraColorImageInputRef = useRef(null);

  const [mainImageFileName, setMainImageFileName] = useState(
    "Aucun fichier choisi"
  );
  const [extraImageFileName, setExtraImageFileName] = useState("");
  const [colorImageFileName, setColorImageFileName] = useState(
    "Aucun fichier choisi"
  );
  const [extraColorImageFileName, setExtraColorImageFileName] = useState("");

  const [imageUrl, setImageUrl] = useState(initialValues?.imageUrl || "");
  const [productImages, setProductImages] = useState(
    normalizePreviewImages(initialValues?.images)
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");

  const [isUploadingColorImage, setIsUploadingColorImage] = useState(false);
  const [colorImageUploadError, setColorImageUploadError] = useState("");

  useEffect(() => {
    const normalizedInitialColors =
      initialValues?.colors && Array.isArray(initialValues.colors)
        ? sanitizeColors(initialValues.colors).map((color) => ({
            ...color,
            images: normalizePreviewImages(color.images),
          }))
        : [];

    const nextFormValues = buildInitialFormValues(initialValues);

    setColors(normalizedInitialColors);
    setFormValues(nextFormValues);
    setStockInputValue(initialValues?.stock ?? "");
    initialColorsSnapshotRef.current = normalizedInitialColors;
    initialProductSnapshotRef.current = serializeProductSnapshot({
      ...nextFormValues,
      imageUrl: initialValues?.imageUrl || "",
      images: normalizePreviewImages(initialValues?.images),
      colors: normalizedInitialColors,
    });
    setImageUrl(initialValues?.imageUrl || "");
    setProductImages(normalizePreviewImages(initialValues?.images));
    setImageUploadError("");
    setColorImageUploadError("");
    setShowColorForm(false);
    setColorDraft(createEmptyColorDraft());
    setEditingColorIndex(null);
    setMainImageFileName("Aucun fichier choisi");
    setExtraImageFileName("");
    setColorImageFileName("Aucun fichier choisi");
    setExtraColorImageFileName("");

    if (mainImageInputRef.current) {
      mainImageInputRef.current.value = "";
    }

    if (extraImageInputRef.current) {
      extraImageInputRef.current.value = "";
    }

    if (colorImageInputRef.current) {
      colorImageInputRef.current.value = "";
    }

    if (extraColorImageInputRef.current) {
      extraColorImageInputRef.current.value = "";
    }
  }, [initialValues]);

  const activeColors = useMemo(
    () => colors.filter((color) => !color.isArchived),
    [colors]
  );

  const archivedColors = useMemo(
    () => colors.filter((color) => color.isArchived),
    [colors]
  );

  const hasColors = activeColors.length > 0;

  const visualStock = useMemo(() => {
    if (!hasColors) return "";

    return activeColors.reduce((total, color) => {
      const quantity = Number(color.quantity) || 0;
      return total + quantity;
    }, 0);
  }, [activeColors, hasColors]);

  const currentStock = useMemo(() => {
    if (hasColors) {
      return Number(visualStock) || 0;
    }

    return Number(stockInputValue) || 0;
  }, [hasColors, visualStock, stockInputValue]);

  const canShowNotifyButton =
    mode === "edit" && hasPendingRestockRequests && currentStock > 0;

  const isEditingColor = editingColorIndex !== null;

  const hasColorDraftChanges = useMemo(() => {
    return Boolean(
      colorDraft.name.trim() ||
        String(colorDraft.quantity).trim() ||
        colorDraft.imageUrl.trim() ||
        (Array.isArray(colorDraft.images) && colorDraft.images.length > 0)
    );
  }, [colorDraft]);

  const hasUnsavedChanges = useMemo(() => {
    const currentSnapshot = serializeProductSnapshot({
      ...formValues,
      imageUrl,
      images: normalizePreviewImages(productImages),
      stock: hasColors ? Number(visualStock) || 0 : stockInputValue,
      colors: colors.map((color) => ({
        ...color,
        images: normalizePreviewImages(color.images),
      })),
    });

    return (
      currentSnapshot !== initialProductSnapshotRef.current || hasColorDraftChanges
    );
  }, [
    formValues,
    imageUrl,
    productImages,
    hasColors,
    visualStock,
    stockInputValue,
    colors,
    hasColorDraftChanges,
  ]);

  useEffect(() => {
    if (typeof onUnsavedChangesChange === "function") {
      onUnsavedChangesChange(hasUnsavedChanges);
    }
  }, [hasUnsavedChanges, onUnsavedChangesChange]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  function resetColorForm() {
    setColorDraft(createEmptyColorDraft());
    setEditingColorIndex(null);
    setShowColorForm(false);
    setColorImageUploadError("");
    setIsUploadingColorImage(false);
    setColorImageFileName("Aucun fichier choisi");
    setExtraColorImageFileName("");

    if (colorImageInputRef.current) {
      colorImageInputRef.current.value = "";
    }

    if (extraColorImageInputRef.current) {
      extraColorImageInputRef.current.value = "";
    }
  }

  function handleFieldChange(field, value) {
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleColorDraftChange(field, value) {
    setColorDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateColorDraftImages(nextImages, nextMainImageUrl = null) {
    const normalizedImages = normalizePreviewImages(nextImages);
    const resolvedMainImageUrl =
      nextMainImageUrl !== null
        ? nextMainImageUrl
        : normalizedImages[0]?.url || "";

    setColorDraft((prev) => ({
      ...prev,
      imageUrl: resolvedMainImageUrl,
      images: normalizedImages,
    }));
  }

  function handleValidateColor() {
    const normalizedName = colorDraft.name.trim();
    const normalizedQuantity = Math.max(0, Number(colorDraft.quantity) || 0);
    const normalizedImageUrl = colorDraft.imageUrl.trim();
    const normalizedImages = normalizePreviewImages(colorDraft.images);

    if (!normalizedName) {
      return;
    }

    const normalizedColor = {
      name: normalizedName,
      quantity: normalizedQuantity,
      imageUrl: normalizedImageUrl || normalizedImages[0]?.url || "",
      images: normalizedImages,
      isArchived: false,
      archivedAt: null,
    };

    if (isEditingColor) {
      setColors((prev) =>
        prev.map((color, index) =>
          index === editingColorIndex
            ? {
                ...color,
                ...normalizedColor,
                isArchived: false,
                archivedAt: null,
              }
            : color
        )
      );
    } else {
      setColors((prev) => [...prev, normalizedColor]);
    }

    resetColorForm();
  }

  function handleCancelColor() {
    if (hasColorDraftChanges) {
      const shouldCancel = window.confirm(
        "Les modifications de cette couleur ne sont pas enregistrées. Voulez-vous vraiment annuler ?"
      );

      if (!shouldCancel) {
        return;
      }
    }

    resetColorForm();
  }

  function handleArchiveColor(indexToArchive) {
    setColors((prev) =>
      prev.map((color, index) =>
        index === indexToArchive
          ? {
              ...color,
              isArchived: true,
              archivedAt: new Date().toISOString(),
            }
          : color
      )
    );

    if (editingColorIndex === indexToArchive) {
      resetColorForm();
      return;
    }

    if (editingColorIndex !== null && editingColorIndex > indexToArchive) {
      setEditingColorIndex((prev) => prev - 1);
    }
  }

  function handleUnarchiveColor(indexToRestore) {
    setColors((prev) =>
      prev.map((color, index) =>
        index === indexToRestore
          ? {
              ...color,
              isArchived: false,
              archivedAt: null,
            }
          : color
      )
    );
  }

  function handleRemoveArchivedColor(indexToRemove) {
    setColors((prev) => prev.filter((_, index) => index !== indexToRemove));

    if (editingColorIndex === indexToRemove) {
      resetColorForm();
      return;
    }

    if (editingColorIndex !== null && editingColorIndex > indexToRemove) {
      setEditingColorIndex((prev) => prev - 1);
    }
  }

  function handleShowColorForm() {
    if (showColorForm && hasColorDraftChanges) {
      const shouldReset = window.confirm(
        "Une couleur est en cours de modification et n’est pas enregistrée. Voulez-vous l’abandonner ?"
      );

      if (!shouldReset) {
        return;
      }
    }

    setEditingColorIndex(null);
    setColorDraft(createEmptyColorDraft());
    setShowColorForm(true);
    setColorImageUploadError("");
    setColorImageFileName("Aucun fichier choisi");
    setExtraColorImageFileName("");

    if (colorImageInputRef.current) {
      colorImageInputRef.current.value = "";
    }

    if (extraColorImageInputRef.current) {
      extraColorImageInputRef.current.value = "";
    }
  }

  function handleEditColor(index) {
    const colorToEdit = colors[index];

    if (!colorToEdit) {
      return;
    }

    if (showColorForm && hasColorDraftChanges) {
      const shouldReplace = window.confirm(
        "Une couleur en cours de modification n’est pas enregistrée. Voulez-vous l’abandonner ?"
      );

      if (!shouldReplace) {
        return;
      }
    }

    setEditingColorIndex(index);
    setColorDraft({
      name: colorToEdit.name || "",
      quantity: colorToEdit.quantity ?? "",
      imageUrl: colorToEdit.imageUrl || "",
      images: normalizePreviewImages(colorToEdit.images),
    });
    setShowColorForm(true);
    setColorImageUploadError("");
    setColorImageFileName("Aucun fichier choisi");
    setExtraColorImageFileName("");

    if (colorImageInputRef.current) {
      colorImageInputRef.current.value = "";
    }

    if (extraColorImageInputRef.current) {
      extraColorImageInputRef.current.value = "";
    }
  }

  async function uploadImageFile(file, errorMessage) {
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch("/api/admin/upload-image", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(errorMessage);
    }

    const data = await response.json();

    if (!data?.imageUrl) {
      throw new Error("Aucune URL d’image retournée par le serveur.");
    }

    return {
      imageUrl: data.imageUrl,
      publicId: data.publicId || "",
    };
  }

  async function handleMainImageUpload(event) {
    const file = event.target.files?.[0];
    setMainImageFileName(getFileLabel(file));

    if (!file) {
      return;
    }

    setImageUploadError("");
    setIsUploadingImage(true);

    try {
      const { imageUrl: uploadedImageUrl, publicId } = await uploadImageFile(
        file,
        "Échec du téléversement de l’image."
      );

      const nextImage = buildDefaultImage(uploadedImageUrl, publicId);

      setImageUrl(uploadedImageUrl);
      setProductImages((prev) => {
        const normalizedPrev = normalizePreviewImages(prev);
        const nextImages = [
          nextImage,
          ...normalizedPrev.filter((image) => image.url !== nextImage.url),
        ];

        setFormValues((current) => ({
          ...current,
          imageUrl: uploadedImageUrl,
        }));

        return nextImages;
      });
    } catch (error) {
      setImageUploadError(error.message || "Une erreur est survenue.");
    } finally {
      setIsUploadingImage(false);
    }
  }

  async function handleExtraProductImageUpload(event) {
    const file = event.target.files?.[0];
    setExtraImageFileName(getFileLabel(file));

    if (!file) {
      return;
    }

    setIsUploadingImage(true);
    setImageUploadError("");

    try {
      const { imageUrl: uploadedImageUrl, publicId } = await uploadImageFile(
        file,
        "Échec du téléversement de l’image."
      );

      const newImage = buildDefaultImage(uploadedImageUrl, publicId);

      setProductImages((prev) => {
        const normalizedPrev = normalizePreviewImages(prev);
        return [
          ...normalizedPrev.filter(
            (image) => image.url !== uploadedImageUrl
          ),
          newImage,
        ];
      });
    } catch (error) {
      setImageUploadError(error.message || "Une erreur est survenue.");
    } finally {
      setIsUploadingImage(false);

      if (event.target) {
        event.target.value = "";
      }
    }
  }

  async function handleColorImageUpload(event) {
    const file = event.target.files?.[0];
    setColorImageFileName(getFileLabel(file));

    if (!file) {
      return;
    }

    setColorImageUploadError("");
    setIsUploadingColorImage(true);

    try {
      const { imageUrl: uploadedImageUrl, publicId } = await uploadImageFile(
        file,
        "Échec du téléversement de la photo couleur."
      );

      updateColorDraftImages(
        [buildDefaultImage(uploadedImageUrl, publicId)],
        uploadedImageUrl
      );
    } catch (error) {
      setColorImageUploadError(
        error.message ||
          "Une erreur est survenue pendant le téléversement de la photo couleur."
      );
    } finally {
      setIsUploadingColorImage(false);
    }
  }

  async function handleExtraColorImageUpload(event) {
    const file = event.target.files?.[0];
    setExtraColorImageFileName(getFileLabel(file));

    if (!file) {
      return;
    }

    setColorImageUploadError("");
    setIsUploadingColorImage(true);

    try {
      const { imageUrl: uploadedImageUrl, publicId } = await uploadImageFile(
        file,
        "Échec du téléversement de la photo couleur."
      );

      const newImage = buildDefaultImage(uploadedImageUrl, publicId);

      updateColorDraftImages([
        ...normalizePreviewImages(colorDraft.images).filter(
          (image) => image.url !== uploadedImageUrl
        ),
        newImage,
      ]);
    } catch (error) {
      setColorImageUploadError(
        error.message ||
          "Une erreur est survenue pendant le téléversement de la photo couleur."
      );
    } finally {
      setIsUploadingColorImage(false);

      if (event.target) {
        event.target.value = "";
      }
    }
  }

  function handleSetMainProductImage(indexToPromote) {
    setProductImages((prev) => {
      const normalizedPrev = normalizePreviewImages(prev);
      const selectedImage = normalizedPrev[indexToPromote];

      if (!selectedImage) {
        return normalizedPrev;
      }

      setImageUrl(selectedImage.url);
      setFormValues((current) => ({
        ...current,
        imageUrl: selectedImage.url,
      }));

      return normalizedPrev;
    });
  }

  function handleUpdateProductImageCrop(indexToUpdate, updates) {
    setProductImages((prev) =>
      normalizePreviewImages(prev).map((image, index) =>
        index === indexToUpdate
          ? normalizePreviewImage({
              ...image,
              ...updates,
            })
          : image
      )
    );
  }

  function handleRemoveProductImage(indexToRemove) {
    setProductImages((prev) => {
      const normalizedPrev = normalizePreviewImages(prev);
      const nextImages = normalizedPrev.filter(
        (_, index) => index !== indexToRemove
      );
      const removedImage = normalizedPrev[indexToRemove];
      const removedWasMain = removedImage?.url === imageUrl;
      const nextMainImageUrl = removedWasMain
        ? nextImages[0]?.url || ""
        : imageUrl;

      if (removedWasMain) {
        setImageUrl(nextMainImageUrl);
        setFormValues((current) => ({
          ...current,
          imageUrl: nextMainImageUrl,
        }));
      }

      return nextImages;
    });
  }

  function handleSetMainColorImage(indexToPromote) {
    const selectedImage = normalizePreviewImages(colorDraft.images)[
      indexToPromote
    ];

    if (!selectedImage) {
      return;
    }

    updateColorDraftImages(colorDraft.images, selectedImage.url);
  }

  function handleUpdateColorImageCrop(indexToUpdate, updates) {
    updateColorDraftImages(
      normalizePreviewImages(colorDraft.images).map((image, index) =>
        index === indexToUpdate
          ? normalizePreviewImage({
              ...image,
              ...updates,
            })
          : image
      ),
      colorDraft.imageUrl
    );
  }

  function handleRemoveColorImage(indexToRemove) {
    const currentImages = normalizePreviewImages(colorDraft.images);
    const nextImages = currentImages.filter(
      (_, index) => index !== indexToRemove
    );
    const removedImage = currentImages[indexToRemove];
    const removedWasMain = removedImage?.url === colorDraft.imageUrl;
    const nextMainImageUrl = removedWasMain
      ? nextImages[0]?.url || ""
      : colorDraft.imageUrl;

    updateColorDraftImages(nextImages, nextMainImageUrl);
  }

  function handleFormSubmit(event) {
    event.preventDefault();

    if (showColorForm) {
      window.alert(
        "Une couleur est en cours de modification. Validez ou annulez cette couleur avant d’enregistrer le produit."
      );
      return;
    }

    const promoPriceValue = formValues.promoPrice?.toString().trim() || "";

    const normalizedPayloadColors = colors.map((color) => ({
      ...color,
      images: normalizePreviewImages(color.images),
    }));

    const payload = {
      name: formValues.name?.toString().trim() || "",
      category: formValues.category?.toString().trim() || "",
      price: Number(formValues.price),
      promoPrice: promoPriceValue === "" ? null : Number(promoPriceValue),
      description: formValues.description?.toString().trim() || "",
      imageUrl: imageUrl?.toString().trim() || "",
      images: normalizePreviewImages(productImages),
      stock: hasColors ? Number(visualStock) || 0 : Number(stockInputValue) || 0,
      colors: normalizedPayloadColors,
    };

    const initialColorsSnapshot = initialColorsSnapshotRef.current;

    const restockedColors =
      mode === "edit"
        ? activeColors
            .filter((color) => {
              const normalizedName = normalizeColorName(color.name);

              if (!normalizedName) {
                return false;
              }

              const newQty = Math.max(0, Number(color.quantity) || 0);
              const previousColor = initialColorsSnapshot.find(
                (prevColor) =>
                  normalizeColorName(prevColor?.name) === normalizedName
              );
              const oldQty =
                previousColor && !previousColor.isArchived
                  ? Math.max(0, Number(previousColor.quantity) || 0)
                  : 0;

              return oldQty === 0 && newQty > 0;
            })
            .map((color) => color.name.trim())
        : [];

    if (typeof onSubmit === "function") {
      onSubmit(payload, { mode, submitAction, restockedColors });
    }

    initialProductSnapshotRef.current = serializeProductSnapshot({
      ...formValues,
      imageUrl,
      images: normalizePreviewImages(productImages),
      stock: hasColors ? Number(visualStock) || 0 : stockInputValue,
      colors: normalizedPayloadColors,
    });

    if (typeof onUnsavedChangesChange === "function") {
      onUnsavedChangesChange(false);
    }
  }

  return (
    <section className={styles.wrapper}>
      <form className={styles.form} onSubmit={handleFormSubmit}>
        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="name" className={styles.label}>
              Nom du produit *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Ex : Pull tricoté main"
              className={styles.input}
              value={formValues.name}
              onChange={(e) => handleFieldChange("name", e.target.value)}
              autoComplete="off"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="category" className={styles.label}>
              Catégorie *
            </label>
            <select
              id="category"
              name="category"
              className={styles.input}
              value={formValues.category}
              onChange={(e) => handleFieldChange("category", e.target.value)}
              autoComplete="off"
              required
            >
              <option value="" disabled>
                Sélectionner une catégorie
              </option>
              <option value="Couture">Couture</option>
              <option value="Crochet">Crochet</option>
              <option value="Tricot">Tricot</option>
              <option value="Créations enfant">Créations enfant</option>
            </select>
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="price" className={styles.label}>
              Prix (€) *
            </label>
            <input
              id="price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              placeholder="Ex : 45.00"
              className={styles.input}
              value={formValues.price}
              onChange={(e) => handleFieldChange("price", e.target.value)}
              autoComplete="off"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="promoPrice" className={styles.label}>
              Prix promo (€)
              <span className={styles.optionalHint}>Optionnel</span>
            </label>
            <input
              id="promoPrice"
              name="promoPrice"
              type="number"
              min="0"
              step="0.01"
              placeholder="Ex : 35.00"
              className={styles.input}
              value={formValues.promoPrice}
              onChange={(e) => handleFieldChange("promoPrice", e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="stock" className={styles.label}>
            Stock disponible *
            {hasColors && (
              <span className={styles.stockHint}>
                (Calculé automatiquement depuis les couleurs actives)
              </span>
            )}
          </label>
          <input
            id="stock"
            name="stock"
            type="number"
            min="0"
            step="1"
            placeholder="1"
            className={styles.input}
            value={hasColors ? visualStock : stockInputValue}
            onChange={(e) => {
              if (!hasColors) {
                setStockInputValue(e.target.value);
                handleFieldChange("stock", e.target.value);
              }
            }}
            autoComplete="off"
            disabled={hasColors}
            required={!hasColors}
          />
        </div>

        <ProductImagesSection
          mainImageInputRef={mainImageInputRef}
          extraImageInputRef={extraImageInputRef}
          mainImageFileName={mainImageFileName}
          extraImageFileName={extraImageFileName}
          onMainImageButtonClick={() => mainImageInputRef.current?.click()}
          onExtraImageButtonClick={() => extraImageInputRef.current?.click()}
          onMainImageUpload={handleMainImageUpload}
          onExtraProductImageUpload={handleExtraProductImageUpload}
          isUploadingImage={isUploadingImage}
          imageUploadError={imageUploadError}
          imageUrl={imageUrl}
          onImageUrlChange={(e) => {
            setImageUrl(e.target.value);
            handleFieldChange("imageUrl", e.target.value);
          }}
          productImages={productImages}
          onRemoveProductImage={handleRemoveProductImage}
          onSetMainProductImage={handleSetMainProductImage}
          onUpdateProductImageCrop={handleUpdateProductImageCrop}
        />

        <div className={styles.field}>
          <label htmlFor="description" className={styles.label}>
            Description
          </label>
          <textarea
            id="description"
            name="description"
            placeholder="Décrivez votre création..."
            className={styles.textarea}
            rows={5}
            value={formValues.description}
            onChange={(e) => handleFieldChange("description", e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className={styles.separator} />

        <div className={styles.colorsHeader}>
          <h2 className={styles.colorsTitle}>Couleurs disponibles</h2>

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleShowColorForm}
          >
            + Ajouter une couleur
          </button>
        </div>

        <ColorFormCard
          showColorForm={showColorForm}
          isEditingColor={isEditingColor}
          colorDraft={colorDraft}
          onColorDraftChange={handleColorDraftChange}
          colorImageInputRef={colorImageInputRef}
          extraColorImageInputRef={extraColorImageInputRef}
          onColorImageButtonClick={() => colorImageInputRef.current?.click()}
          onExtraColorImageButtonClick={() =>
            extraColorImageInputRef.current?.click()
          }
          colorImageFileName={colorImageFileName}
          extraColorImageFileName={extraColorImageFileName}
          onColorImageUpload={handleColorImageUpload}
          onExtraColorImageUpload={handleExtraColorImageUpload}
          isUploadingColorImage={isUploadingColorImage}
          colorImageUploadError={colorImageUploadError}
          onValidateColor={handleValidateColor}
          onCancelColor={handleCancelColor}
          onSetMainColorImage={handleSetMainColorImage}
          onRemoveColorImage={handleRemoveColorImage}
          onUpdateColorImageCrop={handleUpdateColorImageCrop}
        />

        <ColorPreviewList
          colors={colors}
          activeColors={activeColors}
          archivedColors={archivedColors}
          onEditColor={handleEditColor}
          onArchiveColor={handleArchiveColor}
          onUnarchiveColor={handleUnarchiveColor}
          onRemoveArchivedColor={handleRemoveArchivedColor}
        />

        {canShowNotifyButton && (
          <p className={styles.stockHint}>
            Des demandes de réassort sont en attente. La notification pourra être
            déclenchée après la mise à jour du produit.
          </p>
        )}

        <div className={styles.submitArea}>
          {showColorForm ? (
            <p className={styles.stockHint}>
              Validez ou annulez la couleur en cours avant d’enregistrer le
              produit.
            </p>
          ) : null}

          {mode === "edit" ? (
            <button
              type="submit"
              className={styles.primaryButton}
              onClick={() => setSubmitAction("save")}
            >
              Mettre à jour le produit
            </button>
          ) : (
            <button type="submit" className={styles.primaryButton}>
              Ajouter le produit
            </button>
          )}
        </div>
      </form>
    </section>
  );
}