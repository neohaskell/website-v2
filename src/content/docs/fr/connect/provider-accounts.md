---
title: Connecter des comptes externes avec OAuth2
description: Reliez un compte externe en gardant explicites le consentement, les identifiants et les résultats applicatifs.
sidebar:
  order: 3
---
<!-- translation-source-sha256: 17a8eb2e9c99df4613009c86e429a7d033d17de068e3960a586f7cd24ebcdffc -->

Une personne veut que votre application utilise un compte qu'elle détient ailleurs, par exemple un agenda, un service documentaire ou un outil de comptabilité. Elle doit pouvoir autoriser cette connexion sans donner à votre application le mot de passe du fournisseur. OAuth2 fournit un parcours de consentement et des identifiants pour les accès ultérieurs.

Cela diffère de la connexion à votre application. L'authentification JWT identifie son utilisateur ; les tokens OAuth2 du fournisseur autorisent l'accès à un compte externe. Pour le projet d'exercice, envisagez de connecter un compte de comptabilité de test. Le consentement est une partie de cette fonctionnalité ; la création de factures ou l'export de commandes nécessiterait un adaptateur distinct.

Commencez par le [contrôle d'accès de l'application](/fr/build/access-control/) et les [résultats d'intégration](/fr/connect/). Choisissez les permissions minimales du fournisseur nécessaires à la fonctionnalité réelle.

## Donner une place à la connexion dans mug-shop

Continuez dans le projet créé par `neo new`. Placez la configuration du fournisseur et les helpers d'encodage des callbacks dans `src/Shop/Integrations/Accounts.hs` et câblez-les depuis `src/App.hs`. Les modules OAuth2 et de stockage des secrets proviennent du package core ; vous n'avez pas besoin du package d'intégrations fournisseur pour monter les routes de consentement.

Ajoutez d'abord à un service enregistré par votre application les commandes `InternalTransport` pour les résultats connecté, échoué et déconnecté. Une requête doit afficher l'état de la connexion sans exposer les tokens. Il s'agit de nouvelles fonctionnalités de connexion de compte ; Cart et Stock restent les premières tranches de l'application.

## Établir la compatibilité du fournisseur

Le core fournit un workflow de code d'autorisation configurable avec PKCE, pas un preset pour fournisseur comptable. Un `Provider` contient `name`, `authorizeEndpoint` et `tokenEndpoint`. Confirmez que le fournisseur choisi prend en charge le véritable format d'échange du client : les paramètres de formulaire incluent `client_id`, `client_secret` et le vérificateur PKCE. Les scopes propres au fournisseur, les paramètres d'autorisation supplémentaires et les opérations API nécessitent leur propre travail de compatibilité.

Au démarrage, le système valide les endpoints du fournisseur pour HTTPS et les restrictions d'adresses réseau, puis rejette les noms en double. Construisez l'URI de callback avec `OAuth2.mkRedirectUri`, gérez son `Result` et enregistrez cette même URI auprès du fournisseur. HTTPS est obligatoire, sauf pour les adresses localhost de développement prises en charge.

## Câbler la connexion du compte

Il s'agit d'une **fabrique applicative partielle**. L'application environnante doit déjà enregistrer son transport et ses services. `identityServerUrl`, `accountProviderConfig` et `existingSecretStore` sont des valeurs que vous fournissez :

```haskell
    |> Application.withAuth @() (\_ -> identityServerUrl)
    |> Application.withSecretStore @() (\_ -> existingSecretStore)
    |> Application.withOAuth2StateKey "SHOP_OAUTH_STATE_KEY"
    |> Application.withOAuth2Provider @() (\_ -> accountProviderConfig)
```

Le réglage de clé d'état nomme une variable d'environnement contenant un secret d'au moins 32 octets. Définissez-la avant le démarrage. `withOAuth2StateKey` doit précéder l'enregistrement du fournisseur. Pour les valeurs dépendantes de la configuration, remplacez les fabriques `@()` par des fonctions issues du type de configuration enregistré par `Application.withConfig`.

`withSecretStore` et `withOAuth2Provider` acceptent tous deux des **fonctions fabrique**, pas directement un magasin ou un record de fournisseur. Un magasin qui nécessite du travail au démarrage doit être construit par votre conception de démarrage avant de renvoyer son handle depuis la fabrique ; cette API n'accepte pas une `Task` comme résultat de la fabrique.

La configuration du fournisseur possède ce **fragment de construction de record** :

```haskell
OAuth2ProviderConfig
  { provider = selectedProvider
  , clientId = registeredClientId
  , clientSecret = registeredClientSecret
  , redirectUri = validatedCallbackUri
  , scopes = requestedScopes
  , onSuccess = encodeConnected
  , onFailure = encodeConnectionFailure
  , onDisconnect = encodeDisconnected
  , successRedirectUrl = connectedPage
  , failureRedirectUrl = failedPage
  }
```

`OAuth2ProviderConfig` est défini dans `Auth.OAuth2.Provider`. Les IDs clients, secrets, URI de redirection et scopes utilisent les types de `Auth.OAuth2.Types` ; utilisez ses constructeurs intelligents pour les secrets et les URI de redirection validées. Gardez les identifiants dans la [configuration secrète](/fr/build/configuration/).

## Suivre les trois routes

| Demande prévue | Ce qui se passe |
| --- | --- |
| `GET /connect/{provider}` | Authentifie l'utilisateur et le redirige vers le consentement du fournisseur |
| `GET /callback/{provider}?code=…&state=…` | Vérifie l'état signé, consomme la transaction sauvegardée et échange le code |
| `POST /disconnect/{provider}` | Authentifie l'utilisateur et tente la suppression locale du token |

La route de connexion accepte un header bearer et un fallback par token de requête pour les redirections du navigateur. Préférez le header lorsque c'est possible ; empêchez les URL porteuses de tokens d'entrer dans les journaux de l'application ou du proxy. Le callback utilise l'état signé et la transaction sauvegardée au lieu d'exiger un JWT de la redirection du fournisseur.

L'état expire après cinq minutes. Sa transaction conserve côté serveur l'identité de l'utilisateur et le vérificateur PKCE et est consommée une fois. Un échange échoué nécessite donc de démarrer une nouvelle connexion au lieu de rejouer le même callback.

## Transformer le consentement en résultat applicatif

Après un échange réussi, les tokens sont stockés avant que `onSuccess` ne reçoive l'ID utilisateur authentifié et une `TokenKey`. Chaque callback renvoie du texte JSON au format `Integration.CommandPayload` ; construisez-le avec `Integration.encodeCommand` autour d'une commande applicative enregistrée.

`encodeConnected` gère `Text -> TokenKey -> Text` ; `encodeConnectionFailure` gère `Text -> OAuth2Error -> Text` ; `encodeDisconnected` gère `Text -> Text`. Les commandes obtenues peuvent être de types différents parce que la limite du callback est encodée en texte. Gardez les tokens bruts hors des payloads de commandes et des événements. Laissez la commande de connexion enregistrer l'association applicative et une référence appropriée, puis exposez son résultat par une requête.

Ne considérez pas l'arrivée sur une URL de succès comme la preuve que la fonctionnalité connectée fonctionne. Testez séparément la distribution de la commande du callback et une véritable opération API du fournisseur. Les erreurs avant l'échange et les redirections de refus de consentement sans `code` n'appellent pas nécessairement `onFailure` ; le callback web actuel attend `code` et `state`.

## Planifier la durée de vie des identifiants

Le magasin de secrets par défaut est en mémoire. Implémentez et fournissez un stockage durable des secrets avant de promettre que les connexions survivront à un redémarrage. L'application actuelle crée également un magasin de transactions en mémoire : un redémarrage pendant le consentement fait perdre la transaction, et plusieurs instances nécessitent un routage délibéré des callbacks ou une autre intégration de magasin de transactions.

`TokenRefresh.withValidToken` est un helper explicite destiné aux auteurs d'adaptateurs. Il lit les tokens stockés, exécute l'action fournie et actualise le token sur une erreur identifiée par le prédicat non autorisé de l'appelant. Il stocke les tokens actualisés et réessaie l'action une fois. Il ne planifie pas d'actualisation préventive depuis `expiresInSeconds` ; ses verrous d'actualisation par clé restent locaux au processus.

Des tokens manquants, des refresh tokens manquants ou une actualisation échouée nécessitent un résultat de reconnexion. La déconnexion de compte tente actuellement une suppression locale mais ignore les erreurs de suppression et n'appelle pas d'endpoint de révocation du fournisseur. Vérifiez la suppression et implémentez la révocation du fournisseur lorsque le produit l'exige ; « déconnecté » ne constitue pas une preuve de révocation distante.

## Exécuter le parcours de connexion localement

Exécutez `neo build` et `neo test` depuis `mug-shop` après avoir enregistré les commandes de résultat et la configuration du compte. Démarrez `neo run` avec vos identifiants client de développement et la clé d'état, en utilisant auprès du fournisseur le callback localhost enregistré. Suivez le consentement et inspectez la requête de connexion. Testez séparément un appel API du fournisseur ; l'arrivée sur une page de redirection n'établit pas l'accès à l'API.

## Exercice : consentement interrompu

Demandez à votre agent de démontrer une connexion, un état altéré ou rejoué, un refus de consentement, un redémarrage pendant le consentement, un échec d'actualisation et une déconnexion avec un magasin de secrets en échec. Expliquez ensuite ce que voit la personne qui connecte son compte dans chaque cas.

Conservez les vérifications contrôlées de routes et d'actualisation dans la suite de tests de votre projet. Elles ne certifient pas un fournisseur comptable particulier. Enregistrez séparément la vérification sandbox de ce fournisseur, puis construisez le véritable [adaptateur fournisseur](/fr/connect/custom-integrations/).

<details>
<summary>Notes sur le code source du framework</summary>

- [Câblage de l'application](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Application.hs)
- [Configuration du fournisseur](https://github.com/neohaskell/NeoHaskell/blob/main/core/auth/Auth/OAuth2/Provider.hs)
- [Types OAuth2 et validation des URI](https://github.com/neohaskell/NeoHaskell/blob/main/core/auth/Auth/OAuth2/Types.hs)
- [Format d'échange client](https://github.com/neohaskell/NeoHaskell/blob/main/core/auth/Auth/OAuth2/Client.hs)
- [Cycle de vie des routes](https://github.com/neohaskell/NeoHaskell/blob/main/core/auth/Auth/OAuth2/Routes.hs)
- [Câblage des routes HTTP](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Transport/Web.hs)
- [Interface du magasin de secrets](https://github.com/neohaskell/NeoHaskell/blob/main/core/auth/Auth/SecretStore.hs)
- [Helper d'actualisation](https://github.com/neohaskell/NeoHaskell/blob/main/core/auth/Auth/OAuth2/TokenRefresh.hs)
- [Tests des routes](https://github.com/neohaskell/NeoHaskell/blob/main/core/test/Auth/OAuth2/RoutesSpec.hs)
- [Tests d'actualisation](https://github.com/neohaskell/NeoHaskell/blob/main/core/test/Auth/OAuth2/TokenRefreshSpec.hs)

</details>
