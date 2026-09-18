---
title: Référence de la CLI Neo
description: Consultez les commandes implémentées, les options, les effets de bord et les codes de sortie de validation.
sidebar:
  order: 1
---
<!-- translation-source-sha256: 18040b84541530bf7ef56d16fde5be6c7d4d83c8e3cf9ba9a0dda4a08dec2185 -->

La CLI Neo vous aide à créer, construire, tester et inspecter un projet NeoHaskell. Utilisez la commande qui correspond à votre objectif immédiat ; l'IDE visuel offre une autre manière de comprendre le même projet.

Exécutez les commandes du projet depuis le répertoire contenant `neo.json`. Lancez `neo --help` ou `--help` sur une commande pour consulter l'aide propre au binaire installé. Cette page décrit Neo 0.10.0, la release utilisée dans la [mise en route](/fr/getting-started/) ; une release installée plus ancienne peut différer.

## Options partagées

| Option | Effet |
| --- | --- |
| `-v`, `--verbose` | Activer la sortie CLI de niveau debug |
| `--ci` | Désactiver les invites interactives, les animations et les couleurs |
| `--help` | Afficher l'aide |
| `--version` | Afficher la version |

`--ci` est utile dans les scripts répétables. Il ne transforme pas un test local en déploiement de production.

## Créer, construire, exécuter et tester

Cette séquence utilise `mug-shop`, le nom récurrent du projet d'exercice. Remplacez-le par le nom de votre propre projet ; les commandes fonctionnent de la même manière.

```sh
neo --ci new mug-shop
cd mug-shop
neo build
neo run
```

`neo run` continue à servir jusqu'à son arrêt avec Ctrl-C. Arrêtez-le avant d'exécuter les tests, car `neo test` démarre son propre processus applicatif :

```sh
neo test
```

| Commande | Options | Comportement |
| --- | --- | --- |
| `neo new [project_name]` | `--library` | Créer le squelette depuis le starter intégré ; un nom est obligatoire en mode CI. Une bibliothèque omet le lanceur et la déclaration d'exécutable. |
| `neo build` | `--watch`, `--skip-lock-check` | Réconcilier la configuration et construire ; watch utilise le retour GHCi ; skip contourne uniquement la vérification de verrouillage du build. |
| `neo run` | `--watch` | Réconcilier, construire et exécuter ; watch reconstruit et redémarre lors des modifications. |
| `neo test` | `--watch` | Exécuter les tests unitaires du projet, puis les tests HTTP Hurl découverts. |

Build, run et test régénèrent les fichiers de build gérés à partir de `neo.json` et découvrent les modules sous `src/` et `tests/`. Vos modules `Shop.Cart` et `Shop.Stock` restent dans votre application ; la CLI gère leur inclusion dans le build.

Lorsque des tests Hurl existent, la commande de test démarre l'application et attend une réponse HTTP sur `127.0.0.1:8080`. Cette attente accepte n'importe quelle réponse HTTP ; elle n'attend pas le contrat de projection de `/ready`. Gardez le port de test du projet disponible et ajoutez dans les scénarios des vérifications sensibles à la disponibilité lorsque ceux-ci dépendent de requêtes reconstruites. Un port d'application personnalisé exige de vérifier à la fois les cibles de test et la sonde de démarrage fixe actuelle.

## Gérer les dépendances du projet

`neo.json` est la source des choix de dépendances de votre projet. Conservez ses champs `name`, `version` et `neo-version` existants et modifiez l'objet `dependencies` lorsque votre application a besoin d'un package supplémentaire. `neo-version` sélectionne la révision du framework ; il est distinct de la version de la CLI installée affichée par `neo --version`.

Le tableau suivant montre la syntaxe prise en charge. Les noms de packages et les dépôts sont des exemples de forme de déclaration, pas des dépendances nécessaires à la leçon du panier.

| Entrée de dépendance | Signification |
| --- | --- |
| `"package-name": "^1.2.3"` | Résoudre un package du registre NeoPackages dont la version correspond à la plage |
| `"hackage:package-name": "^1.2.3"` | Résoudre explicitement un package depuis Hackage |
| `"package-name": "github:owner/repository#revision"` | Utiliser la source et la révision GitHub nommées |
| `"package-name": "git:https://host/repository.git#revision"` | Utiliser une autre source Git |
| `"package-name": "file:../package-directory"` | Utiliser un package local maintenu à côté de l'application |

Les plages de versions utilisent des formes comme `^1.2.3`, `~1.2.3` et `>=1.2.3 <2.0.0`. Un nom de package seul est envoyé au registre NeoPackages ; il ne bascule pas silencieusement vers Hackage. Les sources Git sans révision utilisent `main` par défaut : indiquez donc une révision révisée lorsque la répétabilité compte.

Après avoir modifié `neo.json`, exécutez depuis `mug-shop` :

```sh
neo build
neo test
```

Examinez les modifications générées et validez le choix de dépendance avec le code applicatif et les tests qui l'utilisent. Ne maintenez pas de modifications séparées dans les fichiers `.cabal`, `cabal.project` ou `flake.nix` régénérés. La CLI ne possède pas de commande `neo add` dans la version décrite ici.

## Explorer l'application

Démarrez l'IDE depuis le répertoire de votre projet :

```sh
neo ide
```

Pour un autre port d'IDE, utilisez plutôt `neo ide --port 2324`. Laissez ce processus en fonctionnement et inspectez le même projet depuis un second terminal :

```sh
neo inspect
neo inspect commands
neo inspect wiring
```

`neo ide` utilise par défaut `127.0.0.1:2323`. `--host` accepte un littéral d'adresse IP, pas un nom d'hôte. Par exemple, `--host 0.0.0.0` expose l'IDE sur les autres interfaces IPv4 ; faites ce choix intentionnellement. Arrêtez le serveur avec Ctrl-C.

`neo inspect` affiche du JSON. Ses vues sont `domains`, `commands`, `events`, `queries`, `integrations` et `wiring`. Sans vue, il affiche l'intégralité du projet inspecté.

`neo inspect sync` est une **mutation** : elle actualise `event-model.json` depuis le code source. Les modifications de champs existants peuvent préserver la disposition ; les nouveaux nœuds déclenchent un travail de mise en page. Utilisez-la lorsque vous voulez mettre à jour le modèle, pas comme un rapport en lecture seule.

Voir [le parcours de l'IDE visuel](/fr/getting-started/visual-ide/) pour apprendre à lire ce modèle.

## Valider un modèle enregistré

```sh
neo validate
neo validate ./event-model.json --json
```

La validation est en lecture seule. Le chemin facultatif vaut par défaut `event-model.json` dans le répertoire actuel. La commande vérifie l'intégrité du schéma et des références, pas la correction de vos règles métier.

| Code de sortie | Signification |
| --- | --- |
| `0` | Modèle valide |
| `1` | Échec d'E/S ou de l'outil |
| `2` | Le modèle échoue à la validation |
| `3` | JSON mal formé |
| `4` | Fichier absent |

`--json` émet le résultat structuré de la validation sans préfixes de journal humains ; les codes de sortie conservent le même sens.

## Protéger les fichiers du domaine

```sh
neo lock --all
neo lock Cart
neo lock install
neo lock check
```

`neo lock [search]` utilise une recherche floue dans les fichiers de domaine. `--all`, ou l'absence de recherche, sélectionne tous les fichiers de domaine découverts. Le manifeste se trouve dans `.locked-files`. `install` écrit le hook pre-commit Git et écrase un hook existant à ce chemin ; `check` détecte les fichiers verrouillés modifiés, y compris les modifications de l'arbre de travail. Voir [évolution](/fr/operate/evolution/) pour le problème de compatibilité historique à l'origine de cette fonctionnalité.

Le verrouillage indexe les chemins sélectionnés et `.locked-files`, puis crée un commit Git. Vérifiez `git status` auparavant : du contenu sans rapport déjà indexé peut être inclus dans ce commit. Préservez tout hook pre-commit existant avant d'installer le hook de verrouillage.

## Installer les compétences séparées de l'agent

```sh
neo skills setup --tool codex --dry-run
neo skills setup --tool codex
```

Cette commande récupère la bibliothèque partagée de compétences et l'installe pour les outils sélectionnés. La documentation destinée aux personnes reste distincte de ces instructions.

Options de configuration : `--tool` répétable (`claude`, `codex`, `kiro`, `cursor`), `--all-tools`, `--skill` répétable, `--force`, `--dry-run`, `--refresh` et `--no-primer`. `--dry-run` affiche le plan sans installer dans le projet, mais la récupération de la bibliothèque peut remplir le cache local ; `--force` autorise l'écrasement des destinations ; `--refresh` clone à nouveau la bibliothèque ; `--no-primer` omet le primer toujours actif et le câblage de son fichier d'instructions. `neo skills` sans argument lance la configuration.

La source de vérité est [la définition de la CLI](https://github.com/neohaskell/NeoHaskell/blob/main/neo/src/cli.rs). En cas d'échec, utilisez le [dépannage](/fr/reference/troubleshooting/).
