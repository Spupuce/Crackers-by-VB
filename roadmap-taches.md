# Liste de tâches du projet

## 1. Administration et navigation admin

### 1.1 Revoir la navigation pour les comptes admin
- Mettre en place une navbar spécifique admin avec : Accueil, Boutique, Stock, Commandes, Fiche client.
- Permettre à l’admin de naviguer sur le site comme un client tout en gardant un accès clair à l’espace de gestion.
- Définir précisément le comportement selon le rôle connecté : visiteur, client, admin.

### 1.2 Rendre la navigation cohérente avec l’état de connexion
- Afficher les bons liens selon le rôle.
- Vérifier les redirections après connexion admin.
- Prévoir les futures pages `/administration/commandes` et `/administration/clients` (ou équivalent) avant d’ajouter les liens définitifs.

### 1.3 Finaliser l’administration
- Consolider la page stock.
- Vérifier les actions admin sur produits actifs / archivés.
- Préparer ensuite l’espace commandes et fiche client.

## 2. Produits, stock et promotions

### 2.1 Ajouter le prix promo dans l’administration produit
- Ajouter un champ `prix promo` à droite du prix dans le formulaire produit.
- Définir si la valeur est optionnelle et comment elle est stockée en base.
- Vérifier l’impact sur la création, l’édition, l’affichage admin et les API produits.

### 2.2 Gérer l’affichage promo côté front
- Si un prix promo est renseigné, afficher le prix normal barré en noir et le prix promo en rouge.
- Vérifier cet affichage sur la page boutique, la fiche produit et toutes les cartes produit concernées.
- S’assurer que les calculs restent cohérents partout.

### 2.3 Ajouter le filtre “prix promo” sur la boutique
- Permettre de filtrer uniquement les produits en promotion.
- Vérifier la compatibilité avec les autres filtres existants.
- Décider si le filtrage reste dynamique ou passe par un bouton d’application global.

## 3. Paiement et commandes

### 3.1 Mettre en place Stripe proprement
- Intégrer les clés de test déjà récupérées dans les variables d’environnement locales.
- Vérifier que la clé secrète est utilisée uniquement côté serveur.
- Configurer les URLs de retour `success` et `cancel` de manière cohérente avec `/panier`.
- Créer le webhook Stripe de test.
- Écouter au minimum `checkout.session.completed`.
- Vérifier qu’un paiement test Stripe redirige correctement vers le site.

### 3.2 Stocker les commandes en base
- Brancher la création de commande via le webhook Stripe.
- Enregistrer les lignes produits commandées avec quantité, prix unitaire, total et image utile à l’historique.
- Lier la commande à l’utilisateur connecté.
- Éviter les doublons si Stripe renvoie plusieurs événements.
- Tester qu’une commande validée crée bien une entrée MongoDB exploitable.

### 3.3 Construire une vraie simulation d’achat de bout en bout
- Se connecter avec un compte utilisateur de test.
- Vérifier l’ajout au panier, l’accès à `/panier` et à `/mon-compte`.
- Tester le flux de paiement succès.
- Tester le flux d’annulation.
- Vérifier la logique panier / compte / commandes après retour Stripe.
- Vérifier le comportement non connecté.
- Vérifier les erreurs serveur Stripe / API.

## 4. Compte utilisateur et données liées

### 4.1 Supprimer proprement les données liées aux comptes utilisateurs
- Recenser les données liées à un utilisateur : profil, favoris, panier serveur, commandes futures, demandes éventuelles liées au compte.
- Vérifier ce qui est déjà supprimé aujourd’hui dans MongoDB et ce qui reste orphelin.
- Ajouter la suppression des commandes quand le modèle `Order` sera réellement branché.
- Tester la suppression complète avec un compte de test.

### 4.2 Vérifier la cohérence des données visibles
- Vérifier qu’aucune donnée supprimée ne reste visible sur `mon-compte`, favoris ou panier.
- Contrôler la cohérence entre compte, favoris, panier et commandes.

## 5. Qualité, audit et déploiement

### 5.1 Faire une passe complète de tests du site
- Tester boutique, fiche produit, panier, connexion, inscription, compte, favoris et administration.
- Vérifier la cohérence du stock partout.
- Vérifier les favoris sur produits archivés.
- Vérifier les formulaires et messages d’erreur.
- Vérifier les comportements mobile / desktop.
- Dresser une liste précise des bugs restants.

### 5.2 Auditer le site
- Audit UX du parcours achat.
- Audit logique métier : stock, panier, favoris, compte, admin.
- Audit cohérence front/back/API.
- Audit accessibilité de base : labels, focus, lisibilité, messages d’erreur.
- Audit robustesse : cas limites, erreurs serveur, navigation.
- Prioriser les corrections avant déploiement.

### 5.3 Déployer le projet sur o2switch
- Préparer l’environnement de production.
- Reporter toutes les variables d’environnement nécessaires, notamment Stripe live plus tard.
- Vérifier MongoDB en production.
- Vérifier les URLs de retour Stripe en production.
- Refaire un test complet post-déploiement.
- Contrôler formulaires, panier, commandes, compte et administration en environnement réel.

## Ordre de travail conseillé
1. Navigation admin et structure des futures pages admin.
2. Prix promo en base + formulaire admin + affichage front.
3. Filtre “prix promo” sur la boutique.
4. Intégration Stripe propre.
5. Enregistrement des commandes.
6. Simulation d’achat complète.
7. Suppression propre des données utilisateur.
8. Passe de tests + audit.
9. Déploiement.
