// components/Header.js

import { useState } from 'react';
import Link from 'next/link';
import {
  FiSearch,
  FiHeart,
  FiUser,
  FiShoppingCart,
  FiMenu,
  FiX,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import styles from '../styles/Header.module.css';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const { favoritesCount } = useFavorites();

  const closeMenu = () => setMenuOpen(false);
  const accountHref = isAuthenticated ? '/mon-compte' : '/connexion';

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" legacyBehavior>
          <a className={styles.logo}>Crackers by VB</a>
        </Link>

        <nav
          id="header-navigation"
          className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`}
          aria-label="Navigation principale"
        >
          <Link href="/" legacyBehavior>
            <a onClick={closeMenu}>Accueil</a>
          </Link>

          <Link href="/boutique" legacyBehavior>
            <a onClick={closeMenu}>Boutique</a>
          </Link>

          <Link href="/apropos" legacyBehavior>
            <a onClick={closeMenu}>À propos</a>
          </Link>

          <Link href="/contact" legacyBehavior>
            <a onClick={closeMenu}>Contact</a>
          </Link>
        </nav>

        <div className={styles.rightBlock}>
          <div className={styles.actions}>
            <button
              className={styles.iconButton}
              aria-label="Rechercher"
              type="button"
            >
              <FiSearch aria-hidden="true" />
            </button>

            <Link href="/favoris" legacyBehavior>
              <a
                className={styles.iconButton}
                aria-label="Mes favoris"
                onClick={closeMenu}
              >
                <FiHeart aria-hidden="true" />
                {favoritesCount > 0 && (
                  <span className={styles.badge}>{favoritesCount}</span>
                )}
              </a>
            </Link>

            <Link href={accountHref} legacyBehavior>
              <a
                className={styles.iconButton}
                aria-label="Mon compte"
                onClick={closeMenu}
              >
                <FiUser aria-hidden="true" />
              </a>
            </Link>

            <button
              className={styles.iconButton}
              aria-label="Panier"
              type="button"
            >
              <FiShoppingCart aria-hidden="true" />
              <span className={styles.badge}>0</span>
            </button>
          </div>

          <button
            type="button"
            className={styles.menuButton}
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={menuOpen}
            aria-controls="header-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <FiX aria-hidden="true" /> : <FiMenu aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  );
}