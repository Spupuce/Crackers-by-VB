// context/FavoritesContext.js

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from './AuthContext';

const FavoritesContext = createContext(null);

function sanitizeFavorites(value) {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value
        .filter((item) => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    ),
  ];
}

function areSameSlugs(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;

  return a.every((item, index) => item === b[index]);
}

async function fetchFavorites() {
  const response = await fetch('/api/account/favorites', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Impossible de charger les favoris.');
  }

  const data = await response.json();
  return sanitizeFavorites(data?.favorites);
}

async function updateFavorites(nextFavorites) {
  const response = await fetch('/api/account/favorites', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      favorites: sanitizeFavorites(nextFavorites),
    }),
  });

  if (!response.ok) {
    throw new Error('Impossible de mettre à jour les favoris.');
  }

  const data = await response.json();
  return sanitizeFavorites(data?.favorites);
}

export function FavoritesProvider({ children }) {
  const { isAuthenticated, isAuthReady } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [activeFavoriteSlugs, setActiveFavoriteSlugs] = useState([]);
  const [isFavoritesReady, setIsFavoritesReady] = useState(false);
  const [isSyncingFavorites, setIsSyncingFavorites] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function syncFavoritesFromAccount() {
      if (!isAuthReady) return;

      if (!isAuthenticated) {
        if (!isMounted) return;
        setFavorites([]);
        setActiveFavoriteSlugs([]);
        setIsFavoritesReady(true);
        return;
      }

      setIsSyncingFavorites(true);

      try {
        const nextFavorites = await fetchFavorites();

        if (!isMounted) return;

        setFavorites(nextFavorites);
        setActiveFavoriteSlugs(nextFavorites);
      } catch {
        if (!isMounted) return;

        setFavorites([]);
        setActiveFavoriteSlugs([]);
      } finally {
        if (!isMounted) return;

        setIsSyncingFavorites(false);
        setIsFavoritesReady(true);
      }
    }

    syncFavoritesFromAccount();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, isAuthReady]);

  const isFavorite = useCallback(
    (slug) => favorites.includes(slug),
    [favorites]
  );

  const persistFavorites = useCallback(
    async (nextFavorites) => {
      if (!isAuthenticated) {
        return [];
      }

      setIsSyncingFavorites(true);

      try {
        const savedFavorites = await updateFavorites(nextFavorites);
        setFavorites(savedFavorites);

        setActiveFavoriteSlugs((prevActive) => {
          const nextActive = savedFavorites.filter((slug) =>
            prevActive.includes(slug)
          );

          return areSameSlugs(prevActive, nextActive) ? prevActive : nextActive;
        });

        return savedFavorites;
      } finally {
        setIsSyncingFavorites(false);
      }
    },
    [isAuthenticated]
  );

  const addFavorite = useCallback(
    async (slug) => {
      if (!isAuthenticated || !slug || typeof slug !== 'string') return;

      const nextFavorites = sanitizeFavorites([...favorites, slug]);
      await persistFavorites(nextFavorites);

      setActiveFavoriteSlugs((prevActive) => {
        const nextActive = sanitizeFavorites([...prevActive, slug]);
        return areSameSlugs(prevActive, nextActive) ? prevActive : nextActive;
      });
    },
    [favorites, isAuthenticated, persistFavorites]
  );

  const removeFavorite = useCallback(
    async (slug) => {
      if (!isAuthenticated || !slug || typeof slug !== 'string') return;

      const nextFavorites = favorites.filter((item) => item !== slug);
      await persistFavorites(nextFavorites);

      setActiveFavoriteSlugs((prev) => prev.filter((item) => item !== slug));
    },
    [favorites, isAuthenticated, persistFavorites]
  );

  const toggleFavorite = useCallback(
    async (slug) => {
      if (!isAuthenticated || !slug || typeof slug !== 'string') return;

      const exists = favorites.includes(slug);
      const nextFavorites = exists
        ? favorites.filter((item) => item !== slug)
        : sanitizeFavorites([...favorites, slug]);

      await persistFavorites(nextFavorites);

      setActiveFavoriteSlugs((prevActive) => {
        const isCurrentlyActive = prevActive.includes(slug);
        const nextActive = isCurrentlyActive
          ? prevActive.filter((item) => item !== slug)
          : sanitizeFavorites([...prevActive, slug]);

        return areSameSlugs(prevActive, nextActive) ? prevActive : nextActive;
      });
    },
    [favorites, isAuthenticated, persistFavorites]
  );

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

  const clearFavorites = useCallback(async () => {
    if (!isAuthenticated) {
      setFavorites([]);
      setActiveFavoriteSlugs([]);
      return;
    }

    await persistFavorites([]);
    setActiveFavoriteSlugs([]);
  }, [isAuthenticated, persistFavorites]);

  const favoritesCount = favorites.length;
  const activeFavoritesCount = activeFavoriteSlugs.length;

  const value = useMemo(
    () => ({
      favorites,
      favoritesCount,
      activeFavoriteSlugs,
      activeFavoritesCount,
      isFavoritesReady,
      isSyncingFavorites,
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
      activeFavoriteSlugs,
      activeFavoritesCount,
      isFavoritesReady,
      isSyncingFavorites,
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