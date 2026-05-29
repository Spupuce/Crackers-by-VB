// context/CartContext.js

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

const CartContext = createContext(null);

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
    imageUrl,
    category,
  };
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

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