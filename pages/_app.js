// pages/_app.js

import { AuthProvider } from '../context/AuthContext';
import { FavoritesProvider } from '../context/FavoritesContext';
import { CartProvider } from '../context/CartContext';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <CartProvider>
          <Component {...pageProps} />
        </CartProvider>
      </FavoritesProvider>
    </AuthProvider>
  );
}