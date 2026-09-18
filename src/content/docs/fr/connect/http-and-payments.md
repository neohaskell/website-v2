---
title: Appeler des API HTTP externes
description: Connectez des API externes sans confondre une demande avec une opération terminée.
sidebar:
  order: 2
---
<!-- translation-source-sha256: c57edfc06dcb49ed47a18d2adbe3eff8741f6a3f550f554e6bbcef0aa77e05ca -->

Votre application envoie une demande à un autre service, mais la connexion se ferme avant l'arrivée de la réponse. Le service a-t-il refusé le travail, ou la réponse a-t-elle disparu après l'exécution du travail ? Une intégration HTTP doit gérer cette incertitude ainsi que les réussites et les échecs ordinaires.

NeoHaskell fournit le mécanisme de demande ; votre application interprète la réponse du fournisseur et décide quelles opérations peuvent être répétées sans danger. Nous commencerons par une recherche de statut, puis utiliserons un paiement simulé dans le projet de commerce en ligne pour exercer un transfert aux conséquences plus importantes.

Prérequis : [cycle de vie des intégrations](/fr/connect/) et [configuration](/fr/build/configuration/).

## Placer l'appel fournisseur dans votre projet

Continuez depuis votre répertoire `mug-shop` et terminez la [configuration des intégrations](/fr/connect/#prepare-your-project). Conservez le helper de protocole dans `src/Shop/Integrations/ProviderStatus.hs`. Le handler côté panier qui choisit quand l'appeler appartient à `src/Shop/Cart/Integrations/`, en suivant le [module de handler complet](/fr/connect/workflows/#create-the-outbound-integration).

Avant d'ajouter la demande, définissez la commande qui enregistre un résultat de statut et enregistrez-la dans le service concerné avec `InternalTransport`. Donnez-lui des résultats réussi, refusé et non résolu avec un identifiant d'opération stable. La fabrique suivante est la partie demande de cette fonctionnalité ; les callbacks relient le résultat à la commande de votre application.

## Apprendre la forme d'une demande avec une lecture

Commencez par une opération qui lit le statut du fournisseur. Dans cette **fabrique d'intégration partielle**, `statusUrl`, `recordReply` et `recordFailure` sont des valeurs fournies par votre application. Les deux callbacks renvoient un unique type de commande enregistré.

```haskell
-- Inside the event handler's Integration.batch:
Integration.outbound Http.Request
  { method = Http.GET
  , url = statusUrl
  , headers = []
  , body = Http.noBody
  , onSuccess = recordReply
  , onError = Just recordFailure
  , auth = Http.Bearer "${SHOP_PROVIDER_TOKEN}"
  , retry = Http.defaultRetry
  , timeoutSeconds = 15
  }
```

Les valeurs d'URL et d'en-têtes prennent en charge la substitution depuis l'environnement. L'authentification prend en charge `NoAuth`, `Bearer`, `Basic` et `ApiKey` dans un en-tête nommé. Les variables d'environnement manquantes lèvent une erreur d'authentification d'intégration pendant la préparation ; elles n'atteignent pas nécessairement `onError`.

`Http.Response` porte `statusCode`, un corps JSON `body` et les `headers` de la réponse. **Inspectez le statut dans votre callback.** Le callback nommé `onSuccess` est le chemin de réponse ; ce n'est pas une déclaration que le fournisseur a approuvé l'opération métier.

Pour les corps de requête, utilisez `Http.json`, `Http.form`, `Http.raw` ou `Http.noBody`. L'adaptateur actuel prend en charge le JSON pour POST, PUT et PATCH ; les corps form et bruts sont implémentés pour POST. GET et DELETE n'utilisent pas le corps fourni. Les réponses sont décodées par le client JSON : un fournisseur qui renvoie du contenu vide ou non JSON nécessite des tests de compatibilité explicites ou un adaptateur personnalisé.

## Passer de HTTP au sens du paiement

Utilisez un fournisseur de test pour modéliser un paiement dans le projet d'exercice :

1. Enregistrer une tentative de paiement applicative avec un identifiant stable et le montant/la devise de la commande.
2. Construire la demande fournisseur à partir de l'état applicatif de confiance.
3. Utiliser le mécanisme d'idempotence documenté par le fournisseur lorsqu'il en propose un. Cela nécessite un travail propre au fournisseur.
4. Décoder et valider sa réponse, en conservant son identifiant d'opération.
5. Enregistrer les résultats confirmé, refusé ou non résolu au moyen de commandes.
6. Réconcilier les tentatives non résolues en demandant au fournisseur leur statut réel.

Ce sont des étapes de conception, pas un adaptateur de paiement fourni. Choisissez et vérifiez séparément l'API actuelle d'un fournisseur. Le retour d'un client sur une page de succès ne constitue pas à lui seul une preuve de confirmation du paiement.

Pour les callbacks du fournisseur, validez l'authenticité avant de traduire les données entrantes en commande. L'abstraction générique de worker entrant ne fournit ni vérificateur de signature de fournisseur de paiement, ni route webhook pour vous.

## Comprendre la limite actuelle des nouvelles tentatives

Le record `Retry` du code source documente `maxAttempts` comme incluant la première tentative. L'exécuteur actuel compare `attempt <= maxAttempts` avant de réessayer, ce qui peut autoriser une tentative supplémentaire. Son preset `noRetry` ne doit donc pas être traité comme une garantie qu'une demande en échec n'est envoyée qu'une seule fois.

L'exécuteur réessaie également les erreurs de demande indépendamment de sa liste de codes de statut. Ne déduisez pas que seuls les statuts listés peuvent provoquer une autre demande. Ces limites d'implémentation comptent pour les débits, les appels IA facturés et les achats d'étiquettes ; testez le nombre réel de demandes avec un endpoint contrôlé avant d'approuver ces opérations.

Les timeouts ne prouvent pas non plus que le système distant n'a rien fait. Conservez un résultat non résolu jusqu'à disposer de preuves.

## Exécuter une vérification de statut contrôlée

Exécutez `neo build` depuis `mug-shop` après avoir ajouté le helper et la commande de callback. Exercez la correspondance des statuts dans votre suite sous `tests/` avec `neo test`, notamment avec une réponse d'erreur JSON valide. Démarrez votre application avec `neo run`, déclenchez la demande via sa commande et inspectez la requête de statut obtenue. Utilisez un endpoint contrôlé avant de connecter des identifiants de paiement.

## Exercice : une réponse de paiement perdue

Décrivez l'état de l'application d'exercice après un timeout, ce que montre son écran et comment vous résoudriez l'incertitude. Réfléchissez ensuite aux éléments qui s'appliquent aussi à la création d'une entrée de calendrier ou à la soumission d'un document pour traitement.

<details>
<summary>Vérifications suggérées</summary>

Utilisez un fournisseur de test qui accepte une opération puis abandonne la connexion. Vérifiez qu'une demande répétée ne peut pas débiter deux fois selon le contrat du fournisseur choisi. Vérifiez un refus, un JSON mal formé, un statut d'erreur JSON valide, un ID d'opération inconnu et un résultat de rapprochement ultérieur. Enregistrez séparément la vérification sandbox du vrai fournisseur et les tests unitaires de correspondance des réponses.

</details>

Pour une intégration fournisseur plus petite, continuez avec [l'e-mail](/fr/connect/email/).

<details>
<summary>Notes sur le code source du framework</summary>

- [integrations/Integration/Http/Request.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Http/Request.hs)
- [integrations/Integration/Http/Response.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Http/Response.hs)
- [integrations/Integration/Http/Internal.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Http/Internal.hs)
- [integrations/Integration/Http/Retry.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Http/Retry.hs)
- [integrations/test/Integration/Http/InternalSpec.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/test/Integration/Http/InternalSpec.hs)
- [core/service/Integration.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Integration.hs)

</details>
