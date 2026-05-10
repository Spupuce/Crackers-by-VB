import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const FavoritesContext = createContext(null);

function sanitizeFavorites(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item) => typeof item === 'string' && item.trim()))];
}

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = window.localStorage.getItem('crackers-favorites');

    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      setFavorites(sanitizeFavorites(parsed));
    } catch {
      setFavorites([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(
      'crackers-favorites',
      JSON.stringify(sanitizeFavorites(favorites))
    );
  }, [favorites]);

  const isFavorite = (slug) => favorites.includes(slug);

  const addFavorite = (slug) => {
    if (!slug || typeof slug !== 'string') return;
    setFavorites((prev) => sanitizeFavorites([...prev, slug]));
  };

  const removeFavorite = (slug) => {
    setFavorites((prev) => prev.filter((item) => item !== slug));
  };

  const toggleFavorite = (slug) => {
    if (!slug || typeof slug !== 'string') return;

    setFavorites((prev) =>
      prev.includes(slug)
        ? prev.filter((item) => item !== slug)
        : sanitizeFavorites([...prev, slug])
    );
  };

  const syncWithActiveProductSlugs = (activeSlugs) => {
    const safeSlugs = Array.isArray(activeSlugs)
      ? activeSlugs.filter((slug) => typeof slug === 'string' && slug.trim())
      : [];

    setFavorites((prev) => prev.filter((slug) => safeSlugs.includes(slug)));
  };

  const clearFavorites = () => {
    setFavorites([]);
  };

  const value = useMemo(
    () => ({
      favorites,
      favoritesCount: favorites.length,
      isFavorite,
      addFavorite,
      removeFavorite,
      toggleFavorite,
      syncWithActiveProductSlugs,
      clearFavorites,
    }),
    [favorites]
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);

  if (!ctx) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }

  return ctx;
}