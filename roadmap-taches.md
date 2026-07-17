# Liste de tâches du projet

## Légende des statuts
- ✅ Terminé
- 🟡 En cours / à valider
- 🔴 À faire

---

## 1. Tunnel d’achat et commandes
- 🟡 Vérifier complètement le parcours invité : panier, checkout Stripe, retour succès / annulation, création de commande, affichage correct des données client. Reste a tester a la maison : 
                - ajout au panier puis accès à /panier avec un panier correct ;
                - création de session Stripe depuis /api/checkout/create-session ;
                - paiement test réussi avec redirection vers /commande/confirmation ;
                - passage de la commande à paymentStatus: paid via webhook ;
                - affichage correct des données cliente, des lignes de commande et du total ;
                - vidage du panier après confirmation.
- 🟡 Vérifier que les commandes payées apparaissent bien côté compte client :
            1.Préparer un compte de test
                - Créer ou utiliser un compte client de test avec une adresse email dédiée.
                - Vérifier que tu es bien connectée avec ce compte sur le site.
            2. Passer une commande complète
                - Ajouter au panier au moins un produit en stock.
                - Aller sur /panier, renseigner des coordonnées cohérentes.
                - Lancer le paiement Stripe (mode test) avec une carte de test.
                - Laisser Stripe te rediriger vers /commande/confirmation après succès.
            3. Vérifier la commande en base (si tu as un outil ou Mongo à portée)
                - Vérifier que la commande possède bien :
                    - userId = l’id de l’utilisateur connecté,
                    - paymentStatus = 'paid',
                    - status au moins preparing.
            4. Vérifier l’API compte
                - Depuis le navigateur (ou un outil type devtools / REST client), appeler /api/account/orders en étant toujours connectée.
                - Vérifier que la commande que tu viens de passer apparaît bien dans la liste JSON renvoyée.
            5. Vérifier l’affichage dans Mon compte
                - Aller sur /mon-compte.
                - Vérifier que dans “Historique de commandes” :
                    - la commande est présente,
                    - le statut affiché est cohérent (“Payée”, “En préparation”, etc.),
                    - le total et le nombre d’articles sont corrects,
                    - le clic sur la commande ouvre bien le détail dans OrderDetailsModal.
- 🔴 Tester un rejeu webhook Stripe pour valider l’anti-doublon: 
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
- 🟡 Vérifier la cohérence des frais de port entre front, session Stripe, webhook et MongoDB :
            1. Front – Panier et récapitulatif avant paiement
                - Vérifier que le montant des frais de port affiché sur la page panier correspond au mode de livraison choisi (domicile / relais / autre).
                - Vérifier que le total TTC affiché (produits + frais de port) est calculé correctement et cohérent avec la décomposition.
                - Vérifier que le mode de livraison sélectionné est clairement indiqué (libellé lisible, pas de code technique).
            2. Session Stripe – Création de la session de paiement
                - Vérifier que le montant des frais de port transmis à Stripe correspond exactement à celui affiché sur le front au moment de créer la session.
                - Vérifier que la currency utilisée pour les frais de port dans la session Stripe est bien la même que celle du site (EUR).
                - Vérifier que le total Stripe (ligne produits + shipping) correspond au total calculé côté front.
            3. Webhook Stripe – Traitement en backend
                - Vérifier que le webhook lit bien le montant total payé et le montant de shipping (si remonté) depuis Stripe.
                - Vérifier que le backend ne recalcule pas des frais de port différents de ceux utilisés dans la session Stripe.
                - Vérifier que les cas de réessai de webhook ne modifient pas les frais de port déjà enregistrés pour une commande payée.
            4. MongoDB – Enregistrement de la commande
                - Vérifier que le champ shippingAmount dans le document Order correspond au montant des frais de port affiché sur le panier et transmis à Stripe.
                - Vérifier que le totalAmount dans Order = subtotalAmount + shippingAmount avec les mêmes valeurs que celles vues sur le front.
                - Vérifier que le mode de livraison (domicile / relais /…) est stocké correctement (champ shipping.method cohérent avec la logique front).
            5. Cohérence globale et cas limites
                - Tester un scénario domicile et un scénario point relais et comparer frais de port front / Stripe / Mongo / admin.
                -  Tester un changement de mode de livraison juste avant le passage au paiement et vérifier que les frais de port suivent bien ce changement partout.
                - Vérifier le comportement en cas d’annulation ou de paiement échoué : aucune commande payée ne doit être créée avec des frais de port incohérents ou manquants.
- 🟡 Vérifier la cohérence des données entre panier, commande MongoDB, compte client et administration :
            1. Panier – Front
                - Vérifier que chaque article affiche bien : nom, couleur choisie, quantité, prix unitaire, total ligne.
                - Vérifier que le total panier (sous-total + frais de port) est exact.
                - Vérifier que la sélection de couleur est obligatoire pour les produits à variantes et qu’elle est bien reflétée dans le panier.
            2. Commande en MongoDB – Modèle Order
                - Vérifier que la commande enregistrée contient bien :
                - La liste des items avec productId, name, slug, color, quantity, unitPrice, imageUrl.
                - Les champs subtotalAmount, shippingAmount, totalAmount, paymentStatus, status, shipping.method, shipping.carrier, shipping.trackingNumber.
                - Vérifier que les quantités et couleurs des items correspondent exactement à ce qui était dans le panier.
                - Vérifier que le client (invité ou connecté) est bien rattaché via userId quand connecté, ou via customer.email pour un invité.
            3. Compte client – API /api/account/orders + page mon-compte
                - Vérifier que l’API ne renvoie que des commandes avec paymentStatus: 'paid' pour le compte client.
                - Vérifier que pour une commande test :
                - L’ID / numéro de commande affiché côté compte client correspond à celui enregistré en Mongo.
                - Le nombre d’articles et les totaux (ligne, total commande) sont identiques à ceux de la commande Mongo.
                - La couleur des produits est bien affichée dans la modale de détail (OrderDetailsModal).
                - Vérifier qu’un invité qui crée un compte ensuite retrouve bien ses commandes payées via l’email (logique userId / customer.email).
            4. Administration – API /api/admin/orders + page administration/commandes
                - Vérifier qu’une commande payée apparaît bien dans la liste admin avec :
                    - Le bon statut de paiement (paid / pending / autre).
                    - Le bon statut de commande (pending / preparing / shipped / delivered).
                    - Le bon total et le bon mode de paiement.
                - Vérifier que la fiche détaillée admin affiche :
                    - Les mêmes articles que le panier (quantité, couleur, prix unitaire, total ligne).
                    - Les mêmes frais de port que dans Mongo.
                    - La même adresse de livraison que celle saisie côté front.
                - Vérifier qu’un changement de statut ou de suivi transporteur en admin ne casse pas la cohérence avec les données Mongo (le document Order est mis à jour correctement).
            5. Comparaison transversale – Panier ↔ Mongo ↔ Compte ↔ Admin
            - Pour une commande test (utilisateur connecté puis une commande invité rattachable par email) :
                - Comparer article par article :
                    - Nom du produit.
                    - Couleur.
                    - Quantité.
                    - Prix unitaire.
                    - Total ligne.
                - Comparer les totaux :
                    - Sous-total.
                    - Frais de port.
                    - Total TTC.
                - Vérifier que :
                    - Ce qui est vu dans le panier avant paiement = ce qui est enregistré dans Mongo.
                    - Ce qui est vu dans le compte client = ce qui est enregistré dans Mongo pour les commandes payées.
                    - Ce qui est vu dans l’admin = ce qui est enregistré dans Mongo, pour les mêmes commandes.
- 🟡 Définir clairement les cas d’erreur visibles côté cliente pendant le paiement.

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