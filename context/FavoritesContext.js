// context/FavoritesContext.js

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const FavoritesContext = createContext(null);

function sanitizeFavorites(value) {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value.filter((item) => typeof item === 'string' && item.trim())
    ),
  ];
}

function areSameSlugs(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;

  return a.every((item, index) => item === b[index]);
}

function getStoredFavorites() {
  if (typeof window === 'undefined') return [];

  try {
    const stored = window.localStorage.getItem('crackers-favorites');

    if (!stored) return [];

    return sanitizeFavorites(JSON.parse(stored));
  } catch {
    return [];
  }
}

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState([]);
  const [activeFavoriteSlugs, setActiveFavoriteSlugs] = useState([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const storedFavorites = getStoredFavorites();

    setFavorites(storedFavorites);
    setActiveFavoriteSlugs(storedFavorites);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated || typeof window === 'undefined') return;

    window.localStorage.setItem(
      'crackers-favorites',
      JSON.stringify(sanitizeFavorites(favorites))
    );
  }, [favorites, isHydrated]);

  const isFavorite = useCallback(
    (slug) => favorites.includes(slug),
    [favorites]
  );

  const addFavorite = useCallback((slug) => {
    if (!slug || typeof slug !== 'string') return;

    setFavorites((prev) => {
      const next = sanitizeFavorites([...prev, slug]);
      return areSameSlugs(prev, next) ? prev : next;
    });

    setActiveFavoriteSlugs((prevActive) => {
      const nextActive = sanitizeFavorites([...prevActive, slug]);
      return areSameSlugs(prevActive, nextActive) ? prevActive : nextActive;
    });
  }, []);

  const removeFavorite = useCallback((slug) => {
    if (!slug || typeof slug !== 'string') return;

    setFavorites((prev) => prev.filter((item) => item !== slug));
    setActiveFavoriteSlugs((prev) => prev.filter((item) => item !== slug));
  }, []);

  const toggleFavorite = useCallback((slug) => {
    if (!slug || typeof slug !== 'string') return;

    setFavorites((prev) => {
      const exists = prev.includes(slug);
      const next = exists
        ? prev.filter((item) => item !== slug)
        : sanitizeFavorites([...prev, slug]);

      return areSameSlugs(prev, next) ? prev : next;
    });

    setActiveFavoriteSlugs((prevActive) => {
      const exists = prevActive.includes(slug);
      const nextActive = exists
        ? prevActive.filter((item) => item !== slug)
        : sanitizeFavorites([...prevActive, slug]);

      return areSameSlugs(prevActive, nextActive) ? prevActive : nextActive;
    });
  }, []);

  const syncWithActiveProductSlugs = useCallback(
    (activeSlugs) => {
      const safeSlugs = sanitizeFavorites(activeSlugs);
      const nextActiveFavorites = favorites.filter((slug) =>
        safeSlugs.includes(slug)
      );

      setActiveFavoriteSlugs((prev) =>
        areSameSlugs(prev, nextActiveFavorites) ? prev : nextActiveFavorites
      );
    },
    [favorites]
  );

  const clearFavorites = useCallback(() => {
    setFavorites([]);
    setActiveFavoriteSlugs([]);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('crackers-favorites', JSON.stringify([]));
    }
  }, []);

  const favoritesCount = activeFavoriteSlugs.length;

  const value = useMemo(
    () => ({
      favorites,
      favoritesCount,
      isFavorite,
      addFavorite,
      removeFavorite,
      toggleFavorite,
      syncWithActiveProductSlugs,
      clearFavorites,
    }),
    [
      favorites,
      favoritesCount,
      isFavorite,
      addFavorite,
      removeFavorite,
      toggleFavorite,
      syncWithActiveProductSlugs,
      clearFavorites,
    ]
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