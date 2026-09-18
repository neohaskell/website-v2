---
title: Requêtes et vues utiles
description: Construisez des modèles de lecture autour des questions auxquelles chaque lecteur doit obtenir une réponse.
sidebar:
  order: 4
---
<!-- translation-source-sha256: 919b26e8b68bacc03787967b39a93c7c60d5208e1095967bfe4cf4c90692529a -->

Un écran ou un rapport a besoin d'informations organisées autour de la question de son lecteur. Afficher tout l'historique interne de l'application rendrait cette question plus difficile à résoudre. Une requête prépare une vue utile, comme le travail en attente de révision ou l'avancement d'une demande.

Les modèles de lecture de NeoHaskell séparent la présentation des informations de la décision d'autoriser ou non une modification. Vous pouvez ainsi façonner librement la vue, avec un compromis : une modification nouvellement acceptée peut mettre un court moment à y apparaître.

Cette page suit les [ajouts au Cart](/fr/build/commands-and-events/). Cette page a modifié la même entité Cart pour y ajouter `items` ; la requête ci-dessous lit cet état. Suivez [votre première tranche fonctionnelle](/fr/build/first-cart/) et la page des ajouts dans un seul projet `mug-shop`. Si vous arrivez directement ici, utilisez d'abord leurs checkpoints complets, puis créez ou remplacez `src/Shop/Cart/Queries/CartSummary.hs` avec le fichier complet de cette page.

## Commencer par la question affichée à l'écran

Le `CartSummary` existant répond à la question : « Quel est ce Cart, à qui appartient-il, combien d'entrées contient-il et est-il vide ? » Il ne donne ni le total des unités ni les prix. Décidez du sens de chaque champ avant de demander à un agent d'en ajouter un : `itemCount` signifie actuellement le nombre d'entrées, donc un ajout de cinq tasses produit un compteur de un.

La logique métier de la requête appartient à `src/Shop/Cart/Queries/CartSummary.hs`. Depuis la racine du projet `mug-shop`, remplacez ce fichier après avoir examiné la projection ciblée ci-dessous :

```haskell
instance QueryOf CartEntity CartSummary where
  queryId cart = cart.cartId
  combine cart _previous = do
    let count = cart.items |> Array.length
    Update CartSummary
      { cartSummaryId = cart.cartId
      , ownerId = cart.ownerId
      , itemCount = count
      , isEmpty = count == 0
      }
```

`queryId` détermine à quelle ligne de la vue cette entité contribue. `combine` reçoit l'état actuel de l'entité et la vue existante, le cas échéant. Ici, l'entité actuelle contient tout ce qu'il faut : l'ancienne vue est donc inutilisée et remplacée par `Update`.

Les autres résultats sont `Delete`, qui supprime la ligne de vue, et `NoOp`, qui la laisse inchangée. Plusieurs types d'entités peuvent contribuer à une requête. Commencez avec un seul tant que votre écran n'a pas de raison de présenter une vue combinée.

## Dériver et enregistrer la vue

Pour cette requête, le fichier définit le record de données, `canAccess` et `canView`, puis appelle le helper canonique :

```haskell
deriveQuery ''CartSummary [''CartEntity]
```

Placez l'instance métier `QueryOf` concernée **après** ce marqueur : elle dépend de l'instance `Query` générée par le marqueur. Le marqueur provient de l'import `Core` destiné au framework et génère la prise en charge standard des requêtes. Le fichier complet ci-dessous conserve les imports et l'ordre des déclarations nécessaires.

L'enregistrement de l'application est déjà présent dans `src/App.hs` depuis la première tranche. Si une application existante possède le service Cart mais pas l'enregistrement de la requête, ajoutez cette ligne à côté de l'enregistrement du service :

```haskell
  |> Application.withQuery @CartSummary
```

Le nom interne du marqueur est `CartSummary` ; l'URL HTTP est `/queries/cart-summary`. La requête d'exercice autorise délibérément l'accès public. Avant d'exposer des données privées, définissez et testez les [politiques de contrôle d'accès](/fr/build/access-control/).

## Fichier de requête actuel complet

Créez le répertoire `src/Shop/Cart/Queries` si nécessaire, puis remplacez `src/Shop/Cart/Queries/CartSummary.hs` par ce fichier assemblé depuis la racine du projet :

<!-- complete-file -->
```haskell title="src/Shop/Cart/Queries/CartSummary.hs"
module Shop.Cart.Queries.CartSummary (CartSummary (..), canAccess, canView) where

import Array qualified
import Core
import Service.AccessControl (AccessError, UserClaims)
import Service.AccessControl qualified as AccessControl
import Shop.Cart.Core (CartEntity (..))

data CartSummary = CartSummary
  { cartSummaryId :: Uuid
  , ownerId :: Text
  , itemCount :: Int
  , isEmpty :: Bool
  }

canAccess :: Maybe UserClaims -> Maybe AccessError
canAccess = AccessControl.publicAccess

canView :: Maybe UserClaims -> CartSummary -> Maybe AccessError
canView = AccessControl.publicView

deriveQuery ''CartSummary [''CartEntity]

instance QueryOf CartEntity CartSummary where
  queryId cart = cart.cartId
  combine cart _previous = do
    let count = cart.items |> Array.length
    Update CartSummary
      { cartSummaryId = cart.cartId
      , ownerId = cart.ownerId
      , itemCount = count
      , isEmpty = count == 0
      }
```

`Array qualified` est un import réellement utilisé par la projection ; conservez-le lors de l'assemblage du fichier. `canAccess` et `canView` sont des fonctions de politique applicative explicites. Elles sont publiques ici pour que l'exercice puisse inspecter un Cart sans authentification ; cette commodité n'est pas une recommandation pour des données privées.

## Trouver votre Cart

Exécutez l'application depuis la racine du projet `mug-shop` :

```sh
neo build
neo run
```

Créez un Cart, ajoutez un article comme décrit dans [les ajouts au Cart](/fr/build/commands-and-events/) et remplacez `YOUR-CART-UUID` par l'identifiant renvoyé lors de la création :

```sh
curl --get http://localhost:8080/queries/cart-summary \
  --data-urlencode 'q=.cartSummaryId == "YOUR-CART-UUID"' \
  --data-urlencode 'limit=10' \
  --data-urlencode 'offset=0'
```

Attendez-vous à un objet de page. Son tableau `items` contient le résumé correspondant lorsque la projection a rattrapé son retard. `total` représente le nombre de résultats accessibles et filtrés ; `hasMore` indique s'il reste des résultats correspondants ; `effectiveLimit` indique la limite de page appliquée.

Les valeurs par défaut sont une taille de page de 100 et un offset de zéro, avec une taille maximale absolue de 1000. Une requête peut définir une limite inférieure en définissant `maxResults :: Int` avant son marqueur. Les clients doivent utiliser `effectiveLimit` renvoyé lorsqu'ils avancent de page en page.

NeoQL prend actuellement en charge l'accès aux champs et l'égalité avec des littéraux texte ou numériques. Ce n'est pas un langage SQL général : n'inventez pas de jointures, de tris, de conditions composées ni de comparaisons avec des littéraux booléens. Une syntaxe invalide produit une erreur de parsing ; les expressions sont limitées à 500 caractères.

## Éviter un écran de chargement trompeur

Après une commande acceptée, affichez un état d'attente clair pendant que la vue rattrape son retard. Relisez avec un nombre de tentatives borné et un état d'échec utile. Une première réponse vide ne prouve pas que la commande a échoué. Soumettre à nouveau un ajout simplement parce que son résumé n'est pas encore apparu peut l'ajouter deux fois.

## Exercice : le badge du Cart

L'interface indique « 5 articles », mais le client a effectué un seul ajout de cinq tasses. Le badge doit-il afficher un ou cinq ? Énoncez le sens, puis demandez à votre agent d'identifier ce qui doit changer.

<details>
<summary>Raisonnement et vérifications suggérés</summary>

Le résumé existant indique une entrée. Si le badge signifie des unités, concevez un total de quantités au lieu de renommer `itemCount`. Vérifiez un ajout de cinq, deux ajouts du même produit, un Cart vide et un ajout refusé. Interrogez aussi un identifiant de Cart inconnu : le filtre doit produire aucune ligne correspondante, pas le Cart d'un autre client. Les tests doivent attendre une mise à jour bornée de la projection plutôt que de supposer une visibilité immédiate.

</details>

Ensuite : [stock et passage en caisse](/fr/build/stock-and-checkout/).
