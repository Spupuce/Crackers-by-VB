// pages/_app.js

import { AuthProvider } from '../context/AuthContext';
import { FavoritesProvider } from '../context/FavoritesContext';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <Component {...pageProps} />
      </FavoritesProvider>
    </AuthProvider>
  );
}