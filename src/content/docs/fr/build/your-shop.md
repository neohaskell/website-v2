---
title: "Examiner votre application"
description: Vérifiez le projet que vous avez construit et choisissez le prochain engagement important à implémenter.
sidebar:
  order: 10
---
<!-- translation-source-sha256: d1943b1dcb11690b1e384e67f7d0544df06c56ab72b7b7129b6a19c1a42dd13c -->

Un jalon utile est un moment où vous pouvez expliquer le comportement de votre application et en montrer les preuves. Vous avez maintenant un projet qui contient Cart et Stock, des décisions explicites, des modèles de lecture et des tests. Avant d'ajouter une autre capacité, vérifiez que ces éléments racontent la même histoire.

Il s'agit de votre projet `mug-shop` créé avec `neo new`. Il n'y a pas de transfert vers un second espace de travail. Les sections suivantes continuent à partir des fichiers que vous avez écrits ici.

## Vérifier la forme de votre projet

Vos fichiers de domaine doivent maintenant inclure :

```text
src/
  App.hs
  Shop/
    Config.hs
    Cart/
      Core.hs
      Entity.hs
      Event.hs
      Item.hs
      Events/CartCreated.hs
      Events/ItemAdded.hs
      Service.hs
      Commands/CreateCart.hs
      Commands/AddItem.hs
      Queries/CartSummary.hs
    Stock/
      Core.hs
      Entity.hs
      Event.hs
      Events/StockInitialized.hs
      Events/StockReserved.hs
      Service.hs
      Commands/InitializeStock.hs
      Commands/ReserveStock.hs
      Queries/StockLevel.hs
tests/
  Spec.hs
  Decider/Cart/CreateCartSpec.hs
  Decider/Cart/AddItemSpec.hs
  Decider/Cart/ReplaySpec.hs
  Decider/Stock/ReserveStockSpec.hs
  scenarios/create-cart.hurl
  scenarios/cart-flow.hurl
  scenarios/stock-flow.hurl
```

Votre lanceur généré et `neo.json` restent des éléments du projet. `neo` découvre les modules source et de test et maintient les artefacts de build générés. Gardez votre projet sous contrôle de version afin qu'une modification ultérieure puisse être comparée clairement.

## Exécuter les preuves

Arrêtez un serveur de développement en cours, puis exécutez :

```sh
neo build
neo test
```

Les tests de décision vérifient les payloads acceptés, les entités manquantes, la quantité nulle et la dernière unité de stock disponible. La vérification de relecture protège les entrées de panier distinctes. Les vérifications HTTP créent leurs propres paniers et attendent le résumé correspondant.

Exécutez maintenant `neo run` et répétez les [demandes de la leçon sur le stock](/fr/build/stock-and-checkout/#create-and-inspect-stock). Créez trois unités de stock, créez un panier et ajoutez deux unités. Le panier doit afficher une entrée. Le stock doit toujours afficher trois unités disponibles et zéro réservée, car l'intégration entre les domaines constitue la prochaine leçon.

Dans un autre terminal situé à la racine de ce projet, exécutez `neo ide`. Suivez le [workflow du modèle](/fr/getting-started/visual-ide/) pour inspecter les relations. Le graphe aide à localiser le code ; les tests établissent ce que fait le code.

## Expliquer le résultat sans jargon d'implémentation

Une explication raisonnable est :

> « L'application enregistre les sélections d'une personne et rejette les quantités invalides. Elle peut aussi décider si du stock peut être réservé. Nous avons testé ces règles. Nous allons maintenant relier une sélection acceptée à la décision de stock et montrer ce qui se passe lorsque cette seconde étape échoue. »

Cette explication rend la prochaine tâche concrète. Elle ne dépend pas de faire semblant qu'un passage en caisse complet existe déjà.

## Choisir la prochaine tranche

| Jalon | Preuves à demander |
| --- | --- |
| [Relier Cart et Stock](/fr/connect/workflows/) | Ajout accepté, résultat de réservation, les deux vues et une réservation refusée. |
| Acceptation d'une commande | Un fait de commande acceptée explicite avec les prix convenus, la devise, les quantités et le contexte de livraison. |
| Paiement | Identité du fournisseur, gestion des doublons, refus et rapprochement après une réponse perdue. |
| Notification | Travail de livraison accepté ou échoué sans réécrire la commande sous-jacente. |
| [Fonctionnalités assistées par IA](/fr/connect/ai/) | Révision avant publication et protection contre le remplacement d'un travail plus récent par des réponses tardives. |
| [Exploiter l'application](/fr/operate/) | Redémarrage durable, preuves de restauration, accès autorisé et smoke tests sur la révision déployée. |

Certaines de ces étapes sont des intégrations suivies ; d'autres sont des exercices de conception délibérés. Choisissez un engagement, décrivez son acceptation et son refus, puis implémentez-le et vérifiez-le avant d'en ajouter un autre.

## Exercice : définir l'achèvement

Votre agent affirme que « le passage en caisse est terminé » parce que la demande a renvoyé 200. Écrivez les preuves dont vous auriez besoin pour accepter cette affirmation selon la politique de passage en caisse choisie.

<details>
<summary>Raisonnement et vérifications suggérés</summary>

Nommez le fait qui signifie que la commande a été acceptée. Identifiez les prix et les détails client qu'il fixe. Expliquez si la réservation et le paiement sont des prérequis ou des étapes ultérieures, et comment chaque refus est représenté. Testez une réussite ordinaire, un échec partiel et un résultat en double ou retardé. Un accusé HTTP prouve uniquement l'acceptation de la commande concernée.

</details>

Continuez avec les [intégrations](/fr/connect/), en utilisant le même projet et la même habitude de rendre chaque engagement visible.
