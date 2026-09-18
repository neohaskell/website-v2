---
title: Envoyer un e-mail
description: Enregistrez l'acceptation du fournisseur et rendez visible l'échec d'une notification.
sidebar:
  order: 4
---
<!-- translation-source-sha256: 674d034499dc89d8cee7ca9de783120958d78666c98ee3fb6adfdf247ef01e54 -->

Un e-mail fournit aux personnes un résultat qu'elles peuvent inspecter en dehors de votre application : une notification, une invitation ou une confirmation. Il introduit aussi une distinction importante : l'acceptation d'un message par un fournisseur ne prouve pas que le destinataire l'a reçu ou lu.

NeoHaskell inclut des types de demandes Brevo et Azure Communication Services (ACS). Nous utiliserons une confirmation de commande du projet d'exercice pour apprendre le modèle de demande et de callback. Les identifiants du fournisseur, la configuration d'un expéditeur vérifié et la livraison réelle sont des tâches distinctes ; commencez par un destinataire de test que vous contrôlez.

## Ajouter l'e-mail à mug-shop

Utilisez votre projet existant et terminez la [configuration des intégrations](/fr/connect/#prepare-your-project). Placez le helper de construction de demande dans `src/Shop/Integrations/Email.hs`. Son appelant est un handler sortant dans la partie de l'application qui possède la demande de notification. Enregistrez ce handler dans `src/App.hs` avec le modèle de [workflows](/fr/connect/workflows/).

Une confirmation de commande nécessite la commande et le workflow de notification que vous concevez ci-dessous ; elle n'existe pas simplement parce que Cart et Stock compilent. Commencez par une demande de notification contrôlée avant de l'intégrer au passage en caisse.

## Définir d'abord le résultat

Utilisez une commande applicative déclarée avec `InternalTransport` et capable de représenter l'acceptation et l'échec du fournisseur. Elle doit transporter l'identifiant de notification et tout identifiant nécessaire pour la relier à l'action d'origine. Sa branche de succès enregistre l'ID de message/d'opération du fournisseur ; sa branche d'échec enregistre une explication sûre que l'application peut afficher.

Déclenchez l'e-mail à partir d'un événement confirmé. Dans l'exemple, un échec de notification ne doit pas faire disparaître la commande acceptée. Pour renvoyer sans danger, modélisez la tentative de notification et décidez comment gérer les envois en double.

## Configurer une demande Brevo

Cette **fabrique partielle** décrit un message en texte brut. `emailKey` est une valeur d'identifiant `Redacted Text` ; `recordAccepted` et `recordFailed` renvoient le même type de commande. Les adresses sont des exemples fictifs.

```haskell
Brevo.Request
  { sender = Brevo.sender "orders@example.com"
  , to = [Brevo.recipient customerEmail]
  , subject = "Your mug order"
  , body = Brevo.TextBody "We have received your order."
  , cc = []
  , bcc = []
  , replyTo = Nothing
  , tags = []
  , apiKey = emailKey
  , onSuccess = recordAccepted
  , onError = recordFailed
  }
  |> BrevoInternal.toHttpRequest
  |> Integration.outbound
```

Pour un handler d'événements sans paramètre de configuration, un modèle d'exécution pris en charge consiste à définir `emailKey` sur `Redacted.wrap "${SHOP_BREVO_API_KEY}"`. Cela stocke un placeholder dans la demande ; la couche d'authentification HTTP partagée le développe depuis l'environnement du serveur lors de l'exécution. Définissez cette variable d'environnement via la configuration secrète de votre déploiement. Ne placez pas la clé réelle dans l'événement ou le fichier source.

La conversion explicite est nécessaire avec le code source actuel : la façade Brevo expose sa fabrique de demandes mais ne fournit pas directement d'instance `ToAction (Brevo.Request command)`. `Integration.Brevo.Internal` est exposé par le package ; conserver cette conversion dans un helper applicatif unique rend ce détail d'implémentation facile à remplacer plus tard.

Utilisez `HtmlBody`, `TextBody` ou `Template` ; le type de corps n'autorise qu'une alternative à la fois. Un template porte `templateId` et une `Map Text Text` de paramètres. `Sender` et `Recipient` sont des types distincts, ce qui aide à éviter de les inverser accidentellement.

Le constructeur plus court `Brevo.send` lit `?config.brevoApiKey`. Utilisez-le uniquement lorsque cette valeur de configuration implicite est effectivement liée. Enregistrer simplement la configuration de l'application n'ajoute pas de paramètre implicite à la signature typée et pure d'un handler. La demande explicite ci-dessus rend le câblage des identifiants visible.

## Lire la réponse avec précision

L'adaptateur Brevo reconnaît HTTP 201 et décode `messageId`. Des données de réponse invalides suivent le callback d'erreur. Il associe les statuts d'authentification, de crédit de compte, de limite de débit, client et serveur à un texte d'erreur.

ACS utilise `Acs.Request`, avec `endpoint`, `sender`, `to`, `subject`, `body`, `accessToken` et les deux callbacks. Sa façade publique inclut l'instance d'exécution et peut donc être passée directement à `Integration.outbound`. La réponse acceptée d'ACS expose `operationId` ; il s'agit d'une opération d'envoi asynchrone, pas d'une confirmation de livraison. Le token est un `Redacted Text`. Fournissez séparément sa stratégie d'acquisition et de renouvellement.

Gardez les endpoints ACS dans une configuration de confiance. Son adaptateur impose HTTPS ; ce contrôle seul ne constitue pas une liste blanche d'hôtes propre à votre activité.

Les deux adaptateurs utilisent le mécanisme HTTP partagé. Lisez la [limitation actuelle des nouvelles tentatives](/fr/connect/http-and-payments/#understand-the-current-retry-boundary) avant de supposer qu'une seule tentative d'envoi sera effectuée.

## Exécuter la notification dans votre application

Utilisez `neo build` pour vérifier le helper et l'enregistrement du handler dans `mug-shop`. Exécutez `neo test` pour les fixtures de demandes et de réponses, puis démarrez `neo run` avec votre identifiant e-mail de développement dans son environnement. Demandez une notification à votre destinataire de test et inspectez la requête de résultat avant de vérifier la boîte aux lettres. Ces observations établissent des parties différentes du parcours de livraison.

## Vérifier ce que Jess peut croire

Testez d'abord la correspondance des demandes et des réponses sans envoyer de courrier, en couvrant les alternatives de corps utilisées et les réponses acceptées mal formées. Envoyez ensuite un message dans un environnement fournisseur contrôlé et inspectez à la fois le résultat applicatif et la boîte aux lettres du destinataire.

**Exercice :** le fournisseur accepte l'e-mail, mais l'enregistrement de l'acceptation échoue dans votre application. Expliquez ce que devrait faire un bouton « renvoyer ».

<details>
<summary>Raisonnement suggéré</summary>

Traitez le résultat local comme non résolu. Conservez l'identité stable de la notification et les preuves du fournisseur disponibles, définissez comment vous enquêteriez et décidez si le risque d'un e-mail en double est acceptable. Testez les événements déclencheurs en double et les résultats tardifs ainsi que les parcours ordinaires accepté/échoué.

</details>

Ensuite, apprenez comment [les pièces jointes](/fr/connect/files/) relient les octets stockés aux actions applicatives.

<details>
<summary>Notes sur le code source du framework</summary>

- [integrations/Integration/Brevo.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Brevo.hs)
- [integrations/Integration/Brevo/Request.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Brevo/Request.hs)
- [integrations/Integration/Brevo/Response.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Brevo/Response.hs)
- [integrations/Integration/Brevo/Internal.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Brevo/Internal.hs)
- [integrations/test/Integration/Brevo/InternalSpec.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/test/Integration/Brevo/InternalSpec.hs)
- [integrations/Integration/Acs/Request.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Acs/Request.hs)
- [integrations/Integration/Acs/Response.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Acs/Response.hs)
- [integrations/Integration/Acs/Internal.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Acs/Internal.hs)
- [core/core/Redacted.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/core/Redacted.hs)
- [integrations/Integration/Http/Internal.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Http/Internal.hs)
- [integrations/nhintegrations.cabal](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/nhintegrations.cabal)

</details>
