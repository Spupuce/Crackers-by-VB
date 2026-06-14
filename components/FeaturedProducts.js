import Link from 'next/link';
import {
  getActiveProductPrice,
  getProductBasePrice,
  getProductStatus,
  hasValidPromoPrice,
  isSoldOut,
} from '../utils/product';
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
            const hasPromo = hasValidPromoPrice(product);
            const activePrice = getActiveProductPrice(product);
            const basePrice = getProductBasePrice(product);

            return (
              <article
                className={styles.card}
                key={product._id || product.slug}
              >
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
                        <div className={styles.priceBlock}>
                          {hasPromo ? (
                            <>
                              <span className={styles.priceOld}>
                                {basePrice.toFixed(2)} €
                              </span>
                              <span className={styles.pricePromo}>
                                {activePrice.toFixed(2)} €
                              </span>
                            </>
                          ) : (
                            <span className={styles.price}>
                              {basePrice.toFixed(2)} €
                            </span>
                          )}
                        </div>

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
          <Link href="/boutique" passHref>
            <a className={styles.shopButton}>Voir toute la boutique</a>
          </Link>
        </div>
      </div>
    </section>
  );
}