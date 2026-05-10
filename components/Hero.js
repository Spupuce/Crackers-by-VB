// components/Hero.js
import Link from 'next/link';
import styles from '../styles/Hero.module.css';

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.content}>
        <h1 className={styles.title}>Créations artisanales</h1>

        <p className={styles.subtitle}>
          Tricots, couture, sacs et valisettes pour enfants. Chaque création est
          unique et réalisée avec passion.
        </p>

        <div className={styles.actions}>
          <Link href="/boutique" legacyBehavior>
            <a className={styles.primaryButton}>Découvrir mes créations</a>
          </Link>

          <Link href="/contact" legacyBehavior>
            <a className={styles.secondaryButton}>Me contacter</a>
          </Link>
        </div>
      </div>
    </section>
  );
}