# Lancer le projet 
yarn dev

# Liste de tâches du projet

## Légende des statuts
- ✅ Terminé
- 🟡 En cours / à valider
- 🔴 À faire

---

## 1. Divers

- ✅Empecher l'admin de mettre des favoris et des choses dans le panier (bouton inactif par exemple)
- 🔴Dans la gestion de stock mettre à jour la photo doit supprimer les anciennes photos sur cloudinary
- 

## 2. Administration et suivi transporteur

- 🟡 Interroger l’API transporteur au clic, mettre à jour automatiquement `delivered` et renseigner `shipping.deliveredAt`.
- 🟡 Vérifier la cohérence entre `status`, `shippedAt`, `deliveredAt`, `trackingNumber`, `trackingUrl` et le retour transporteur.
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
- 🔴 Envoyer un email à contact@crackersbyvbfr.wodo0523.odns.fr lorsqu’une nouvelle commande est payée.
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


                1. Identifier une commande déjà payée
                - Prendre une commande test déjà marquée paymentStatus = 'paid' et avec un stock bien décrémenté.
                2. Rejouer le webhook dans Stripe
                - Depuis le dashboard Stripe, aller dans la section Webhooks.
                - Rejouer l’événement checkout.session.completed lié à cette commande sur l’URL de webhook de ton site.
                3. Observer les logs côté serveur
                - Vérifier que STRIPE_CHECKOUT_SESSION_COMPLETED_PROCESSED apparaît bien.
                - Vérifier que les logs éventuels de décrémentation de stock ne montrent pas de décrément une seconde fois.
                4. Vérifier la commande en base après rejeu
                - Contrôler que :
                    - paymentStatus reste paid,
                    - status reste preparing ou évolue normalement,
                    - les quantités des produits concernés n’ont pas été décrémentées une deuxième fois.
                5. Vérifier l’email de confirmation
                - Si l’email de confirmation est actif, vérifier qu’aucun email supplémentaire n’a été renvoyé lors du rejeu webhook (ou accepter un log signalant que l’email n’est pas renvoyé en double).
