// context/FavoritesContext.js

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = window.localStorage.getItem('crackers-favorites');

    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setFavorites(parsed);
      }
    } catch {
      setFavorites([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem('crackers-favorites', JSON.stringify(favorites));
  }, [favorites]);

  const isFavorite = (slug) => favorites.includes(slug);

  const toggleFavorite = (slug) => {
    setFavorites((prev) =>
      prev.includes(slug)
        ? prev.filter((item) => item !== slug)
        : [...prev, slug]
    );
  };

  const value = useMemo(
    () => ({
      favorites,
      isFavorite,
      toggleFavorite,
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