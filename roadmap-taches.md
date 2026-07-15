# Liste de tâches du projet

## Légende des statuts
- ✅ Terminé
- 🟡 En cours / à valider
- 🔴 À faire

---

## 1. Tunnel d’achat et commandes
- 🔴 Vérifier complètement le parcours invité : panier, checkout Stripe, retour succès / annulation, création de commande, affichage correct des données client.
- 🔴 Vérifier que les commandes payées apparaissent bien côté compte client.
- 🔴 Tester un rejeu webhook Stripe pour valider l’anti-doublon.
- 🔴 Vérifier la cohérence des frais de port entre front, session Stripe, webhook et MongoDB.
- 🔴 Vérifier la cohérence des données entre panier, commande MongoDB, compte client et administration.
- 🔴 Définir clairement les cas d’erreur visibles côté cliente pendant le paiement.

## 2. Administration et suivi transporteur
- 🔴 Vérifier la compatibilité entre commandes seedées et commandes MongoDB réelles.
- 🔴 Harmoniser les statuts réels de commande / paiement avec les filtres et libellés admin.
- 🔴 Étendre le suivi transporteur à Colissimo et Chronopost.
- 🔴 Ajouter un bouton admin `Actualiser le suivi` sur les commandes expédiées.
- 🔴 Interroger l’API transporteur au clic, mettre à jour automatiquement `delivered` et renseigner `shipping.deliveredAt`.
- 🔴 Vérifier la cohérence entre `status`, `shippedAt`, `deliveredAt`, `trackingNumber`, `trackingUrl` et le retour transporteur.
- 🟡 Définir le comportement si le transporteur ne renvoie rien, renvoie une erreur, ou remonte un statut ambigu.
- 🟡 Définir si l’email client `Livrée` doit devenir automatique ou rester manuel.

## 3. Compte, connexion et sécurité
- 🔴 Revoir la logique favoris / connexion : empêcher le `like` hors connexion et demander la connexion proprement.
- 🔴 Vérifier tout le flux inscription / connexion / redirection / déconnexion.
- 🔴 Retravailler la page `mon-compte`.
- 🔴 Mettre en place un vrai compte administratrice sécurisé.
- 🔴 Vérifier les protections d’accès admin côté front et côté API.
- 🔴 Contrôler les comportements en cas de session expirée, accès refusé ou requête invalide.

## 4. Boutique, panier et fiches produit
- 🔴 Finaliser le panier avec la maquette cible.
- 🔴 Gérer proprement la livraison domicile / point relais dans le panier et la commande.
- 🔴 Bloquer clairement les commandes hors France.
- 🔴 Corriger la recherche pour qu’elle mène vers de vrais résultats exploitables.
- 🔴 Ajouter sur les fiches produit : matières, entretien, fabrication, délai de préparation / expédition.
- 🔴 Indiquer clairement si le produit est en stock, en petite série ou fabriqué à la commande.
- 🔴 Ajouter des signaux de confiance visibles sur les fiches produit et dans le panier.
- 🟡 Définir si l’option cadeau à 5€ avec message personnalisé est retenue.

## 5. Emails et réassurance
- 🔴 Vérifier la délivrabilité réelle des emails transactionnels sur Gmail.
- 🔴 Harmoniser les emails de confirmation, expédition et livraison.
- 🔴 Ajouter le lien de suivi dans les emails de commande quand il est disponible.
- 🟡 Définir quels emails restent manuels et lesquels deviennent automatiques.
- 🔴 Vérifier la cohérence entre emails de contact, emails de commande et emails de retour en stock.
- 🔴 Afficher clairement les moyens de paiement, les infos livraison / retours et un contact rassurant.
- 🟡 Définir si la boutique affiche des avis clients.

## 6. Qualité, audit et déploiement
- 🔴 Vérifier la cohérence visuelle globale et l’utilisation correcte des variables de couleur.
- 🔴 Faire une passe complète de tests : boutique, fiche produit, panier, connexion, inscription, compte, favoris, administration, mobile et desktop.
- 🔴 Vérifier les formulaires, messages d’erreur, cas limites et robustesse front / back / API.
- 🔴 Faire un audit UX, un audit logique métier et un audit accessibilité de base.
- 🟡 Finaliser la configuration email de domaine (`SPF`, `DKIM`, `DMARC`) avec une politique propre.
- 🔴 Préparer la production sur o2switch, reporter les variables d’environnement et refaire un test complet post-déploiement.