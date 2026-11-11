// pages/api/admin/orders/seed.js

// Route de génération de commandes de test désactivée.
// L'ancien code reste consultable dans l'historique Git si besoin.

export default function handler(req, res) {
  return res.status(404).json({
    ok: false,
    message: 'Route introuvable.',
  });
}