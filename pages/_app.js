// pages/_app.js
import { FavoritesProvider } from '../context/FavoritesContext';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <FavoritesProvider>
      <Component {...pageProps} />
    </FavoritesProvider>
  );
}