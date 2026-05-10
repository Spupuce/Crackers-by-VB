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
import { useFavorites } from '../context/FavoritesContext';
import styles from '../styles/Header.module.css';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { favorites } = useFavorites();

  const closeMenu = () => setMenuOpen(false);
  const favoritesCount = favorites.length;

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" passHref>
          <a className={styles.logo}>Crackers by VB</a>
        </Link>

        <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`}>
          <Link href="/" passHref>
            <a onClick={closeMenu}>Accueil</a>
          </Link>

          <Link href="/boutique" passHref>
            <a onClick={closeMenu}>Boutique</a>
          </Link>

          <Link href="/apropos" passHref>
            <a onClick={closeMenu}>À propos</a>
          </Link>

          <Link href="/contact" passHref>
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
              <FiSearch />
            </button>

            <Link href="/favoris" passHref>
              <a
                className={styles.iconButton}
                aria-label="Mes favoris"
              >
                <FiHeart />
                {favoritesCount > 0 && (
                  <span className={styles.badge}>{favoritesCount}</span>
                )}
              </a>
            </Link>

            <Link href="/connexion" passHref>
              <a className={styles.iconButton} aria-label="Mon compte">
                <FiUser />
              </a>
            </Link>

            <button
              className={styles.iconButton}
              aria-label="Panier"
              type="button"
            >
              <FiShoppingCart />
              <span className={styles.badge}>0</span>
            </button>
          </div>

          <button
            type="button"
            className={styles.menuButton}
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </div>
    </header>
  );
}