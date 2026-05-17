import { useEffect, useMemo, useRef, useState } from 'react';
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

function normalizeValue(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export default function Header({ products = [] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);

  const { isAuthenticated } = useAuth();
  const { favoritesCount, isFavoritesReady } = useFavorites();

  const safeProducts = Array.isArray(products) ? products : [];

  const closeMenu = () => setMenuOpen(false);
  const accountHref = isAuthenticated ? '/mon-compte' : '/connexion';
  const displayedFavoritesCount =
    isAuthenticated && isFavoritesReady ? favoritesCount : 0;

  function handleToggleSearch() {
    setSearchOpen((prev) => !prev);
    setMenuOpen(false);
  }

  function handleCloseSearch() {
    setSearchOpen(false);
    setSearchTerm('');
  }

  useEffect(() => {
    if (!searchOpen) {
      return;
    }

    searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        searchOpen &&
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      ) {
        handleCloseSearch();
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        handleCloseSearch();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [searchOpen]);

  const filteredResults = useMemo(() => {
    const normalizedSearch = normalizeValue(searchTerm);

    if (!normalizedSearch) {
      return [];
    }

    return safeProducts
      .filter((product) => {
        if (!product || typeof product !== 'object') {
          return false;
        }

        const searchFields = [
          product.name,
          product.category,
          product.slug,
          product.description,
        ]
          .map((field) => normalizeValue(field))
          .filter(Boolean);

        return searchFields.some((field) => field.includes(normalizedSearch));
      })
      .slice(0, 6);
  }, [safeProducts, searchTerm]);

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
            <div ref={searchContainerRef} className={styles.searchContainer}>
              <button
                className={`${styles.iconButton} ${
                  searchOpen ? styles.iconButtonActive : ''
                }`}
                aria-label="Rechercher"
                aria-expanded={searchOpen}
                aria-controls="header-search-panel"
                type="button"
                onClick={handleToggleSearch}
              >
                <FiSearch aria-hidden="true" />
              </button>

              {searchOpen && (
                <>
                  <button
                    type="button"
                    className={styles.searchBackdrop}
                    aria-label="Fermer la recherche"
                    onClick={handleCloseSearch}
                  />

                  <div
                    id="header-search-panel"
                    className={styles.searchPanel}
                    role="dialog"
                    aria-label="Recherche de produits"
                  >
                    <div className={styles.searchInputRow}>
                      <FiSearch
                        aria-hidden="true"
                        className={styles.searchInputIcon}
                      />

                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Rechercher une création..."
                        className={styles.searchInput}
                      />
                    </div>

                    <div className={styles.searchResults}>
                      {!searchTerm.trim() ? (
                        <p className={styles.searchMessage}>
                          Tape un nom de produit ou une catégorie.
                        </p>
                      ) : filteredResults.length === 0 ? (
                        <p className={styles.searchMessage}>
                          Aucun produit trouvé.
                        </p>
                      ) : (
                        filteredResults.map((product) => (
                          <Link
                            key={product._id || product.slug}
                            href={`/boutique/${product.slug}`}
                            legacyBehavior
                          >
                            <a
                              className={styles.searchResultItem}
                              onClick={handleCloseSearch}
                            >
                              <div className={styles.searchResultImageWrapper}>
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className={styles.searchResultImage}
                                />
                              </div>

                              <div className={styles.searchResultContent}>
                                <span className={styles.searchResultName}>
                                  {product.name}
                                </span>
                                <span className={styles.searchResultCategory}>
                                  {product.category}
                                </span>
                              </div>

                              <span className={styles.searchResultPrice}>
                                {Number(product.price).toFixed(2)} €
                              </span>
                            </a>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <Link href="/favoris" legacyBehavior>
              <a
                className={styles.iconButton}
                aria-label="Mes favoris"
                onClick={closeMenu}
              >
                <FiHeart aria-hidden="true" />
                {displayedFavoritesCount > 0 && (
                  <span className={styles.badge}>{displayedFavoritesCount}</span>
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