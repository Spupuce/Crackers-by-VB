// lib/services/slugService.js

export function slugify(value = '') {
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function generateUniqueSlug({
  model,
  value,
  currentId = null,
}) {
  if (!model) {
    throw new Error('Le modèle est requis pour générer un slug unique.');
  }

  const baseSlug = slugify(value);

  if (!baseSlug) {
    throw new Error('Impossible de générer un slug valide à partir de cette valeur.');
  }

  let candidateSlug = baseSlug;
  let counter = 1;

  while (true) {
    const existingProduct = await model.findOne({
      slug: candidateSlug,
      ...(currentId ? { _id: { $ne: currentId } } : {}),
    }).lean();

    if (!existingProduct) {
      return candidateSlug;
    }

    counter += 1;
    candidateSlug = `${baseSlug}-${counter}`;
  }
}