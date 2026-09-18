---
title: Ajouter une assistance IA à l'application
description: Rendez les suggestions générées utiles, délimitées et révisables.
sidebar:
  order: 7
---
<!-- translation-source-sha256: f2d45b6e68597c4201ea1d07c613eabc1aa78f902690d3af8674a1d17ca58fae -->

Utiliser un agent pour écrire du code et ajouter une fonctionnalité d'IA à ce code sont deux relations différentes. Une fonctionnalité applicative peut résumer des notes, rédiger un texte ou aider à interpréter un document. Elle a besoin de ses propres entrées, permissions, limites de dépense, états d'échec et règles d'acceptation.

Une première fonctionnalité utile propose un texte à réviser. Dans le projet d'exercice de commerce en ligne, Jess générera un brouillon de description de produit à partir de faits fournis. Elle pourra inspecter et approuver le brouillon tout en gardant le reste de l'application utilisable si le fournisseur est indisponible.

## Garder la fonctionnalité dans votre application

Travaillez depuis `mug-shop` et terminez la [configuration des intégrations](/fr/connect/#prepare-your-project). Placez le helper de requête dans `src/Shop/Integrations/ProductDraft.hs`. Ajoutez les commandes et événements pour demander, enregistrer et accepter un brouillon dans la zone applicative qui possède les informations produit. Cart et Stock ne fournissent pas déjà cette fonctionnalité.

Donnez aux commandes de résultat du fournisseur `InternalTransport` ; la demande de brouillon destinée à l'utilisateur et son approbation restent des commandes publiques séparées. Câblez son service, sa requête et son handler sortant dans `src/App.hs`, en suivant les [commandes](/fr/build/commands-and-events/) et [l'enregistrement d'un handler](/fr/connect/workflows/). La fabrique ci-dessous fournit l'appel du fournisseur ; votre workflow fournit ses entrées et ses callbacks.

## Modéliser un brouillon avant de faire une demande

Un workflow de brouillon enregistre une demande, appelle le fournisseur et enregistre soit le texte généré, soit un échec. L'acceptation est une commande distincte. Dans l'exemple, conservez l'identifiant du produit et l'identité de la demande afin qu'une réponse tardive ne remplace pas un brouillon plus récent.

Le callback du fournisseur vous indique qu'une réponse a été décodée avec succès. Il n'établit ni l'exactitude factuelle, ni l'adéquation à la publication, ni la conformité aux règles de l'application.

## Construire une demande OpenRouter

Cette **fabrique partielle** demande un brouillon court. `modelName` provient de la configuration du fournisseur choisi ; `productFacts` ne contient que des entrées approuvées. `recordDraftResponse` doit inspecter la réponse et produire le même type de commande que `recordDraftFailure`.

```haskell
Integration.outbound OpenRouter.Request
  { messages =
      [ OpenRouter.system
          "Draft a short product description using only the supplied facts."
      , OpenRouter.user productFacts
      ]
  , model = modelName
  , config = OpenRouter.defaultConfig
      { OpenRouter.maxTokens = Just 300
      , OpenRouter.timeoutSeconds = 30
      }
  , onSuccess = recordDraftResponse
  , onError = recordDraftFailure
  }
```

L'adaptateur obtient son bearer token depuis `OPENROUTER_API_KEY`. Choisissez et vérifiez indépendamment un modèle actuellement disponible ; les identifiants de modèles présents dans d'anciens exemples ne garantissent pas leur disponibilité actuelle.

La réponse contient `choices` et un champ `usage` facultatif. Gérez un tableau choices vide. Un choix contient son message et sa raison d'arrêt : une troncature ou un filtrage peut rendre le texte impropre même lorsque la demande HTTP a réussi. Le contenu du message peut être un texte simple ou plusieurs parties de contenu.

Cette intégration effectue une demande sans streaming. Elle convient à un workflow de brouillon en arrière-plan ; elle n'implémente pas à elle seule une interface de chat en streaming, le stockage d'une conversation ou un système de récupération.

## Utiliser Azure AI lorsque c'est approprié

Les demandes Azure possèdent un endpoint validé explicitement et une clé API masquée. Le helper se trouve dans `Integration.AzureAI`. Commencez par :

```haskell
AzureAI.azureEndpoint endpointText
```

Cela renvoie `Result Text AzureEndpoint` ; traitez un endpoint invalide comme un problème de configuration. `azureEndpointAllowing` autorise des suffixes d'hôtes de confiance supplémentaires pour votre déploiement. Gardez ces suffixes sous le contrôle des opérateurs.

Un **fragment d'expression**, après validation et avec une liaison de configuration implicite réelle, est :

```haskell
AzureAI.chatCompletion
  validatedEndpoint
  [AzureAI.system "Use only supplied product facts.", AzureAI.user productFacts]
  deploymentName
  recordDraftResponse
  recordDraftFailure
```

Le helper lit `?config.azureAiApiKey :: Redacted Text`. Pour un câblage explicite des identifiants, construisez `AzureAI.Request` avec `apiKey` et une configuration dont `endpoint` est la valeur validée. N'utilisez pas la configuration par défaut seule comme configuration complète d'un endpoint. Le code source fixe une version d'API par défaut ; vérifiez sa compatibilité avec votre déploiement.

## Exécuter un brouillon dans le workflow

Exécutez `neo build` après avoir ajouté le service et le handler de brouillon à `mug-shop`. Utilisez `neo test` avec des fixtures de réponses fixes ; ces vérifications ne devraient pas avoir besoin d'un modèle en direct. Démarrez `neo run` avec l'identifiant du fournisseur, demandez un brouillon et inspectez sa requête. Confirmez que le texte généré reste non approuvé tant que votre commande d'acceptation séparée n'a pas réussi.

## Donner à Jess des preuves au-delà d'un joli paragraphe

> **Agent :** « Le modèle a renvoyé une description, je la publie donc. »
>
> **Jess :** « Montre-moi la commande qui approuve la publication. Le texte généré doit rester un brouillon jusqu'à ce que je l'accepte. »

Testez la gestion des réponses avec des fixtures fixes avant de tester un modèle en direct. Vérifiez l'absence de choix, les affirmations indésirables, la troncature, le refus du fournisseur et l'arrivée d'une réponse après la modification des faits produit. Constituez un petit jeu d'évaluation de faits produit et de sorties inacceptables. Les appels en direct vérifient la connectivité et l'adéquation à votre charge de travail, tandis que les tests unitaires vérifient vos règles déterministes.

La [limite actuelle sur les nouvelles tentatives HTTP](/fr/connect/http-and-payments/#understand-the-current-retry-boundary) s'applique également aux appels de fournisseurs. Une expiration de délai ne prouve pas qu'aucun travail facturable n'a eu lieu. Définissez une politique de dépense applicative et alignez les délais des demandes fournisseur sur le [budget du dispatcher](/fr/connect/documents/#budget-the-entire-operation).

**Exercice :** ajoutez une action de régénération au projet d'exercice. Décidez si une réponse plus ancienne en cours peut la remplacer, puis testez les réponses qui arrivent dans l'ordre inverse.

Continuez vers les [outils IA](/fr/connect/ai-tools/) uniquement lorsque vous êtes prêt à ce que le modèle propose des actions structurées.

<details>
<summary>Notes sur le code source du framework</summary>

- [integrations/Integration/OpenRouter/Request.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/OpenRouter/Request.hs)
- [integrations/Integration/OpenRouter/Internal.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/OpenRouter/Internal.hs)
- [integrations/Integration/OpenRouter/Response.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/OpenRouter/Response.hs)
- [integrations/Integration/AzureAI/Request.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/AzureAI/Request.hs)
- [integrations/test/Integration/AzureAI/RequestSpec.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/test/Integration/AzureAI/RequestSpec.hs)

</details>
