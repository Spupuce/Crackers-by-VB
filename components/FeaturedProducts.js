// components/FeaturedProducts.js

import Link from 'next/link';
import { getProductStatus, isSoldOut } from '../utils/product';
import styles from '../styles/FeaturedProducts.module.css';

export default function FeaturedProducts({ products = [] }) {
  const safeProducts = Array.isArray(products) ? products : [];

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.heading}>
          <h2 className={styles.title}>
            Produits les plus <span>demandés</span>
          </h2>
          <p className={styles.subtitle}>
            Chaque pièce est unique et créée avec passion et perfectionnisme
          </p>
        </div>

        <div className={styles.grid}>
          {safeProducts.map((product) => {
            const status = getProductStatus(product);
            const soldOut = isSoldOut(product);

            return (
              <article className={styles.card} key={product._id || product.slug}>
                <Link href={`/boutique/${product.slug}`} passHref>
                  <a className={styles.cardLink}>
                    <div className={styles.imageWrapper}>
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className={styles.image}
                      />
                      {soldOut ? (
                        <span className={styles.badge}>{status.label}</span>
                      ) : null}
                    </div>

                    <div className={styles.infos}>
                      <h3 className={styles.productName}>{product.name}</h3>
                      <p className={styles.category}>{product.category}</p>

                      <div className={styles.meta}>
                        <span className={styles.price}>
                          {Number(product.price).toFixed(2)} €
                        </span>
                        {!soldOut ? (
                          <span className={styles.stock}>{status.label}</span>
                        ) : null}
                      </div>
                    </div>
                  </a>
                </Link>
              </article>
            );
          })}
        </div>

        <div className={styles.buttonWrapper}>
          <Link href="/boutique" passHref><a className={styles.shopButton}>Voir toute la boutique</a></Link>
        </div>
      </div>
    </section>
  );
}