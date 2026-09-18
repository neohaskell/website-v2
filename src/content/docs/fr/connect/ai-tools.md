---
title: Contraindre les outils IA
description: Laissez un modèle proposer une action structurée tout en laissant l'application posséder les règles.
sidebar:
  order: 8
---
<!-- translation-source-sha256: 303adcc973af9939e5f428e90a83d37e040b68f56ba2051b875ff15b9d03b74e -->

Un modèle peut transformer une demande en langage courant en proposition structurée : ajouter un article, planifier une tâche ou mettre à jour un brouillon. Votre application décide toujours quel objet peut changer, si les valeurs proposées sont valides et si la personne doit confirmer l'action.

L'intégration d'agent de NeoHaskell décrit les outils avec des schémas de commandes et décode les arguments renvoyés en commande. Elle structure le transfert. Elle ne rend pas fiables les arguments générés par le modèle et ne donne pas au modèle l'identité de l'utilisateur. Nous allons nous exercer avec « Je veux deux tasses bleues » dans l'exemple de commerce en ligne.

Prérequis : [les demandes IA](/fr/connect/ai/), les [commandes](/fr/build/commands-and-events/) et les [permissions](/fr/build/access-control/).

## Étendre le même projet mug-shop

Terminez la [configuration des intégrations](/fr/connect/#prepare-your-project). Placez le helper de demande du modèle dans `src/Shop/Integrations/CartAssistant.hs` et définissez sa commande de proposition sous `src/Shop/Cart/Commands/`. Enregistrez cette commande auprès du service Cart avec `InternalTransport` avant d'ajouter le handler dans `src/App.hs`.

La commande constitue un nouveau comportement applicatif. N'exposez pas le `AddItem` existant comme outil du modèle en supposant que sa vérification de quantité positive constitue une politique de propriété. Commencez par une proposition que l'acheteur peut inspecter avant qu'une action séparément autorisée ne modifie le panier.

## Commencer par une commande de proposition

Commencez par une commande qui enregistre une proposition à réviser. Pour le panier d'exercice, laissez le passage en caisse, les paiements et les actions irréversibles hors de sa portée. Le serveur doit lier lui-même le contexte de panier et d'utilisateur de confiance, plutôt que d'accepter des affirmations de propriété générées par le modèle.

`Agent.commandTool @YourCommand` obtient le nom transmis par `NameOf`, la description par `Documented` et le schéma JSON par `ToSchema`. Utilisez le marqueur de commande et les [conventions de commande](/fr/build/commands-and-events/) établies ; fournissez les instances de schéma et de documentation requises par le véritable chemin de dérivation de votre commande.

L'expression suivante est une **expression de demande partielle**, pas une implémentation complète de commande :

```haskell
Agent.agent
  customerMessage
  [proposalTool]
  modelName
  recordProposalFailure
  |> Integration.outbound
```

`proposalTool` est un `CommandTool`, généralement lié une fois avec `Agent.commandTool`. Le type `command` de la demande doit prendre en charge l'encodage/décodage JSON et un nom de commande. Son callback d'erreur renvoie ce même type ; ce type doit donc représenter délibérément l'échec comme la proposition réussie.

L'instance d'exécution actuelle se trouve dans `Integration.Agent.Internal`. Bien que la description de l'API soit indépendante du fournisseur, cette implémentation envoie les demandes via OpenRouter à l'aide de `OPENROUTER_API_KEY`.

## Comprendre exactement ce qui s'exécute

L'implémentation actuelle :

1. Refuse une liste d'outils vide via le callback d'erreur.
2. Envoie une demande sans streaming avec un choix d'outil obligatoire.
3. Lit le premier appel d'outil du premier choix.
4. Vérifie que le nom d'outil renvoyé fait partie des noms autorisés.
5. Décode ses arguments comme l'unique type `Request command`.
6. Émet cette commande vers le dispatcher de l'application.

Elle n'exécute pas de boucle de planification en plusieurs étapes et n'exécute pas chaque appel d'outil d'une réponse.

**Plusieurs descriptions d'outils ne distribuent pas automatiquement les appels vers différents types de commandes Haskell.** Toutes les formes d'arguments renvoyées doivent se décoder vers l'unique type cible de la requête. Une conception avec somme/enveloppe nécessite un décodeur explicite et testé ; commencez par une seule forme d'outil compatible.

## Garder l'autorité dans l'application

Le dispatcher d'intégration utilise un contexte système de confiance pour les commandes émises. Cela contourne la barrière d'accès externe ; ce n'est pas le contexte de demande authentifié de l'utilisateur d'origine. Les règles métier de la commande restent importantes, mais vous devez concevoir explicitement la limite d'identité et d'autorité.

Pour un assistant qui agit sur des demandes d'utilisateurs, une première conception sûre consiste à enregistrer une proposition liée aux informations de demande de confiance, à l'afficher à l'utilisateur et à exiger une commande de confirmation normalement autorisée. Traitez tout ID d'entité ou toute affirmation de permission générés par le modèle comme des entrées non fiables.

Une liste blanche de noms d'outils empêche l'acceptation d'un nom non autorisé. Elle ne prouve pas que les arguments d'un nom autorisé sont sûrs. De même, un prompt système guide le modèle mais ne constitue pas un mécanisme d'autorisation.

## Tester la limite de proposition

Exécutez `neo build` pour vérifier la nouvelle commande de proposition et les types de demande du modèle. Ajoutez des réponses d'appels d'outils fixes à votre suite sous `tests/` et exécutez `neo test`, en particulier une réponse qui nomme un autre panier. Avec `neo run` et des identifiants de développement, faites une demande en direct et inspectez la proposition avant de la confirmer. Le résumé ordinaire du panier ne doit changer que par l'action de suivi autorisée.

## Répéter un malentendu

> **Jess :** « L'acheteur a demandé deux tasses. Pourquoi la proposition mentionne-t-elle un autre panier ? »
>
> **Agent :** « Le modèle a inclus cet identifiant de panier. »
>
> **Jess :** « Lie la proposition au panier de la demande authentifiée et refuse les identifiants contradictoires. Montre-moi le test. »

Vérifiez les outils vides, les noms inconnus, les arguments mal formés, l'absence d'appel d'outil, plusieurs appels renvoyés, les quantités invalides, l'identifiant d'un autre client et un prompt en apparence inoffensif qui demande au modèle d'ignorer ses restrictions. Inspectez séparément la proposition et le résultat finalement confirmé.

**Exercice :** décidez si un nom de produit ambigu doit créer une proposition ou demander une précision à l'acheteur. Écrivez le résultat attendu avant d'interroger le modèle. La règle d'acceptation doit rester stable lorsque vous changez de modèle.

Si vous avez besoin d'un comportement fournisseur différent ou d'une boucle d'exécution plus riche, continuez avec les [intégrations personnalisées](/fr/connect/custom-integrations/).

<details>
<summary>Notes sur le code source du framework</summary>

- [integrations/Integration/Agent.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Agent.hs)
- [integrations/Integration/Agent/Types.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Agent/Types.hs)
- [integrations/Integration/Agent/Internal.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Agent/Internal.hs)
- [integrations/test/Integration/Agent/CompileSpec.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/test/Integration/Agent/CompileSpec.hs)
- [core/service/Service/Integration/Dispatcher.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Integration/Dispatcher.hs)

</details>
