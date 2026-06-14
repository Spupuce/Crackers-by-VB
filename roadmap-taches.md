# Liste de tâches du projet

## Légende des statuts
- ✅ Terminé
- 🟡 En cours / à valider
- 🔴 À faire

---

## 1. Administration et navigation admin

### 1.1 Navigation pour les comptes admin
- ✅ Navbar admin avec accès à l’accueil, la boutique, le stock, les commandes et les fiches clients.
- ✅ Permettre à l’admin de naviguer sur le site comme un client tout en gardant un accès clair à l’espace de gestion.
- ✅ Définir le comportement global selon le rôle connecté : visiteur, client, admin.

### 1.2 Navigation cohérente avec l’état de connexion
- ✅ Affichage des liens adapté selon le rôle.
- ✅ Vérifier les redirections après connexion admin.
- ✅ Vérifier les parcours :
  - `/administration`
  - `/administration/stock`
  - `/administration/commandes`
  - `/administration/clients`

### 1.3 Finaliser l’administration
- 🟡 Consolider la page stock.
- ✅ Vérifier les actions admin sur produits actifs / archivés.
- ✅ Finaliser la page `/administration/clients`.
- 🟡 Harmoniser visuellement les pages admin existantes.
- ✅ Corriger la logique de stock partagée pour gérer correctement les déclinaisons couleur partout.
- ✅ Mieux intégrer les demandes de réassort dans l’admin stock.

---

## 2. Produits, stock et promotions

### 2.1 Prix promo dans l’administration produit
- 🔴 Ajouter un champ `prix promo` à droite du prix dans le formulaire produit.
- 🔴 Définir si la valeur est optionnelle et comment elle est stockée en base.
- 🔴 Vérifier l’impact sur la création, l’édition, l’affichage admin et les API produits.

### 2.2 Affichage promo côté front
- ✅ Afficher le prix normal barré et le prix promo quand un prix promo est renseigné.
- 🟡 Vérifier cet affichage sur la page boutique, la fiche produit et toutes les cartes produit concernées.
- 🟡 S’assurer que les calculs restent cohérents partout.

### 2.3 Filtre “prix promo” sur la boutique
- ✅ Permettre de filtrer uniquement les produits en promotion.
- 🟡 Vérifier la compatibilité avec les autres filtres existants.
- 🟡 Valider définitivement si le filtrage reste dynamique ou passe par un bouton d’application global.

### 2.4 Variantes couleur et galerie produit
- ✅ Permettre l’ajout au panier par couleur sur la fiche produit.
- ✅ Associer l’image de variante à la couleur sélectionnée.
- ✅ Permettre de revenir à la photo générique sans casser la fiche produit.
- ✅ Empêcher l’ajout au panier tant qu’aucune couleur n’est choisie sur un produit à variantes.
- ✅ Garder un état “En stock” au niveau produit quand au moins une couleur est disponible.
- ✅ Vérifier la cohérence complète de l’affichage variante/couleur sur le drawer panier.
- ✅ Vérifier la cohérence complète de l’affichage variante/couleur sur la page `/panier`.

---

## 3. Paiement et commandes

### 3.1 Intégration Stripe
- 🔴 Intégrer les clés de test dans les variables d’environnement locales.
- 🔴 Vérifier que la clé secrète est utilisée uniquement côté serveur.
- 🔴 Configurer les URLs de retour `success` et `cancel` cohérentes avec `/panier`.
- 🔴 Créer le webhook Stripe de test.
- 🔴 Écouter au minimum `checkout.session.completed`.
- 🔴 Vérifier qu’un paiement test Stripe redirige correctement vers le site.

### 3.2 Stockage des commandes
- 🔴 Brancher la création de commande via le webhook Stripe.
- 🔴 Enregistrer les lignes produits (quantité, prix unitaire, total, image).
- 🔴 Lier la commande à l’utilisateur connecté.
- 🔴 Éviter les doublons si Stripe renvoie plusieurs événements.
- 🔴 Tester qu’une commande validée crée bien une entrée MongoDB exploitable.

### 3.3 Simulation d’achat de bout en bout
- 🔴 Se connecter avec un compte utilisateur de test.
- 🔴 Vérifier l’ajout au panier, l’accès à `/panier` et à `/mon-compte`.
- 🔴 Tester le flux de paiement succès.
- 🔴 Tester le flux d’annulation.
- 🔴 Vérifier la logique panier / compte / commandes après retour Stripe.
- 🔴 Vérifier le comportement non connecté.
- 🔴 Vérifier les erreurs serveur Stripe / API.

---

## 4. Compte utilisateur et données liées

### 4.1 Suppression propre des données liées
- 🔴 Recenser les données liées à un utilisateur : profil, favoris, panier serveur, commandes futures, demandes éventuelles.
- 🔴 Vérifier ce qui est déjà supprimé aujourd’hui dans MongoDB et ce qui reste orphelin.
- 🔴 Ajouter la suppression des commandes quand le modèle `Order` sera branché.
- 🔴 Tester la suppression complète avec un compte de test.

### 4.2 Cohérence des données visibles
- 🔴 Vérifier qu’aucune donnée supprimée ne reste visible sur `mon-compte`, favoris ou panier.
- 🔴 Contrôler la cohérence entre compte, favoris, panier et commandes.

---

## 5. Qualité, audit et déploiement

### 5.1 Passe complète de tests
- 🔴 Tester boutique, fiche produit, panier, connexion, inscription, compte, favoris et administration.
- 🟡 Vérifier la cohérence du stock partout (partiellement fait avec les variantes).
- 🔴 Vérifier les favoris sur produits archivés.
- 🔴 Vérifier les formulaires et messages d’erreur.
- 🔴 Vérifier les comportements mobile / desktop.
- 🔴 Dresser une liste précise des bugs restants.

### 5.2 Audit
- 🔴 Audit UX du parcours achat.
- 🔴 Audit logique métier : stock, panier, favoris, compte, admin.
- 🔴 Audit cohérence front/back/API.
- 🔴 Audit accessibilité de base : labels, focus, lisibilité, messages d’erreur.
- 🔴 Audit robustesse : cas limites, erreurs serveur, navigation.
- 🔴 Prioriser les corrections avant déploiement.

### 5.3 Déploiement sur o2switch
- 🔴 Préparer l’environnement de production.
- 🔴 Reporter toutes les variables d’environnement nécessaires, notamment Stripe live plus tard.
- 🔴 Vérifier MongoDB en production.
- 🔴 Vérifier les URLs de retour Stripe en production.
- 🔴 Refaire un test complet post-déploiement.
- 🔴 Contrôler formulaires, panier, commandes, compte et administration en environnement réel.

---

## 6. Déjà traité (verrouillé)

- ✅ Corriger la logique panier pour distinguer les variantes couleur.
- ✅ Corriger la sélection couleur sur la fiche produit.
- ✅ Synchroniser galerie produit et couleur sélectionnée.
- ✅ Permettre le retour à l’image générique.
- ✅ Éviter l’état “rupture” trompeur lors du retour à l’image générique.
- ✅ Bloquer l’ajout panier si aucune couleur n’est choisie pour un produit à variantes.