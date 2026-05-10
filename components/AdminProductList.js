// components/AdminProductList.js

import { useEffect, useState } from 'react';
import AdminProductRow from './AdminProductRow';
import styles from '../styles/AdminStock.module.css';

export default function AdminProductList({
  products,
  onArchive,
  onDelete,
  onUnarchive,
  onEdit,
}) {
  const [items, setItems] = useState(products || []);

  useEffect(() => {
    setItems(products || []);
  }, [products]);

  const handleProductUpdated = (updatedProduct) => {
    setItems((prev) =>
      prev.map((item) =>
        item._id === updatedProduct._id ? updatedProduct : item
      )
    );
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
          onProductUpdated={handleProductUpdated}
          onProductRemoved={handleProductRemoved}
        />
      ))}
    </div>
  );
}