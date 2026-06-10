// components/Header.js

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  FiSearch,
  FiHeart,
  FiUser,
  FiShoppingCart,
  FiMenu,
  FiX,
  FiLogOut,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { useCart } from '../context/CartContext';
import CartDrawer from '../components/CartDrawer';
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

  const router = useRouter();
  const { isAuthenticated, isAdmin, isAuthReady, logout } = useAuth();
  const { favoritesCount, isFavoritesReady } = useFavorites();
  const { cartCount, isCartOpen, closeCart, toggleCart } = useCart();

  const safeProducts = Array.isArray(products) ? products : [];
  const isAdminView = isAuthReady && isAdmin;
  const isCustomerView = isAuthReady && isAuthenticated && !isAdmin;
  const isVisitorView = isAuthReady && !isAuthenticated;

  const closeMenu = () => setMenuOpen(false);
  const accountHref = isAuthenticated ? '/mon-compte' : '/connexion';
  const displayedFavoritesCount =
    isCustomerView && isFavoritesReady ? favoritesCount : 0;

  const navigationItems = isAdminView
    ? [
        { href: '/', label: 'Accueil', disabled: false },
        { href: '/boutique', label: 'Boutique', disabled: false },
        { href: '/administration/stock', label: 'Stock', disabled: false },
        {
          href: '/administration/commandes',
          label: 'Commandes',
          disabled: false,
        },
        {
          href: null,
          label: 'Fiches clients',
          disabled: true,
          disabledLabel: 'Bientôt disponible',
        },
      ]
    : [
        { href: '/', label: 'Accueil', disabled: false },
        { href: '/boutique', label: 'Boutique', disabled: false },
        { href: '/apropos', label: 'À propos', disabled: false },
        { href: '/contact', label: 'Contact', disabled: false },
      ];

  function handleToggleSearch() {
    setSearchOpen((prev) => !prev);
    setMenuOpen(false);
    closeCart();
  }

  function handleCloseSearch() {
    setSearchOpen(false);
    setSearchTerm('');
  }

  function handleToggleCart() {
    toggleCart();
    setMenuOpen(false);
    handleCloseSearch();
  }

  function handleLogout() {
    closeMenu();
    handleCloseSearch();
    closeCart();
    logout();
    router.push('/');
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
        closeCart();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [searchOpen, closeCart]);

  useEffect(() => {
    setMenuOpen(false);
    handleCloseSearch();
    closeCart();
  }, [router.asPath, closeCart]);

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

        const normalizedName = normalizeValue(product.name);
        const normalizedCategory = normalizeValue(product.category);
        const normalizedSlug = normalizeValue(product.slug);
        const normalizedDescription = normalizeValue(product.description);

        return (
          normalizedName.includes(normalizedSearch) ||
          normalizedCategory.includes(normalizedSearch) ||
          normalizedSlug.includes(normalizedSearch) ||
          normalizedDescription.includes(normalizedSearch)
        );
      })
      .slice(0, 6);
  }, [safeProducts, searchTerm]);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.container}>
          <Link href="/" legacyBehavior>
            <a className={styles.logo}>Crackers by VB</a>
          </Link>

          <nav
            id="header-navigation"
            className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`}
            aria-label={isAdminView ? 'Navigation administratrice' : 'Navigation principale'}
          >
            {navigationItems.map((item) => {
              if (item.disabled) {
                return (
                  <span
                    key={item.label}
                    className={styles.navItemDisabled}
                    aria-disabled="true"
                    title={item.disabledLabel || 'Indisponible'}
                  >
                    <span>{item.label}</span>
                    {item.disabledLabel ? (
                      <small className={styles.navItemHint}>{item.disabledLabel}</small>
                    ) : null}
                  </span>
                );
              }

              return (
                <Link key={item.href + item.label} href={item.href} legacyBehavior>
                  <a onClick={closeMenu}>{item.label}</a>
                </Link>
              );
            })}

            {isAdminView && (
              <button
                type="button"
                className={styles.mobileLogoutButton}
                onClick={handleLogout}
              >
                <FiLogOut aria-hidden="true" />
                <span>Déconnexion</span>
              </button>
            )}
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

              {(isCustomerView || isVisitorView || !isAuthReady) && (
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
              )}

              {(isCustomerView || isVisitorView || !isAuthReady) && (
                <Link href={accountHref} legacyBehavior>
                  <a
                    className={styles.iconButton}
                    aria-label="Mon compte"
                    onClick={closeMenu}
                  >
                    <FiUser aria-hidden="true" />
                  </a>
                </Link>
              )}

              {(isCustomerView || isVisitorView || !isAuthReady) && (
                <button
                  className={styles.iconButton}
                  aria-label="Panier"
                  aria-expanded={isCartOpen}
                  type="button"
                  onClick={handleToggleCart}
                >
                  <FiShoppingCart aria-hidden="true" />
                  {cartCount > 0 && <span className={styles.badge}>{cartCount}</span>}
                </button>
              )}

              {isAdminView && (
                <button
                  type="button"
                  className={styles.logoutButton}
                  onClick={handleLogout}
                >
                  <FiLogOut aria-hidden="true" />
                  <span>Déconnexion</span>
                </button>
              )}
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

      {!isAdminView && <CartDrawer isOpen={isCartOpen} onClose={closeCart} />}
    </>
  );
}