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
  const [stockInputValue, setStockInputValue] = useState(
    initialValues?.stock ?? ""
  );

  const [colors, setColors] = useState(
    initialValues?.colors && Array.isArray(initialValues.colors)
      ? sanitizeColors(initialValues.colors)
      : []
  );

  const initialColorsSnapshotRef = useRef(sanitizeColors(initialValues?.colors));

  useEffect(() => {
    const normalizedInitialColors =
      initialValues?.colors && Array.isArray(initialValues.colors)
        ? sanitizeColors(initialValues.colors)
        : [];

    setColors(normalizedInitialColors);
    setStockInputValue(initialValues?.stock ?? "");
    initialColorsSnapshotRef.current = sanitizeColors(normalizedInitialColors);
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

  function resetColorForm() {
    setColorDraft(createEmptyColorDraft());
    setEditingColorIndex(null);
    setShowColorForm(false);
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
    setEditingColorIndex(null);
    setColorDraft(createEmptyColorDraft());
    setShowColorForm(true);
  }

  function handleEditColor(index) {
    const colorToEdit = colors[index];

    if (!colorToEdit) {
      return;
    }

    setEditingColorIndex(index);
    setColorDraft({
      name: colorToEdit.name || "",
      quantity: colorToEdit.quantity ?? "",
      imageUrl: colorToEdit.imageUrl || "",
    });
    setShowColorForm(true);
  }

  function handleFormSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const promoPriceValue = formData.get("promoPrice")?.toString().trim() || "";

    const payload = {
      name: formData.get("name")?.toString().trim() || "",
      category: formData.get("category")?.toString().trim() || "",
      price: Number(formData.get("price")),
      promoPrice: promoPriceValue === "" ? null : Number(promoPriceValue),
      description: formData.get("description")?.toString().trim() || "",
      imageUrl: formData.get("imageUrl")?.toString().trim() || "",
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
              defaultValue={initialValues?.name || ""}
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
              defaultValue={initialValues?.category || ""}
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
              defaultValue={initialValues?.price ?? ""}
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
              defaultValue={initialValues?.promoPrice ?? ""}
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
              }
            }}
            autoComplete="off"
            disabled={hasColors}
            required={!hasColors}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="imageUrl" className={styles.label}>
            URL de l’image *
          </label>
          <input
            id="imageUrl"
            name="imageUrl"
            type="url"
            placeholder="https://..."
            className={styles.input}
            defaultValue={initialValues?.imageUrl || ""}
            autoComplete="url"
            required
          />
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
            defaultValue={initialValues?.description || ""}
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

              <div className={styles.field}>
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

            <div className={styles.colorActions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleValidateColor}
              >
                {isEditingColor ? "Mettre à jour" : "Valider"}
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