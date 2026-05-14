// context/AuthContext.js

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

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
  const phone =
    typeof value.phone === 'string' ? value.phone.trim() : '';
  const addressLine1 =
    typeof value.addressLine1 === 'string' ? value.addressLine1.trim() : '';
  const addressLine2 =
    typeof value.addressLine2 === 'string' ? value.addressLine2.trim() : '';
  const postalCode =
    typeof value.postalCode === 'string' ? value.postalCode.trim() : '';
  const city =
    typeof value.city === 'string' ? value.city.trim() : '';
  const country =
    typeof value.country === 'string' && value.country.trim()
      ? value.country.trim()
      : 'France';
  const role =
    value.role === 'admin' || value.role === 'customer'
      ? value.role
      : 'customer';

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
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedUser = window.localStorage.getItem('crackers-user');

    if (!storedUser) {
      setIsAuthReady(true);
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      setUser(sanitizeUser(parsedUser));
    } catch {
      setUser(null);
      window.localStorage.removeItem('crackers-user');
    } finally {
      setIsAuthReady(true);
    }
  }, []);

  const login = (nextUser) => {
    const sanitizedUser = sanitizeUser(nextUser);

    if (typeof window !== 'undefined') {
      if (sanitizedUser) {
        window.localStorage.setItem(
          'crackers-user',
          JSON.stringify(sanitizedUser)
        );
      } else {
        window.localStorage.removeItem('crackers-user');
      }
    }

    setUser(sanitizedUser);
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('crackers-user');
    }

    setUser(null);
  };

  const updateUser = (nextUser) => {
    setUser((previousUser) => {
      const mergedUser = sanitizeUser({
        ...previousUser,
        ...nextUser,
      });

      if (typeof window !== 'undefined') {
        if (mergedUser) {
          window.localStorage.setItem(
            'crackers-user',
            JSON.stringify(mergedUser)
          );
        } else {
          window.localStorage.removeItem('crackers-user');
        }
      }

      return mergedUser;
    });
  };

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
    [user, isAuthReady]
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