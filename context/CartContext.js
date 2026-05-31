// context/CartContext.js

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);
const CART_STORAGE_KEY = 'crackers-by-vb-cart';

function normalizeCartItem(input) {
  if (!input || typeof input !== 'object') return null;

  const slug =
    typeof input.slug === 'string' && input.slug.trim()
      ? input.slug.trim()
      : '';
  const name =
    typeof input.name === 'string' && input.name.trim()
      ? input.name.trim()
      : '';
  const price = Number(input.price);
  const stock = Number(input.stock);
  const quantity = Number(input.quantity);
  const imageUrl =
    typeof input.imageUrl === 'string' && input.imageUrl.trim()
      ? input.imageUrl.trim()
      : '';
  const category =
    typeof input.category === 'string' && input.category.trim()
      ? input.category.trim()
      : '';

  if (!slug || !name || Number.isNaN(price)) return null;

  return {
    slug,
    name,
    price,
    stock: Number.isNaN(stock) ? null : Math.max(0, stock),
    quantity: Number.isNaN(quantity) ? 1 : Math.max(0, Math.floor(quantity)),
    imageUrl,
    category,
  };
}

function sanitizeStoredCartItems(input) {
  if (!Array.isArray(input)) return [];

  return input.reduce((accumulator, item) => {
    const normalizedItem = normalizeCartItem(item);

    if (!normalizedItem) {
      return accumulator;
    }

    const safeQuantity =
      normalizedItem.stock === null
        ? normalizedItem.quantity
        : Math.min(normalizedItem.quantity, normalizedItem.stock);

    if (safeQuantity <= 0) {
      return accumulator;
    }

    accumulator.push({
      ...normalizedItem,
      quantity: safeQuantity,
    });

    return accumulator;
  }, []);
}

function buildCartSyncSignature(cartItems) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return '[]';
  }

  return JSON.stringify(
    cartItems
      .map((item) => ({
        slug: item.slug,
        quantity: item.quantity,
      }))
      .sort((a, b) => a.slug.localeCompare(b.slug))
  );
}

export function CartProvider({ children }) {
  const { user, isAuthenticated, isAuthReady } = useAuth();

  const [items, setItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [hasHydratedCart, setHasHydratedCart] = useState(false);

  const hasInitializedAuthCartRef = useRef(false);
  const isLoadingServerCartRef = useRef(false);
  const previousIsAuthenticatedRef = useRef(false);
  const lastSyncedSignatureRef = useRef('[]');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const storedValue = window.localStorage.getItem(CART_STORAGE_KEY);

      if (!storedValue) {
        setHasHydratedCart(true);
        return;
      }

      const parsedItems = JSON.parse(storedValue);
      const sanitizedItems = sanitizeStoredCartItems(parsedItems);

      setItems(sanitizedItems);
    } catch (error) {
      console.error('Impossible de relire le panier sauvegardé.', error);
    } finally {
      setHasHydratedCart(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !hasHydratedCart || isAuthenticated) {
      return;
    }

    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Impossible de sauvegarder le panier.', error);
    }
  }, [items, hasHydratedCart, isAuthenticated]);

  useEffect(() => {
    if (!isAuthReady || !hasHydratedCart) {
      return;
    }

    const wasAuthenticated = previousIsAuthenticatedRef.current;
    previousIsAuthenticatedRef.current = isAuthenticated;

    if (!isAuthenticated) {
      hasInitializedAuthCartRef.current = false;
      isLoadingServerCartRef.current = false;
      lastSyncedSignatureRef.current = '[]';

      if (wasAuthenticated) {
        setItems([]);
      }

      return;
    }

    if (hasInitializedAuthCartRef.current) {
      return;
    }

    hasInitializedAuthCartRef.current = true;

    async function loadServerCart() {
      try {
        isLoadingServerCartRef.current = true;

        const response = await fetch('/api/cart', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            data?.message || 'Impossible de récupérer le panier utilisateur.'
          );
        }

        const nextItems = sanitizeStoredCartItems(data?.items);
        lastSyncedSignatureRef.current = buildCartSyncSignature(nextItems);
        setItems(nextItems);
      } catch (error) {
        console.error(error);
        lastSyncedSignatureRef.current = '[]';
        setItems([]);
      } finally {
        isLoadingServerCartRef.current = false;
      }
    }

    loadServerCart();
  }, [isAuthenticated, isAuthReady, hasHydratedCart, user?.id]);

  useEffect(() => {
    if (!isAuthReady || !hasHydratedCart || !isAuthenticated) {
      return;
    }

    if (!hasInitializedAuthCartRef.current || isLoadingServerCartRef.current) {
      return;
    }

    const currentSignature = buildCartSyncSignature(items);

    if (currentSignature === lastSyncedSignatureRef.current) {
      return;
    }

    let isCancelled = false;

    async function syncServerCart() {
      try {
        const payload = {
          items: items.map((item) => ({
            slug: item.slug,
            quantity: item.quantity,
          })),
        };

        const response = await fetch('/api/cart', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            data?.message || 'Impossible de synchroniser le panier utilisateur.'
          );
        }

        if (isCancelled) {
          return;
        }

        const resolvedItems = sanitizeStoredCartItems(data?.items);
        const resolvedSignature = buildCartSyncSignature(resolvedItems);

        lastSyncedSignatureRef.current = resolvedSignature;
        setItems(resolvedItems);
      } catch (error) {
        console.error(error);
      }
    }

    syncServerCart();

    return () => {
      isCancelled = true;
    };
  }, [items, isAuthenticated, isAuthReady, hasHydratedCart]);

  const openCart = useCallback(() => {
    setIsCartOpen(true);
  }, []);

  const closeCart = useCallback(() => {
    setIsCartOpen(false);
  }, []);

  const toggleCart = useCallback(() => {
    setIsCartOpen((prev) => !prev);
  }, []);

  const addToCart = useCallback((product, quantity = 1) => {
    const normalizedProduct = normalizeCartItem(product);
    const qty = Number(quantity) || 1;

    if (!normalizedProduct || qty <= 0) return;

    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (item) => item.slug === normalizedProduct.slug
      );

      if (existingIndex === -1) {
        const nextQuantity =
          normalizedProduct.stock === null
            ? qty
            : Math.min(qty, normalizedProduct.stock);

        if (nextQuantity <= 0) {
          return prevItems;
        }

        return [
          ...prevItems,
          {
            ...normalizedProduct,
            quantity: nextQuantity,
          },
        ];
      }

      const nextItems = [...prevItems];
      const existing = nextItems[existingIndex];
      const mergedStock =
        normalizedProduct.stock === null ? existing.stock : normalizedProduct.stock;

      const nextQuantity =
        mergedStock === null
          ? existing.quantity + qty
          : Math.min(existing.quantity + qty, mergedStock);

      nextItems[existingIndex] = {
        ...existing,
        ...normalizedProduct,
        stock: mergedStock,
        quantity: nextQuantity,
      };

      return nextItems;
    });
  }, []);

  const removeFromCart = useCallback((slug) => {
    if (!slug || typeof slug !== 'string') return;

    setItems((prevItems) => prevItems.filter((item) => item.slug !== slug));
  }, []);

  const updateItemQuantity = useCallback((slug, nextQuantity) => {
    const qty = Number(nextQuantity);

    if (!slug || typeof slug !== 'string' || Number.isNaN(qty)) return;

    setItems((prevItems) => {
      if (qty <= 0) {
        return prevItems.filter((item) => item.slug !== slug);
      }

      return prevItems.map((item) => {
        if (item.slug !== slug) {
          return item;
        }

        const cappedQuantity =
          item.stock === null ? qty : Math.min(qty, item.stock);

        return {
          ...item,
          quantity: cappedQuantity,
        };
      });
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const cartCount = useMemo(
    () => items.reduce((sum, item) => sum + (item.quantity || 0), 0),
    [items]
  );

  const cartTotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + item.price * (item.quantity || 0),
        0
      ),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      isCartOpen,
      cartCount,
      cartTotal,
      addToCart,
      removeFromCart,
      updateItemQuantity,
      clearCart,
      openCart,
      closeCart,
      toggleCart,
    }),
    [
      items,
      isCartOpen,
      cartCount,
      cartTotal,
      addToCart,
      removeFromCart,
      updateItemQuantity,
      clearCart,
      openCart,
      closeCart,
      toggleCart,
    ]
  );

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);

  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }

  return ctx;
}