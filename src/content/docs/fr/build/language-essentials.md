---
title: Les fondamentaux du langage
description: Lisez le vocabulaire NeoHaskell utilisé par votre agent, un concept pratique à la fois.
sidebar:
  order: 11
---
<!-- translation-source-sha256: d7e73e71cf08a666e6c613de23c3929c90ccaf54b7923fe5542f912d968e2628 -->

Vous pouvez orienter le comportement d'une application sans mémoriser un manuel de langage. Pourtant, un petit vocabulaire vous permet d'inspecter la proposition d'un agent et de poser des questions plus précises : cette valeur peut-elle être absente ? Cette opération peut-elle échouer ? Cette fonction prend-elle une décision ou effectue-t-elle une action externe ?

Utilisez cette page comme compagnon de lecture. Les exemples s'appuient sur le projet d'exercice de commerce en ligne et sur des tâches courantes de traitement de données. Ce sont de petites expressions ou des fonctions partielles pour un module NeoHaskell configuré, pas une seconde application à installer.

## Lire un pipeline de gauche à droite

NeoHaskell fait couramment passer une valeur par des étapes nommées avec `|>` :

```haskell
cart.items |> Array.length
```

Cela signifie « prendre les entrées du panier, puis les compter ». Vous avez utilisé cette expression dans `src/Shop/Cart/Queries/CartSummary.hs`. Les noms qualifiés comme `Array.length` indiquent quel module fournit l'opération.

`Core` fournit le vocabulaire par défaut. Ces extraits pédagogiques omettent les en-têtes de modules et les listes d'imports ; les checkpoints téléchargeables contiennent les fichiers complets. Neo gère les réglages du langage, les fichiers applicatifs n'ont donc pas besoin de pragmas de langage. Un record contient des champs nommés ; `cart.ownerId` en lit un et `cart {ownerId = newOwner}` produit une valeur de record mise à jour. Produire cette valeur seul ne persiste pas un événement.

## Distinguer absence, échec et travail

| Type | Question rendue explicite | Exemple |
| --- | --- | --- |
| `Maybe value` | Une valeur est-elle présente ? | La recherche d'un panier peut produire `Nothing` ou `Just cart`. |
| `Result error value` | Un calcul a-t-il réussi ? | Le décodage JSON peut produire `Err message` ou `Ok value`. |
| `Task error value` | Quel travail produira un résultat et comment peut-il échouer ? | Lire un fichier ou effectuer une demande HTTP. |
| `Decision event` | Quels faits métier faut-il accepter ? | Accepter l'ajout d'un article ou rejeter sa quantité. |

`case` nomme les possibilités que vous traitez. Cet **helper partiel adapté** montre une vérification d'entrée pure :

```haskell
validateQuantity :: Int -> Result Text Int
validateQuantity quantity =
  if quantity > 0
    then Ok quantity
    else Err "Quantity must be positive"
```

`Task.yield` produit un résultat de tâche réussi ; `Task.throw` produit une erreur de tâche. `Task.mapError` traduit un type d'erreur à une limite et `Task.asResult` permet d'inspecter une erreur comme une valeur. Ne remplacez pas un échec significatif par une valeur par défaut simplement pour permettre au code de continuer : l'appelant peut avoir besoin de savoir que l'action n'est pas terminée.

`do` enchaîne les étapes, `<-` reçoit le résultat d'une étape et `let` nomme une valeur locale. L'orchestration de l'application peut donc se lire de haut en bas sans placer chaque branche dans une grande fonction unique.

## Collections et identifiants

Utilisez `Array` pour les valeurs ordonnées et `Map` pour les valeurs indexées par un identifiant. `Array.map` transforme les entrées ; `Array.takeIf` conserve les entrées correspondantes ; `Array.reduce` combine les entrées en un résultat. `Map.get` renvoie `Maybe` parce qu'une clé peut être absente.

`Uuid.fromText` renvoie également `Maybe` : le texte provenant d'une URL n'est pas garanti comme identifiant valide. Le parsing réussi d'un ID établit son format, pas le droit de l'appelant d'accéder à l'enregistrement correspondant.

`Text` est le type de chaîne habituel. Un formatage comme `[fmt|Cart #{cartId}|]` rend l'interpolation lisible. Utilisez des types métier nommés et des champs de record afin que l'implémentation de l'agent préserve les distinctions de votre modèle d'événements.

## Montants et argent

Les valeurs numériques nécessitent des unités, des limites et des règles d'arrondi définies. L'argent du projet d'exercice fournit un exemple utile : un prix nécessite à la fois un montant et une devise. Le type `Decimal` fournit un stockage à virgule fixe avec quatre décimales. Il se sérialise en JSON comme une chaîne, par exemple `"12.5000"`.

Ces **expressions fondées sur le code source** illustrent la construction et le formatage :

```haskell
Decimal.fromCents 1250 |> Decimal.formatDecimal
-- "12.5000"

Decimal.divide (Decimal.fromCents 1250) Decimal.zero
-- Nothing
```

Pour une devise dont les sous-unités ont deux décimales, `fromCents` construit le montant à partir d'unités mineures entières. `toCents` tronque la précision plus fine ; ce n'est pas une politique d'arrondi implicite. `roundTo2` est une opération explicite et la division renvoie `Maybe` car la division par zéro n'a pas de valeur.

L'implémentation stocke un `Int64`, les montants ont donc des limites. Son parseur textuel passe actuellement par une conversion en virgule flottante ; ne le décrivez pas comme un parseur financier à précision arbitraire. Préférez des unités mineures entières validées lorsqu'elles correspondent à votre politique monétaire et testez l'arrondi ainsi que les montants maximaux. `Decimal` n'attache pas de devise et ne décide pas des règles fiscales à votre place.

## Ce que les traits et les marqueurs apportent

Un trait décrit le comportement pris en charge par un type. `Mappable` permet de transformer les valeurs contenues, `Default` fournit une valeur de départ et les traits de sérialisation relient les valeurs au JSON. Une contrainte dans la signature d'une fonction indique le comportement dont elle a besoin.

Les helpers `deriveEvent`, `deriveCommand`, `deriveEntity`, `deriveQuery` et `deriveOutboundIntegration` proviennent de `Core` et génèrent des instances courantes. Ils réduisent le câblage répétitif, tandis que la décision, la mise à jour de l'état et la projection restent une logique métier que vous pouvez inspecter. Voir [commandes et événements](/fr/build/commands-and-events/) pour l'ordre de déclaration et [requêtes](/fr/build/queries/#derive-and-register-the-view) pour l'ordre propre aux requêtes.

## Exercice : examiner un helper « sûr »

Dans le projet d'exercice, un agent parse une quantité invalide et la remplace par une quantité valide afin que la demande réussisse toujours. Expliquez pourquoi cela peut violer le comportement demandé, puis proposez une vérification observable.

<details>
<summary>Raisonnement et vérifications suggérés</summary>

Une tasse est une quantité valide, mais ce n'est peut-être pas ce que le client a demandé. Préservez l'entrée invalide comme erreur et laissez l'interface demander une correction. Vérifiez une valeur positive normale, une valeur mal formée, zéro et la plus grande quantité autorisée par la politique de l'exercice. Testez également aux limites toute conversion vers des représentations numériques ou monétaires plus petites. La vérification des types aide à distinguer les catégories ; elle ne choisit pas les valeurs métier acceptables par défaut.

</details>

Ensuite : les [intégrations](/fr/connect/) appliquent ces idées au travail effectué en dehors du modèle central. Revenez à la [vue d'ensemble de la construction](/fr/build/) pour suivre la séquence d'apprentissage.

Sources publiques : [Result](https://github.com/neohaskell/NeoHaskell/blob/main/core/core/Result.hs), [Task](https://github.com/neohaskell/NeoHaskell/blob/main/core/core/Task.hs), [Decimal](https://github.com/neohaskell/NeoHaskell/blob/main/core/decimal/Decimal.hs), [Mappable](https://github.com/neohaskell/NeoHaskell/blob/main/core/traits/Mappable.hs).
