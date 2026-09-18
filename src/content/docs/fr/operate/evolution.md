---
title: Faire évoluer une application sans réécrire son passé
description: Séparez les modifications métier, la compatibilité des événements historiques et l'évolution des requêtes.
sidebar:
  order: 5
---
<!-- translation-source-sha256: b841f211ce6aff16eeb0eba07b6e602f3f11dbfb8d1e1d740de0ed1a2b95eea1 -->

Les exigences changent alors que les données existantes conservent leur sens. Le nouveau code doit prendre en charge ces deux réalités. Par exemple, ajouter un texte facultatif aux nouveaux enregistrements ne doit pas faire croire que les utilisateurs précédents l'avaient fourni. Dans le projet d'exercice de commerce en ligne, essayez d'ajouter une note facultative aux paniers nouvellement créés tandis que les anciens paniers conservent une absence explicite de cette information.

Un système utilisant l'event sourcing rend l'historique explicite. C'est précieux pour expliquer les décisions et cela crée une responsabilité : le code futur doit toujours comprendre les faits que vous avez déjà acceptés.

## Classer la modification avant de coder

| Modification | Question principale |
| --- | --- |
| Nouvelle règle pour les opérations futures | L'état existant peut-il encore être reconstruit avant l'exécution de la nouvelle décision ? |
| Nouveau type d'événement | Les anciennes et nouvelles révisions de l'application peuvent-elles lire les historiques qu'elles rencontreront ? |
| Modification de la forme d'un événement stocké | Comment le JSON historique restera-t-il décodable et porteur de sens ? |
| Nouvelle requête ou requête modifiée | Peut-elle être reconstruite correctement depuis tous les historiques pris en charge ? |
| Nouveau workflow externe | Le déploiement ou la relecture pourrait-il dupliquer une action externe ? |

Utilisez [Event Modeling](/fr/start/event-modeling/) et l'[IDE visuel](/fr/getting-started/visual-ide/) pour identifier les consommateurs concernés. Modifier un seul événement peut affecter différemment les commandes, les requêtes et les intégrations.

## Préserver une fixture historique

Avant d'accepter une modification, conservez dans vos tests un petit historique représentatif. Incluez un comportement antérieur et postérieur à la modification ainsi qu'une opération rejetée. Pour l'exemple de commerce en ligne, utilisez un ancien panier et un nouveau panier avec une note. Vérifiez que le nouveau code :

- Décode les événements persistés anciens et nouveaux.
- Reconstruit l'état attendu pour chacun.
- Applique la nouvelle règle uniquement là où le métier le prévoit.
- Construit les résultats de requête attendus après la relecture.
- Ne répète pas un effet externe pendant l'exercice.

La compilation réussie d'un type JSON ne prouve pas que le JSON historique se décode correctement. Gardez les cas historiques à côté de vos tests `Shop.Cart` et exécutez `neo test` depuis `mug-shop` sur une base de données jetable. Suivez [les tests](/fr/build/testing/) pour obtenir des preuves exécutables.

## Utiliser le verrouillage du domaine comme rappel

Depuis la racine d'un projet généré, la CLI peut verrouiller les fichiers de domaine découverts :

```sh
neo lock --all
neo lock install
neo lock check
```

Avant de verrouiller, inspectez `git status` et retirez les modifications indexées sans rapport. Le verrouillage indexe les fichiers sélectionnés et `.locked-files`, puis crée un commit Git ; le contenu déjà indexé peut être inclus. `neo lock install` écrit le chemin du hook pre-commit : préservez et intégrez donc délibérément tout hook existant.

Le manifeste est `.locked-files` ; le hook Git installé et `neo build` vérifient les modifications des chemins verrouillés. `neo lock check` inclut les modifications indexées, non indexées et non suivies. Le verrouillage aide à rendre une modification lourde de conséquences délibérée. Il n'établit pas la compatibilité du schéma et ne fournit pas d'implémentation de migration.

`neo build --skip-lock-check` existe pour un contournement volontaire au moment du build. Traitez séparément la question de compatibilité historique sous-jacente ; contourner la vérification n'y répond pas.

## Ne pas supposer que les modifications de requêtes migrent seules

Le magasin de requêtes Postgres et le subscriber exposent des opérations de hash et de checkpoint. Leur existence ne signifie pas que chaque modification d'une fonction de requête est détectée ou migrée automatiquement, ni que le démarrage standard de l'application active la reprise depuis un checkpoint. Planifiez et testez une reconstruction avec le câblage réel de votre application.

Pour un schéma de requête persistant incompatible, rendez la transition explicite. Conservez l'historique d'événements faisant autorité et répétez la transition sur une copie restaurée. Indiquez si la révision précédente peut fonctionner avec les données obtenues ; « revenir au binaire précédent » ne suffit pas toujours après une modification de données.

## Exercice : ajouter des notes au panier

Pour le projet d'exercice de commerce en ligne, demandez à votre agent de proposer comment les nouveaux paniers acquièrent une note facultative et ce qu'affichent les anciens paniers. Avant d'accepter le code, expliquez vous-même le comportement sur l'ancien historique.

<details>
<summary>Une limite d'acceptation utile</summary>

Un ancien panier doit conserver son sens original, avec une absence explicite de note. Un nouveau panier doté d'une note doit la conserver après redémarrage et relecture. Une note qui enfreint votre politique de taille ou de contenu doit être refusée avant de devenir un fait accepté. Choisissez la politique précise de cet exercice avant de vérifier l'implémentation.

</details>

Continuez avec la [sécurité](/fr/operate/security/) ou rejoignez le parcours de [contribution à NeoHaskell](/fr/operate/contributing/).
