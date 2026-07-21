// components/ProductForm.js
import { useEffect, useMemo, useRef, useState } from "react";
import { FiArchive, FiEdit2, FiTrash2 } from "react-icons/fi";
import styles from "../styles/AdminProductForm.module.css";

function createEmptyColorDraft() {
  return {
    name: "",
    quantity: "",
    imageUrl: "",
  };
}

function normalizeColorName(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function sanitizeColors(colors) {
  if (!Array.isArray(colors)) {
    return [];
  }

  return colors.map((color) => ({
    name: color?.name || "",
    quantity: Math.max(0, Number(color?.quantity) || 0),
    imageUrl: color?.imageUrl || "",
    isArchived: Boolean(color?.isArchived),
    archivedAt: color?.isArchived
      ? color?.archivedAt || new Date().toISOString()
      : null,
  }));
}

function buildInitialFormValues(initialValues) {
  return {
    name: initialValues?.name || "",
    category: initialValues?.category || "",
    price: initialValues?.price ?? "",
    promoPrice: initialValues?.promoPrice ?? "",
    description: initialValues?.description || "",
    imageUrl: initialValues?.imageUrl || "",
    stock: initialValues?.stock ?? "",
  };
}

function serializeProductSnapshot(values) {
  return JSON.stringify({
    name: values.name || "",
    category: values.category || "",
    price: values.price === "" ? "" : Number(values.price),
    promoPrice:
      values.promoPrice === "" || values.promoPrice === null
        ? ""
        : Number(values.promoPrice),
    description: values.description || "",
    imageUrl: values.imageUrl || "",
    stock: values.stock === "" ? "" : Number(values.stock),
    colors: sanitizeColors(values.colors || []),
  });
}

export default function ProductForm({
  mode = "create",
  initialValues = null,
  onSubmit,
  hasPendingRestockRequests = false,
}) {
  const [showColorForm, setShowColorForm] = useState(false);
  const [colorDraft, setColorDraft] = useState(createEmptyColorDraft());
  const [editingColorIndex, setEditingColorIndex] = useState(null);
  const [submitAction, setSubmitAction] = useState("save");

  const [formValues, setFormValues] = useState(buildInitialFormValues(initialValues));
  const [stockInputValue, setStockInputValue] = useState(
    initialValues?.stock ?? ""
  );

  const [colors, setColors] = useState(
    initialValues?.colors && Array.isArray(initialValues.colors)
      ? sanitizeColors(initialValues.colors)
      : []
  );

  const initialColorsSnapshotRef = useRef(sanitizeColors(initialValues?.colors));
  const initialProductSnapshotRef = useRef(
    serializeProductSnapshot({
      ...buildInitialFormValues(initialValues),
      colors: sanitizeColors(initialValues?.colors),
    })
  );

  const [imageUrl, setImageUrl] = useState(initialValues?.imageUrl || "");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");

  const [isUploadingColorImage, setIsUploadingColorImage] = useState(false);
  const [colorImageUploadError, setColorImageUploadError] = useState("");

  useEffect(() => {
    const normalizedInitialColors =
      initialValues?.colors && Array.isArray(initialValues.colors)
        ? sanitizeColors(initialValues.colors)
        : [];

    const nextFormValues = buildInitialFormValues(initialValues);

    setColors(normalizedInitialColors);
    setFormValues(nextFormValues);
    setStockInputValue(initialValues?.stock ?? "");
    initialColorsSnapshotRef.current = sanitizeColors(normalizedInitialColors);
    initialProductSnapshotRef.current = serializeProductSnapshot({
      ...nextFormValues,
      colors: normalizedInitialColors,
    });
    setImageUrl(initialValues?.imageUrl || "");
    setImageUploadError("");
    setColorImageUploadError("");
    setShowColorForm(false);
    setColorDraft(createEmptyColorDraft());
    setEditingColorIndex(null);
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
        colorDraft.imageUrl.trim()
    );
  }, [colorDraft]);

  const hasUnsavedChanges = useMemo(() => {
    const currentSnapshot = serializeProductSnapshot({
      ...formValues,
      imageUrl,
      stock: hasColors ? Number(visualStock) || 0 : stockInputValue,
      colors,
    });

    return (
      currentSnapshot !== initialProductSnapshotRef.current || hasColorDraftChanges
    );
  }, [
    formValues,
    imageUrl,
    hasColors,
    visualStock,
    stockInputValue,
    colors,
    hasColorDraftChanges,
  ]);

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

  function handleValidateColor() {
    const normalizedName = colorDraft.name.trim();
    const normalizedQuantity = Math.max(0, Number(colorDraft.quantity) || 0);
    const normalizedImageUrl = colorDraft.imageUrl.trim();

    if (!normalizedName) {
      return;
    }

    const normalizedColor = {
      name: normalizedName,
      quantity: normalizedQuantity,
      imageUrl: normalizedImageUrl,
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
    });
    setShowColorForm(true);
    setColorImageUploadError("");
  }

  async function handleMainImageUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setImageUploadError("");
    setIsUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        setImageUploadError("Échec du téléversement de l’image.");
        setIsUploadingImage(false);
        return;
      }

      const data = await response.json();

      if (!data?.imageUrl) {
        setImageUploadError("Aucune URL d’image retournée par le serveur.");
        setIsUploadingImage(false);
        return;
      }

      setImageUrl(data.imageUrl);
      setFormValues((prev) => ({
        ...prev,
        imageUrl: data.imageUrl,
      }));
    } catch (error) {
      setImageUploadError("Une erreur est survenue pendant le téléversement.");
    } finally {
      setIsUploadingImage(false);
    }
  }

  async function handleColorImageUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setColorImageUploadError("");
    setIsUploadingColorImage(true);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        setColorImageUploadError("Échec du téléversement de la photo couleur.");
        setIsUploadingColorImage(false);
        return;
      }

      const data = await response.json();

      if (!data?.imageUrl) {
        setColorImageUploadError(
          "Aucune URL d’image retournée pour la photo couleur."
        );
        setIsUploadingColorImage(false);
        return;
      }

      setColorDraft((prev) => ({
        ...prev,
        imageUrl: data.imageUrl,
      }));
    } catch (error) {
      setColorImageUploadError(
        "Une erreur est survenue pendant le téléversement de la photo couleur."
      );
    } finally {
      setIsUploadingColorImage(false);
    }
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

    const payload = {
      name: formValues.name?.toString().trim() || "",
      category: formValues.category?.toString().trim() || "",
      price: Number(formValues.price),
      promoPrice: promoPriceValue === "" ? null : Number(promoPriceValue),
      description: formValues.description?.toString().trim() || "",
      imageUrl: imageUrl?.toString().trim() || "",
      stock: hasColors ? Number(visualStock) || 0 : Number(stockInputValue) || 0,
      colors,
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
      stock: hasColors ? Number(visualStock) || 0 : stockInputValue,
      colors,
    });
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

        <div className={styles.field}>
          <label className={styles.label}>Image principale *</label>

          <div className={styles.imageFieldRow}>
            <div className={styles.imageUploadColumn}>
              <input
                id="mainImageFile"
                name="mainImageFile"
                type="file"
                accept="image/*"
                className={styles.fileInput}
                onChange={handleMainImageUpload}
              />

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
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  handleFieldChange("imageUrl", e.target.value);
                }}
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

        {showColorForm && (
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
                  onChange={(e) =>
                    handleColorDraftChange("name", e.target.value)
                  }
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
                  onChange={(e) =>
                    handleColorDraftChange("quantity", e.target.value)
                  }
                  autoComplete="off"
                />
              </div>
            </div>

            <div className={styles.imageFieldRow}>
              <div className={styles.imageUploadColumn}>
                <label htmlFor="colorImageFile" className={styles.smallLabel}>
                  Téléverser une photo couleur
                </label>
                <input
                  id="colorImageFile"
                  name="colorImageFile"
                  type="file"
                  accept="image/*"
                  className={styles.fileInput}
                  onChange={handleColorImageUpload}
                />

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
                  onChange={(e) =>
                    handleColorDraftChange("imageUrl", e.target.value)
                  }
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
                onClick={handleValidateColor}
              >
                {isEditingColor ? "Mettre à jour la couleur" : "Ajouter la couleur"}
              </button>

              <button
                type="button"
                className={styles.outlineButton}
                onClick={handleCancelColor}
              >
                Annuler
              </button>
            </div>
          </div>
        )}

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
                      onClick={() => handleEditColor(realIndex)}
                      aria-label={`Modifier la couleur ${color.name}`}
                      title={`Modifier la couleur ${color.name}`}
                    >
                      <FiEdit2 />
                    </button>

                    <button
                      type="button"
                      className={styles.colorPreviewArchive}
                      onClick={() => handleArchiveColor(realIndex)}
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
                        onClick={() => handleUnarchiveColor(realIndex)}
                        aria-label={`Désarchiver la couleur ${color.name}`}
                        title={`Désarchiver la couleur ${color.name}`}
                      >
                        Désarchiver
                      </button>

                      <button
                        type="button"
                        className={styles.colorPreviewDelete}
                        onClick={() => handleRemoveArchivedColor(realIndex)}
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

        {canShowNotifyButton && (
          <p className={styles.stockHint}>
            Des demandes de réassort sont en attente. La notification pourra être
            déclenchée après la mise à jour du produit.
          </p>
        )}

        <div className={styles.submitArea}>
          {showColorForm ? (
            <p className={styles.stockHint}>
              Validez ou annulez la couleur en cours avant d’enregistrer le produit.
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