// context/AuthContext.js

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const AuthContext = createContext(null);

const STORAGE_KEY = 'crackers-user';

function sanitizeCart(cart) {
  if (!Array.isArray(cart)) {
    return [];
  }

  return cart.reduce((accumulator, item) => {
    if (!item || typeof item !== 'object') {
      return accumulator;
    }

    const slug =
      typeof item.slug === 'string' && item.slug.trim() ? item.slug.trim() : '';
    const quantity = Number(item.quantity);
    const addedAt =
      typeof item.addedAt === 'string' || item.addedAt instanceof Date
        ? item.addedAt
        : null;

    if (!slug || Number.isNaN(quantity) || quantity <= 0) {
      return accumulator;
    }

    accumulator.push({
      slug,
      quantity: Math.max(1, Math.floor(quantity)),
      addedAt: addedAt || null,
    });

    return accumulator;
  }, []);
}

function sanitizeUser(value) {
  if (!value || typeof value !== 'object') return null;

  const id =
    typeof value.id === 'string' && value.id.trim() ? value.id.trim() : '';
  const firstName =
    typeof value.firstName === 'string' && value.firstName.trim()
      ? value.firstName.trim()
      : '';
  const lastName =
    typeof value.lastName === 'string' && value.lastName.trim()
      ? value.lastName.trim()
      : '';
  const email =
    typeof value.email === 'string' && value.email.trim()
      ? value.email.trim().toLowerCase()
      : '';
  const phone = typeof value.phone === 'string' ? value.phone.trim() : '';
  const addressLine1 =
    typeof value.addressLine1 === 'string' ? value.addressLine1.trim() : '';
  const addressLine2 =
    typeof value.addressLine2 === 'string' ? value.addressLine2.trim() : '';
  const postalCode =
    typeof value.postalCode === 'string' ? value.postalCode.trim() : '';
  const city = typeof value.city === 'string' ? value.city.trim() : '';
  const country =
    typeof value.country === 'string' && value.country.trim()
      ? value.country.trim()
      : 'France';
  const role =
    value.role === 'admin' || value.role === 'customer'
      ? value.role
      : 'customer';
  const cart = sanitizeCart(value.cart);

  if (!id || !email) return null;

  return {
    id,
    firstName,
    lastName,
    email,
    phone,
    addressLine1,
    addressLine2,
    postalCode,
    city,
    country,
    role,
    cart,
  };
}

function persistUser(user) {
  if (typeof window === 'undefined') {
    return;
  }

  if (user) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

async function fetchCurrentUser() {
  const response = await fetch('/api/auth/profile', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Impossible de récupérer la session utilisateur.');
  }

  const data = await response.json();
  return sanitizeUser(data?.user);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const login = useCallback((nextUser) => {
    const sanitizedUser = sanitizeUser(nextUser);
    persistUser(sanitizedUser);
    setUser(sanitizedUser);
  }, []);

  const logout = useCallback(() => {
    persistUser(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((nextUser) => {
    setUser((previousUser) => {
      const mergedUser = sanitizeUser({
        ...previousUser,
        ...nextUser,
      });

      persistUser(mergedUser);
      return mergedUser;
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let isMounted = true;

    const storedUser = window.localStorage.getItem(STORAGE_KEY);

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        const sanitizedStoredUser = sanitizeUser(parsedUser);

        if (sanitizedStoredUser) {
          setUser(sanitizedStoredUser);
        } else {
          persistUser(null);
        }
      } catch {
        persistUser(null);
        setUser(null);
      }
    }

    async function syncAuthFromServer() {
      try {
        const currentUser = await fetchCurrentUser();

        if (!isMounted) {
          return;
        }

        setUser(currentUser);
        persistUser(currentUser);
      } catch {
        if (!isMounted) {
          return;
        }

        setUser(null);
        persistUser(null);
      } finally {
        if (!isMounted) {
          return;
        }

        setIsAuthReady(true);
      }
    }

    syncAuthFromServer();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
      isAuthReady,
      login,
      logout,
      updateUser,
    }),
    [user, isAuthReady, login, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return ctx;
}