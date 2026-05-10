/* components/AdminProductList.js */

import AdminProductRow from './AdminProductRow';
import styles from '../styles/AdminStock.module.css';

export default function AdminProductList({ products }) {
  return (
    <div className={styles.list}>
      {products.map((product) => (
        <AdminProductRow key={product._id} product={product} />
      ))}
    </div>
  );
}