// components/ProductForm.js

import { useMemo, useState } from "react";
import styles from "../styles/AdminProductForm.module.css";

export default function ProductForm({
  mode = "create",
  initialValues = null,
  onSubmit,
}) {
  const [showColorForm, setShowColorForm] = useState(false);
  const [colorDraft, setColorDraft] = useState({
    name: "",
    quantity: "",
    imageUrl: "",
  });

  const [colors, setColors] = useState(
    initialValues?.colors && Array.isArray(initialValues.colors)
      ? initialValues.colors
      : [],
  );

  const hasColors = colors.length > 0;

  const visualStock = useMemo(() => {
    if (!hasColors) return "";
    return colors.reduce((total, color) => {
      const quantity = Number(color.quantity) || 0;
      return total + quantity;
    }, 0);
  }, [colors, hasColors]);

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

    const newColor = {
      name: normalizedName,
      quantity: normalizedQuantity,
      imageUrl: normalizedImageUrl,
    };

    setColors((prev) => [...prev, newColor]);
    setColorDraft({
      name: "",
      quantity: "",
      imageUrl: "",
    });
    setShowColorForm(false);
  }

  function handleCancelColor() {
    setColorDraft({
      name: "",
      quantity: "",
      imageUrl: "",
    });
    setShowColorForm(false);
  }

  function handleRemoveColor(indexToRemove) {
    setColors((prev) => prev.filter((_, index) => index !== indexToRemove));
  }

  function handleShowColorForm() {
    setShowColorForm(true);
  }

  function handleFormSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const payload = {
      name: formData.get("name")?.toString().trim() || "",
      category: formData.get("category")?.toString().trim() || "",
      price: Number(formData.get("price")),
      description: formData.get("description")?.toString().trim() || "",
      imageUrl: formData.get("imageUrl")?.toString().trim() || "",
      stock: hasColors ? visualStock : Number(formData.get("stock")),
      colors,
    };

    if (typeof onSubmit === "function") {
      onSubmit(payload, { mode });
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
              required
            />
          </div>

          <div className={styles.fieldEmpty} />
        </div>

        <div className={styles.field}>
          <label htmlFor="stock" className={styles.label}>
            Stock disponible *
            {hasColors && (
              <span className={styles.stockHint}>
                (Calculé automatiquement depuis les couleurs)
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
            defaultValue={initialValues?.stock ?? ""}
            value={hasColors ? visualStock : undefined}
            onChange={() => {}}
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
                />
              </div>
            </div>

            <div className={styles.colorActions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleValidateColor}
              >
                Valider
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

        {colors.length > 0 && (
          <div className={styles.colorPreviewList}>
            {colors.map((color, index) => (
              <div
                key={`${color.name}-${index}`}
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

                <button
                  type="button"
                  className={styles.colorPreviewDelete}
                  onClick={() => handleRemoveColor(index)}
                >
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        )}

        <div className={styles.submitArea}>
          <button type="submit" className={styles.primaryButton}>
            {mode === "edit"
              ? "Mettre à jour le produit"
              : "Ajouter le produit"}
          </button>
        </div>
      </form>
    </section>
  );
}
