---
title: Construire une intégration réutilisable
description: Encapsulez un travail externe derrière une petite demande et un résultat explicite.
sidebar:
  order: 10
---
<!-- translation-source-sha256: e3e707031b44439183bc1787e923b91de97405c7627b025459c1cd831f7efa20 -->

Lorsqu'une application a besoin d'une API externe ou d'un outil local que NeoHaskell n'encapsule pas, vous pouvez empaqueter ce travail dans une intégration réutilisable. Les appelants décrivent une demande dans un petit record ; les détails du protocole, les identifiants et le parsing de la réponse restent dans une seule implémentation.

Il s'agit d'une branche plus avancée du parcours. Vous prenez en charge le comportement réseau ou celui d'un sous-processus ainsi que les règles de l'application. Commencez par [HTTP générique](/fr/connect/http-and-payments/) si cela correspond déjà au fournisseur.

## Donner une place à l'adaptateur dans mug-shop

Continuez depuis votre projet `mug-shop`. Commencez par un module tel que `src/Shop/Integrations/Parcel.hs` ; séparez-le en modules de demande, de réponse et internes lorsque ces responsabilités ont besoin d'emplacements distincts. Les imports des modules obtenus restent `Shop.Integrations.Parcel` et ses enfants. Conservez les dépendances propres au fournisseur dans le `neo.json` de votre projet, en suivant la [configuration des intégrations](/fr/connect/#prepare-your-project).

Une structure utile sépare :

- Un module façade importé par les appelants de l'API.
- Un type de demande contenant les entrées, la configuration et les callbacks de résultat.
- Un type de réponse contenant le résultat utile du fournisseur.
- Un module interne qui implémente ou compose l'exécution.

Pour un fournisseur imaginaire d'étiquettes de colis, la demande de l'application peut inclure une référence d'expédition et les détails du colis. Il s'agit d'un exemple de conception, pas d'une API d'expédition fournie. Décidez quel statut précis du fournisseur établit la création de l'étiquette et quoi faire si une réponse est perdue.

Conservez deux callbacks qui renvoient un unique type de commande déclaré avec `InternalTransport`. Laissez l'appelant capturer son propre identifiant de workflow dans ces callbacks. Évitez de coupler l'intégration réutilisable à une entité applicative particulière.

## Comprendre le contrat d'exécution

`Integration.ToAction` convertit une demande en `Action`. Sa méthode essentielle est :

```haskell
class ToAction config where
  toAction :: config -> Action
```

Une action reçoit `ActionContext` et renvoie une `Task IntegrationError (Maybe CommandPayload)`. Un travail réussi peut utiliser `Integration.emitCommand` ; un travail sans commande de suivi peut utiliser `Integration.noCommand`.

Vous avez déjà utilisé `Integration.Command.Emit` dans [la coordination Cart-Stock](/fr/connect/workflows/). Cette opération externe n'en réalise aucune : elle émet la commande configurée. Votre adaptateur de colis ajoute le travail de protocole avant de choisir la commande de résultat.

Pour les fournisseurs HTTP, composez `Integration.Http.Request` au lieu de dupliquer le mécanisme de requête. Le `toHttpRequest` d'OpenRouter est un exemple concret : il construit l'endpoint, le corps, les en-têtes, l'authentification, les callbacks et le délai, puis délègue l'exécution. Conservez le [comportement actuel des nouvelles tentatives](/fr/connect/http-and-payments/#understand-the-current-retry-boundary) dans les tests de compatibilité du fournisseur.

## Choisir des erreurs qui aident l'appelant à récupérer

Le vocabulaire d'erreurs du runtime comprend `NetworkError`, `AuthenticationError`, `ValidationError`, `RateLimited`, `PermanentFailure` et `UnexpectedError`.

Décidez quels échecs deviennent une commande de résultat et lesquels font échouer la préparation avant toute exécution de la demande. Expliquez cette limite dans la documentation de votre intégration. Un appelant qui attend un callback a besoin d'un moyen opérationnel de détecter les échecs qui contournent ce callback.

Ne renvoyez pas des corps de réponse arbitraires du fournisseur comme chaînes d'erreur. Ils peuvent contenir des données client ou des identifiants. Conservez une explication sûre et un identifiant de corrélation lorsque le fournisseur en prend un en charge.

## Séparer les ressources de longue durée de l'état durable

Si une intégration a besoin d'une ressource coûteuse par entité, `Integration.Lifecycle.OutboundConfig state` offre :

```haskell
initialize :: StreamId -> Task Text state
processEvent :: state -> Event Json.Value -> Task Text (Array Integration.CommandPayload)
cleanup :: state -> Task Text Unit
```

Ce sont des **signatures de champs**, extraites du type de cycle de vie. Les workers initialisent les ressources, traitent les événements et nettoient lorsqu'ils sont arrêtés ou récupérés. Un événement ultérieur peut créer un worker neuf ; cet état ne constitue donc pas l'historique durable du workflow.

Un worker peut contenir un `ConcurrentVar`, un handle de connexion ou une autre ressource temporaire. Ses valeurs peuvent être réinitialisées lorsque le worker est recréé. Conservez le travail inachevé dans l'état durable de l'application, pas uniquement dans cette variable. Dans `mug-shop`, « achat de l'étiquette toujours en attente » est un tel état.

Après avoir implémenté `shipmentLifecycle`, rendez-le ainsi que `CartEntity` disponibles dans `src/App.hs`. Ce **fragment d'enregistrement** le relie aux événements Cart :

```haskell
    |> Application.withOutboundLifecycle @() @CartEntity (\_ -> shipmentLifecycle)
```

`shipmentLifecycle` doit être votre valeur `OutboundConfig state` avec les trois fonctions ci-dessus ; il ne s'agit pas d'une implémentation de colis fournie. N'utilisez cette couche que lorsque son cycle de vie de ressource est utile. La plupart des demandes fournisseur peuvent rester sans état.

## Recevoir du travail externe

`Integration.inbound` enveloppe une `InboundConfig` dont la fonction `run` reçoit un callback d'émission. Le worker transforme les informations entrantes en commandes. Au démarrage de l'application, les workers entrants enregistrés sont lancés.

Une intégration webhook a toujours besoin d'un véritable écouteur, de l'authentification ou vérification de signature du fournisseur, de limites d'entrée et d'une stratégie d'accusé de réception. L'abstraction ne génère pas automatiquement un serveur webhook. De même, un consommateur de file a besoin d'une politique délibérée pour l'accusé de réception, la redélivrance et la progression durable.

## Prouver l'adaptateur avant de le livrer

Utilisez `Integration.getActions` pour inspecter les actions sélectionnées par un handler et `Integration.runAction` avec un `ActionContext` contrôlé pour exercer l'exécution. Les fonctions pures de construction de demandes sont particulièrement utiles pour tester les correspondances de protocole sans envoyer de trafic.

Placez les tests de l'adaptateur à côté des autres tests dans votre répertoire `tests/`. Exécutez `neo build` après l'ajout du module, puis `neo test` pour ses correspondances de demandes et ses cas d'erreur. Vérifiez une entrée valide, un refus du fournisseur, des données de succès mal formées, des identifiants absents, un timeout, une invocation en double et une réponse perdue après un succès distant. Comptez les demandes avec un serveur contrôlé. Enfin, exécutez `neo run` avec des identifiants sandbox et vérifiez le contrat du fournisseur au moyen des commandes et de la requête de résultat de votre application.

**Exercice :** empaquetez pour le projet d'exercice une recherche d'état d'expédition contre un fournisseur de test contrôlé. Demandez à un autre lecteur de la configurer en utilisant uniquement l'API publique de demande. S'il doit comprendre le parsing HTTP interne pour choisir les options ordinaires, révisez ensemble l'API et la documentation.

Revenez à [l'exécution de l'application](/fr/operate/deployment/) pour les dépendances d'exécution, la configuration et la planification de la récupération.

<details>
<summary>Notes sur le code source du framework</summary>

- [core/service/Integration.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Integration.hs)
- [core/service/Integration/Command.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Integration/Command.hs)
- [core/service/Integration/Lifecycle.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Integration/Lifecycle.hs)
- [integrations/Integration/OpenRouter/Internal.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/OpenRouter/Internal.hs)
- [testbed/src/Testbed/Cart/Integrations/EventCounter.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/Testbed/Cart/Integrations/EventCounter.hs)
- [testbed/src/App.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/App.hs)
- [core/service/Service/Application/Integrations.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Application/Integrations.hs)

</details>
