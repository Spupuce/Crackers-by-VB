// components/Footer.js

import Link from 'next/link';
import styles from '../styles/Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.top}>
          <div className={styles.column}>
            <h3 className={styles.title}>Crackers by VB</h3>
            <p className={styles.text}>
              Créations artisanales fait main avec passion
            </p>
          </div>

          <div className={styles.column}>
            <h3 className={styles.title}>Liens rapides</h3>
            <nav className={styles.links}>
              <Link href="/apropos" passHref>
                <a>À propos</a>
              </Link>

              <Link href="/boutique" passHref>
                <a>Boutique</a>
              </Link>

              <Link href="/contact" passHref>
                <a>Contact</a>
              </Link>

              <Link href="/administration" passHref>
                <a>Administration</a>
              </Link>
            </nav>
          </div>

          <div className={styles.column}>
            <h3 className={styles.title}>Légal</h3>
            <nav className={styles.links}>
              <Link href="/mentions-legales" passHref>
                <a>Mentions légales</a>
              </Link>

              <Link href="/cgv" passHref>
                <a>CGV</a>
              </Link>

              <Link href="/confidentialite" passHref>
                <a>Confidentialité</a>
              </Link>
            </nav>
          </div>
        </div>

        <div className={styles.contactBlock}>
          <h3 className={styles.title}>Contact</h3>
          <a href="mailto:vbeninca74@outlook.fr" className={styles.mail}>
            vbeninca74@outlook.fr
          </a>
        </div>

        <div className={styles.bottom}>
          <p>© 2026 Crackers by VB - Virginie. Tous droits réservés.</p>
          <p className={styles.credit}>
            Fait avec 💛 par <span className={styles.creditBrand}>Sciez Dev Lab</span>
          </p>
        </div>
      </div>
    </footer>
  );
}