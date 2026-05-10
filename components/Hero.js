// components/Hero.js
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
          <button className={styles.primaryButton}>
            Découvrir mes créations
          </button>

          <button className={styles.secondaryButton}>
            Me contacter
          </button>
        </div>
      </div>
    </section>
  );
}