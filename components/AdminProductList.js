import { useEffect, useState } from 'react';
import AdminProductRow from './AdminProductRow';
import styles from '../styles/AdminStock.module.css';

export default function AdminProductList({
  products,
  onArchive,
  onDelete,
  onUnarchive,
  onEdit,
  onProductUpdated,
}) {
  const [items, setItems] = useState(products || []);

  useEffect(() => {
    setItems(products || []);
  }, [products]);

  const handleProductUpdatedLocal = (updatedProduct) => {
    setItems((prev) =>
      prev.map((item) => (item._id === updatedProduct._id ? updatedProduct : item))
    );

    if (typeof onProductUpdated === 'function') {
      onProductUpdated(updatedProduct);
    }
  };

  const handleProductRemoved = (removedProductId) => {
    setItems((prev) => prev.filter((item) => item._id !== removedProductId));
  };

  return (
    <div className={styles.list}>
      {items.map((product) => (
        <AdminProductRow
          key={product._id}
          product={product}
          onArchive={onArchive}
          onDelete={onDelete}
          onUnarchive={onUnarchive}
          onEdit={onEdit}
          onProductUpdated={handleProductUpdatedLocal}
          onProductRemoved={handleProductRemoved}
        />
      ))}
    </div>
  );
}