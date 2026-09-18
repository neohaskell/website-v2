---
title: Entités et état
description: Comprenez comment les faits enregistrés deviennent l'état utilisé pour la prochaine décision métier.
sidebar:
  order: 3
---
<!-- translation-source-sha256: 6bca4999700dc492c501c8515d57fcb22d50687ded825f4c40f360072f53a1d6 -->

Avant d'accepter une nouvelle demande, une application doit connaître l'état actuel pertinent. Savoir comment cet état s'est formé aide aussi à expliquer les décisions passées. NeoHaskell relie ces besoins : l'état actuel d'une entité est construit en appliquant ses événements dans l'ordre.

Une **entité** est l'objet métier dont vous protégez les règles. Elle peut représenter une réservation, un document ou un compte. Dans le projet d'exercice, il s'agit d'un Cart identifié par un UUID. Son état aide à décider de la prochaine commande ; son historique d'événements enregistre les modifications acceptées.

Cette page suppose que [votre première tranche fonctionnelle](/fr/build/first-cart/) et les [ajouts au Cart](/fr/build/commands-and-events/) se trouvent dans le même projet `mug-shop`. Si vous arrivez directement ici, ouvrez le projet créé dans la mise en route et utilisez d'abord les checkpoints complets de ces deux pages ; le fichier d'entité complet de cette page fait référence à `CartItem` et `ItemAdded` du checkpoint des ajouts.

## Suivre un Cart dans le temps

Supposons que l'historique d'événements d'un Cart soit :

| Événement enregistré | État obtenu |
| --- | --- |
| `CartCreated` | Le Cart possède un identifiant, un identifiant de propriétaire et aucune entrée. |
| `ItemAdded`, quantité 2 | Une entrée contient l'identifiant du stock sélectionné et la quantité 2. |
| `ItemAdded`, quantité 1 | Une seconde entrée est ajoutée, même si elle fait référence au même stock. |

La distinction entre une entrée et une quantité totale est un choix de modèle. L'exemple actuel ne fusionne pas les ajouts répétés. Il ne supprime pas non plus les articles, n'enregistre pas de prix et ne marque pas un Cart comme passé en caisse. Ce sont des décisions métier distinctes qui méritent leurs propres faits et règles.

## Décider où placer le comportement de l'état

Travaillez depuis la racine du projet `mug-shop`. `src/Shop/Cart/Event.hs` possède le vocabulaire des événements Cart et `getEventEntityId` ; `src/Shop/Cart/Item.hs` possède la petite valeur stockée dans chaque entrée ; `src/Shop/Cart/Entity.hs` possède le record d'état, sa valeur initiale et la relecture. La façade de domaine dans `src/Shop/Cart/Core.hs` ré-exporte les types d'entité et d'événement pour les commandes et les requêtes.

La page des ajouts vous a déjà demandé de remplacer `src/Shop/Cart/Entity.hs`. Cette page explique pourquoi ce fichier a cet ordre et ces limites, puis montre le fichier actuel complet. Si vous appliquez maintenant la modification, remplacez le fichier à ce chemin par le bloc assemblé ci-dessous. Ne déplacez pas `initialState`, `update` ou `getEventEntityId` derrière le marqueur qui dépend d'eux.

## Lire l'état et son câblage

Le record d'état Cart contient les faits nécessaires aux décisions ultérieures :

```haskell
data CartEntity = CartEntity
  { cartId :: Uuid
  , ownerId :: Text
  , items :: Array CartItem
  }
```

La reconstruction commence avec un tableau vide et un identifiant nul :

```haskell
initialState :: CartEntity
initialState = CartEntity {cartId = Uuid.nil, ownerId = "", items = Array.empty}
```

Le cas `CartCreated` établit l'identité et le propriétaire. Le cas `ItemAdded` ajoute une entrée déjà acceptée par la commande :

```haskell
update change cart = case change of
  CartCreated created ->
    CartEntity {cartId = created.entityId, ownerId = created.ownerId, items = Array.empty}
  ItemAdded added ->
    cart {items = cart.items |> Array.push (CartItem {stockId = added.stockId, quantity = added.quantity})}
```

La fonction de mise à jour applique un fait accepté. La validation se fait avant l'enregistrement de ce fait ; le travail externe appartient à une intégration qui y réagit. La mise à jour de Cart n'appelle pas un entrepôt, ne consulte pas le catalogue du jour et ne réexamine pas si la demande aurait dû être acceptée.

Après `initialState` et `update`, reliez l'entité à son type d'événement avec le helper exporté par l'import `Core` destiné au framework :

```haskell
deriveEntity ''CartEntity ''CartEvent
```

La fonction `getEventEntityId` de `Event.hs` doit être importée avant ce marqueur. Ces éléments compagnons sont le comportement à examiner avec votre agent. Le marqueur fournit les liens entre `CartEntity` et `CartEvent`, la conversion JSON, la valeur initiale par défaut ainsi que les instances de relecture et de routage d'événements du framework. Il n'exige pas que les champs de l'entité prennent en charge `Show`.

## La relecture est une limite métier

Garder la validation hors de `update` rend la relecture stable. Si la reconstruction du Cart d'hier consultait le prix produit d'aujourd'hui, le même historique pourrait produire un résultat commercial différent. Lorsqu'un prix doit faire partie d'un accord de commande, concevez un événement qui enregistre le montant et la devise convenus au moment approprié.

Capturer ce prix est une **extension de conception du projet d'exercice**, pas un champ déjà présent dans ce Cart. La leçon générale consiste à préserver les informations qui donnent son sens à une décision passée. Consultez [les fondamentaux du langage](/fr/build/language-essentials/#amounts-and-money) pour connaître le type Decimal actuel et ses limites.

Les snapshots peuvent réduire le travail nécessaire pour reconstruire une entité. Ils servent la performance ; le comportement enseigné et vérifié reste l'application ordonnée des faits enregistrés. La persistance et la récupération sont traitées dans [exploiter et faire évoluer](/fr/operate/).

## Fichier d'entité actuel complet

Voici le remplacement assemblé de `src/Shop/Cart/Entity.hs`, relatif à la racine du projet `mug-shop`. Les définitions de `CartEvent`, `CartItem` et `ItemAdded` qu'il importe sont complètes dans [commandes et événements](/fr/build/commands-and-events/).

<!-- complete-file -->
```haskell title="src/Shop/Cart/Entity.hs"
module Shop.Cart.Entity (CartEntity (..), initialState, update) where

import Core
import Shop.Cart.Event (CartEvent (..), getEventEntityId)
import Shop.Cart.Events.CartCreated qualified as CartCreated
import Uuid qualified
import Array qualified
import Shop.Cart.Item (CartItem (..))
import Shop.Cart.Events.ItemAdded qualified as ItemAdded

data CartEntity = CartEntity
  { cartId :: Uuid
  , ownerId :: Text
  , items :: Array CartItem
  }

initialState :: CartEntity
initialState = CartEntity {cartId = Uuid.nil, ownerId = "", items = Array.empty}

update :: CartEvent -> CartEntity -> CartEntity
update change cart = case change of
  CartCreated created ->
    CartEntity {cartId = created.entityId, ownerId = created.ownerId, items = Array.empty}
  ItemAdded added ->
    cart {items = cart.items |> Array.push (CartItem {stockId = added.stockId, quantity = added.quantity})}

deriveEntity ''CartEntity ''CartEvent
```

## Exercice : expliquer une reconstruction

Donnez à votre agent cet historique : un Cart est créé, deux tasses sont ajoutées, puis trois autres. Demandez-lui de prédire à la fois le nombre d'entrées et la quantité totale. Faites-lui ensuite démontrer la reconstruction depuis `initialState`.

<details>
<summary>Raisonnement et vérifications suggérés</summary>

Attendez-vous à deux entrées et cinq unités avec le modèle actuel. Un historique vide donne l'état initial ; la création seule donne un véritable Cart vide. Une commande à quantité nulle refusée ne doit pas ajouter de fait `ItemAdded`. Relire le même historique accepté depuis le même état initial doit produire le même état. Ne confondez pas cela avec l'ajout de l'historique deux fois : les ajouts acceptés en double modifient le résultat, sauf si votre application a conçu une gestion des doublons.

</details>

Ensuite : [les requêtes](/fr/build/queries/) transforment cet état en informations utiles à l'écran.

Continuez à travailler dans votre projet avec `neo build`, `neo test` et `neo ide`. La [leçon sur les tests](/fr/build/testing/) ajoute une vérification de relecture pour ces modules Cart précis.
