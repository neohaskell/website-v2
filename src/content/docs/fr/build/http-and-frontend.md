---
title: HTTP et interfaces frontend
description: Reliez une interface aux commandes et aux requêtes, et communiquez l'état de chaque demande.
sidebar:
  order: 6
---
<!-- translation-source-sha256: 79f3faf0995deda2ea89dd830481ff910c8c7013965e158eaef5f051d10cffc7 -->

Une interface utilisateur transforme les choix en demandes et en affiche les résultats. Elle doit distinguer l'acceptation, le travail encore en cours et l'échec afin que les personnes sachent ce qui s'est passé et ce qu'elles peuvent faire ensuite.

Le transport web de NeoHaskell expose les commandes et les requêtes via HTTP. Vous pouvez construire l'interface avec un framework frontend adapté à votre équipe. Le transport actuel sert l'API de l'application et sa documentation ; il ne fournit pas d'API générale d'hébergement d'un frontend statique.

Notre exemple suivi est une vitrine pour le projet d'exercice de commerce en ligne. Un ajout au panier, une réservation en attente et une commande confirmée nous donnent des exemples concrets des différents états qu'une interface doit communiquer.

Les exemples continuent dans le même projet `mug-shop`. L'API est la partie implémentée par cette leçon ; un frontend navigateur est un client optionnel que vous ajoutez à côté du projet Neo.

## Partir du véritable contrat

Avec [votre application en fonctionnement](/fr/build/first-cart/) via `neo run`, ouvrez `http://localhost:8080/docs` pour inspecter la documentation d'API générée. Le même schéma est disponible dans `/openapi.json` et `/openapi.yaml`.

| Objectif | Route d'exemple | Signification de la réussite |
| --- | --- | --- |
| Envoyer une demande métier | `POST /commands/add-item` | La commande Cart a été acceptée. |
| Lire une vue | `GET /queries/cart-summary` | Une page de lignes de vue actuellement disponibles et autorisées a été renvoyée. |
| Inspecter l'interface | `GET /openapi.json` | Le schéma d'API généré de l'application a été renvoyé. |

L'enregistrement pilote l'interface : la commande déclare son transport, le service enregistre la commande et l'application enregistre ce service ainsi que ses requêtes. Les routes HTTP utilisent des noms kebab-case. N'inférez pas une route à partir d'un libellé d'écran comme « checkout » si aucune commande correspondante n'existe.

## Assembler le câblage HTTP de l'application

Si votre projet utilise encore le magasin local non persistant, créez ou remplacez `src/App.hs` par ce câblage complet. Il expose les commandes Cart et Stock ainsi que leurs vues de requête via le transport web. Si votre `App.hs` possède déjà une configuration, une authentification ou une autre politique de transport, conservez ces étapes et ajoutez seulement les enregistrements de services et de requêtes manquants.

<!-- complete-file -->
```haskell title="src/App.hs"
module App (app) where

import Core
import Maybe qualified
import Path qualified
import Service.Application (Application)
import Service.Application qualified as Application
import Service.EventStore.Simple (SimpleEventStore (..))
import Service.Transport.Web qualified as WebTransport
import Shop.Cart.Queries.CartSummary (CartSummary)
import Shop.Cart.Service qualified as Cart
import Shop.Stock.Queries.StockLevel (StockLevel)
import Shop.Stock.Service qualified as Stock

app :: Application
app = Application.new
  |> Application.withEventStore @() (\_ -> SimpleEventStore
    { basePath = Path.fromText ".neo/events" |> Maybe.getOrDie
    , persistent = False
    })
  |> Application.withTransport WebTransport.server
  |> Application.withService Cart.service
  |> Application.withQuery @CartSummary
  |> Application.withService Stock.service
  |> Application.withQuery @StockLevel
```

Depuis la racine du projet, exécutez `neo build`, puis `neo run`. Ouvrez `/docs` et `/openapi.json` pour confirmer que les commandes et les requêtes enregistrées figurent dans le contrat généré avant de connecter un navigateur.

## Connecter une action

Cette **fonction JavaScript partielle pour navigateur** envoie la demande `AddItem` de votre application. Appelez-la avec les vrais IDs de [stock et passage en caisse](/fr/build/stock-and-checkout/). Elle suppose que le frontend d'exercice utilise un proxy same-origin pour `/commands` ; le développement cross-origin nécessite une configuration CORS explicite du serveur.

```javascript
async function addMugs(cartId, stockId, quantity) {
  const response = await fetch('/commands/add-item', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cartId, stockId, quantity }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.reason ?? result.error ?? 'Could not add mugs');
  }
  return result.entityId;
}
```

Il s'agit d'une fonction navigateur partielle adaptée, pas d'un fichier frontend complet. Placez-la dans le module utilisé par votre frontend (par exemple, créez `frontend/cart.js` si votre projet ne contient encore aucun code navigateur) et appelez-la depuis le gestionnaire d'événement d'un formulaire AddItem. Le projet Neo ne génère pas ce répertoire frontend et ne configure pas de proxy pour lui. Une application authentifiée doit également fournir ses identifiants selon la configuration d'authentification. Cette fonction de pratique locale ne constitue pas une implémentation complète de session client.

L'interface devrait désactiver les soumissions en double accidentelles pendant que la demande est en cours, afficher un refus utile et actualiser la requête concernée après l'acceptation. Une réponse réseau perdue exige une attention particulière : le serveur a peut-être déjà accepté la demande. Décidez comment l'application détecte les doublons avant de renvoyer automatiquement des écritures.

## Traiter séparément les résultats

Le transport web associe les réponses de commandes acceptées à HTTP 200. Les refus métier sont actuellement associés à 400, avec un champ `reason` ; les échecs de commande sont également associés à 400, avec un champ `error`. Inspectez le corps de la réponse en plus du statut au lieu de traiter tout 400 comme un JSON invalide.

Les échecs d'authentification et de permission utilisent 401 ou 403. Une route non enregistrée produit 404. Les modèles de lecture peuvent temporairement avoir du retard sur une écriture acceptée : « accepté, actualisation en cours » est donc un état d'interface utile. Une nouvelle tentative bornée de lecture est différente de la relecture de l'écriture.

## Placer l'accès navigateur dans le câblage de l'application

L'API possède un `CorsConfig` avec les origines, méthodes et en-têtes autorisés, ainsi qu'une durée facultative de cache du preflight. Cette **expression partielle de câblage applicatif** illustre une politique frontend locale ; elle nécessite les imports `Application` et `WebTransport` existants :

```haskell
Application.withCors @() (\_ -> WebTransport.CorsConfig
  { allowedOrigins = ["http://localhost:4321"]
  , allowedMethods = ["GET", "POST", "OPTIONS"]
  , allowedHeaders = ["Content-Type", "Authorization"]
  , maxAge = Just 600
  })
```

Appliquez-la dans le pipeline de votre application et utilisez l'origine réelle de votre frontend. CORS gouverne l'accès du navigateur ; il n'accorde pas de permission métier. Protégez les informations privées avec le [contrôle d'accès](/fr/build/access-control/).

Créez ou remplacez `tests/scenarios/create-cart.hurl` avec cette vérification API complète. Elle donne au contrat du navigateur une limite serveur répétable avant l'ajout d'un frontend. Arrêtez `neo run` avant d'exécuter `neo test`.

<!-- complete-file -->
```hurl title="tests/scenarios/create-cart.hurl"
POST http://localhost:8080/commands/create-cart
Content-Type: application/json
[]

HTTP 200
[Captures]
cart_id: jsonpath "$.entityId"

GET http://localhost:8080/queries/cart-summary
[Options]
retry: 10
retry-interval: 200

HTTP 200
[Asserts]
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].itemCount" nth 0 == 0
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].isEmpty" nth 0 == true
```

Exécutez `neo test` depuis la racine du projet. La vérification Hurl prouve la réponse de l'API et la mise à jour éventuelle de la requête ; elle ne prouve pas qu'une disposition navigateur, un proxy ou un fournisseur d'authentification est configuré.

## Exercice : un résumé retardé

Le serveur a accepté un ajout, mais le résumé suivant semble toujours vide. Concevez les trois prochaines actions de l'écran sans envoyer un autre ajout.

<details>
<summary>Raisonnement et vérifications suggérés</summary>

Affichez l'acceptation avec une actualisation en attente, réessayez la lecture dans un intervalle borné et proposez un état clair d'actualisation ou de récupération si elle reste ancienne. Vérifiez une mise à jour normale, une quantité nulle refusée et une projection retardée. Simulez séparément une erreur réseau après l'envoi : « nous n'avons pas pu confirmer le résultat » est plus exact que d'affirmer que l'ajout a échoué. Vérifiez qu'un double-clic n'ajoute pas silencieusement deux fois.

</details>

Ensuite : [tester le comportement](/fr/build/testing/).

Sources publiques : [transport web](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Transport/Web.hs), [réponses de commandes](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Response.hs), [câblage applicatif](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Application.hs).
