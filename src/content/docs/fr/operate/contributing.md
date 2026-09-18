---
title: Contribuer avec ce que vous avez appris
description: Passez de l'amélioration d'un exemple à la modification du comportement public de NeoHaskell avec des preuves reproductibles.
sidebar:
  order: 8
---
<!-- translation-source-sha256: dbefca9b371fec0dec055ab38c00e49b1bd762675bdbabd9570e13cc17768571 -->

Vous n'avez pas besoin de comprendre tout le framework pour l'améliorer. Une étape d'installation confuse, un cas limite manquant ou un exemple qui ne compile plus constitue un bon point de départ. Votre expérience d'apprentissage de NeoHaskell ou de construction d'une application indique où le prochain lecteur risque de rencontrer des difficultés.

La contribution part du parcours applicatif. Exploiter votre application avec confiance n'exige pas de devenir mainteneur du framework.

## Commencer par une amélioration délimitée

Un bon premier rapport indique ce que vous essayiez d'accomplir, la reproduction minimale, le comportement attendu, le résultat réel et la version concernée. Supprimez les identifiants et données privées avant de le partager.

Pour une modification de documentation, préservez le parcours d'apprentissage progressif : expliquez d'abord la situation, fournissez un exemple exact et dites comment un lecteur peut vérifier le résultat. Pour un bug, ajoutez un cas de régression qui échoue pour la raison signalée avant de modifier l'implémentation.

## Trouver le composant responsable

| Sujet | Zone du dépôt |
| --- | --- |
| Vocabulaire du langage et framework de services | `core/` |
| Exemples exécutables de panier/stock et tests d'acceptation HTTP | `testbed/` |
| Intégrations de fournisseurs | `integrations/` |
| CLI Rust et IDE visuel intégré | `neo/` |
| Documentation destinée aux personnes | `website/` |
| Décisions architecturales | `docs/decisions/` |

Lisez le [README des contributeurs](https://github.com/neohaskell/NeoHaskell/blob/main/README.md) et la [carte des capacités](https://github.com/neohaskell/NeoHaskell/blob/main/codemap/README.md). La carte relie un concept à son implémentation et à ses tests, afin qu'une petite correction ne devienne pas une exploration sans limite du dépôt.

## Travailler avec la chaîne d'outils du dépôt

Depuis un checkout du dépôt NeoHaskell, les commandes `./dev` entrent dans l'environnement épinglé lorsque nécessaire :

```sh
./dev watch
```

Gardez ce watcher en fonctionnement pendant vos modifications. Dans un autre terminal :

```sh
./dev check
./dev test "EventStore" nhcore-test-service
./dev lint
```

`./dev test "EventStore" nhcore-test-service` est un exemple de sélection de tests ciblée. Choisissez les tests qui établissent votre modification ; une sélection sans rapport avec la correction n'apporte aucune preuve. Les tests de service peuvent nécessiter PostgreSQL et les tests d'acceptation HTTP nécessitent leurs vraies fixtures. Le README des contributeurs décrit la configuration.

Ces commandes du dépôt diffèrent de `neo build` et `neo test`, qui opèrent sur des applications générées. Les modifications de la CLI Rust et de l'IDE ont leurs propres instructions ciblées et leurs propres niveaux de test sous `neo/`.

## Proposer le comportement public avant une implémentation large

Le dépôt utilise des spécifications de modification et des pull requests brouillon pour les changements gouvernés. Une spécification explique la différence d'API promise et nomme les tests qui prouvent chaque critère. L'examen par un mainteneur de cette proposition précède l'implémentation plus large ; la revue finale porte sur le résultat implémenté et sa vérification.

Lisez le [contrat de contribution du dépôt](https://github.com/neohaskell/NeoHaskell/blob/main/AGENTS.md) actuel pour connaître le périmètre exact, le workflow de branches/stack, les étapes de revue et les exceptions. Ne modifiez pas les attentes de tests existantes uniquement pour rendre une erreur verte. Expliquez le changement de comportement visible par les utilisateurs et obtenez la revue requise du mainteneur.

## Approfondir lorsque la modification l'exige

L'architecture du framework de services sépare les décisions de commande, la persistance des événements, la reconstruction des entités, les requêtes, les transports et les intégrations. Une modification d'un événement public ou d'une dérivation peut affecter plusieurs de ces éléments. Suivez les tests et décisions architecturales responsables, puis vérifiez l'application de référence publique ainsi que l'unité locale.

Une modification de la CLI peut aussi changer chaque application nouvellement générée. Le starter intégré et les vérifications de compatibilité entre le starter et le framework font partie de cette responsabilité.

**À essayer pour une première contribution :** choisissez un moment déroutant du parcours d'apprentissage ou de votre propre projet. Écrivez l'explication dont vous aviez besoin, identifiez la source publique qui l'étaye et demandez à un autre lecteur de la suivre. C'est une amélioration concrète, même avant de toucher aux détails internes du framework.
