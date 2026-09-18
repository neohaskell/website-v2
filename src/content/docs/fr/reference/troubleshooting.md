---
title: Dépanner à partir de l'engagement en échec
description: Trouvez la couche responsable des problèmes de build, de démarrage, de modèle, de requête et d'intégration.
sidebar:
  order: 3
---
<!-- translation-source-sha256: 63260d6e67ce0ea44b7be21671009579395fd9bb7ffe81b9fa61cd2a488b8b61 -->

Commencez par ce que vous attendiez : un projet se construit, un processus démarre, une modification acceptée devient visible ou un fournisseur confirme une action. Localisez ensuite le premier point où les preuves divergent. Cela donne à vous et à votre agent un problème plus petit que « l'application est cassée ».

## Garder un relevé de diagnostic utile

Notez la commande ou la demande, la révision, le résultat attendu, le résultat réel et la reproduction sûre la plus petite. Incluez l'erreur complète pertinente, mais retirez les secrets et les données privées. Exécutez les commandes de cette page depuis le répertoire de votre application contenant `neo.json` ; dans ce parcours, il s'agit de `mug-shop`.

| Symptôme | Première vérification | Action suivante |
| --- | --- | --- |
| `neo` ne peut pas lancer Nix | Nix est installé et disponible dans le shell actuel | Rouvrez le shell après l'installation ; suivez la [mise en route](/fr/getting-started/) |
| Le build signale l'absence de `neo.json` | Répertoire courant | Exécutez la commande depuis la racine du projet généré |
| Une modification Cabal/Nix générée disparaît | Source de réconciliation | Exprimez la configuration prise en charge dans `neo.json` |
| Le build refuse un fichier verrouillé | `.locked-files` et modifications de l'arbre de travail | Examinez la modification de domaine intentionnelle ; voir [évolution](/fr/operate/evolution/) |
| L'application échoue avant l'ouverture HTTP | Première erreur de démarrage/configuration/base de données | Corrigez cette erreur avant de modifier les durées des sondes |
| `/health` réussit, `/ready` renvoie `503` | Corps de disponibilité et journaux de relecture | Distinguez reconstruction et échec |
| La commande acceptée n'est pas visible | Rattrapage de la requête, identité et bonne révision | Suivez le parcours événement-vers-requête |
| L'intégration expire | Résultat fournisseur et identité de corrélation locale | Résolvez l'incertitude avant de soumettre à nouveau une action externe |

## Un nouveau module ou une nouvelle dépendance manque

Gardez les modules applicatifs sous `src/`, avec un chemin correspondant au nom du module : `Shop.Cart.Core` appartient à `src/Shop/Cart/Core.hs`. Vérifiez l'orthographe de l'import et que vous construisez le projet attendu. Enregistrez le fichier et exécutez :

```sh
neo --ci build
```

La CLI découvre les modules source et régénère les fichiers de projet gérés. Pour un package externe, modifiez `dependencies` dans `neo.json` ; ne l'ajoutez pas uniquement aux fichiers de build générés. Un nom de dépendance simple est recherché dans le registre NeoPackages. Utilisez le préfixe de clé explicite `hackage:` lorsque vous voulez un package Hackage. Consultez la [syntaxe des dépendances](/fr/reference/cli/#manage-project-dependencies).

Si une leçon utilise une API indisponible dans la révision épinglée du framework de votre projet, comparez `neo --version` et `neo-version` dans `neo.json` avec le contexte de version de la leçon. Mettez à niveau délibérément et relancez `neo build` et `neo test` ; un checkout local du framework ne fait pas partie du workflow applicatif.

## Un modèle absent diffère d'un modèle invalide

Exécutez ceci dans la racine du projet :

```sh
neo validate --json
```

Le code de sortie `4` signifie que le fichier est absent, `3` que le JSON n'a pas pu être parsé et `2` que le modèle parsé enfreint son schéma ou ses références. Inspectez l'emplacement signalé avant de modifier. Ouvrez `neo ide` pour travailler avec le modèle visuel ; utilisez `neo inspect sync` uniquement lorsque vous voulez mettre à jour le modèle enregistré depuis le code source.

Un graphe valide ne prouve pas que l'application implémente la politique d'annulation attendue. Vérifiez-le avec des [tests comportementaux](/fr/build/testing/).

## Hurl signale une connexion refusée

`neo test` démarre l'application lorsque des tests Hurl sont présents et sonde le port 8080 avant de les exécuter. Vérifiez si le processus s'est arrêté, si un autre processus possède le port et si vous avez modifié le port de l'application. Dans l'implémentation actuelle, la sonde de démarrage est fixe à 8080 ; modifier uniquement les URL Hurl ne met pas cette sonde à jour.

Arrêtez d'abord tout processus applicatif existant. Exécutez `neo run` localement et lisez l'erreur de démarrage, puis arrêtez cette exécution de diagnostic avant de réessayer `neo test`. La commande de test démarre son propre processus ; un serveur séparé peut masquer la révision réellement testée. Si le serveur répond mais que les tests dépendant des requêtes sont en concurrence avec la relecture, vérifiez aussi `/ready` : l'attente de démarrage de la CLI accepte n'importe quelle réponse HTTP.

Un démarrage Nix à froid peut également dépasser l'attente actuelle de 60 secondes avant que l'application commence à servir. Laissez l'exécution de diagnostic `neo run` terminer son démarrage, vérifiez sa réponse, arrêtez-la et réessayez le test avec l'environnement de build réchauffé. Traitez séparément une véritable erreur de configuration ou d'application.

## Le rattrapage d'une requête échoue

Utilisez le [guide de disponibilité et de journalisation](/fr/operate/observability/). Conservez le nom de la requête, la position, la révision et l'échec nettoyé de ses données sensibles. Vérifiez la connexion à la base et le décodage des événements avant d'envisager une modification des données.

Le stockage d'événements Postgres n'implique pas un état de requête persistant. Un état de requête persistant n'implique pas la reprise depuis un checkpoint dans le câblage applicatif normal. [La persistance](/fr/operate/persistence/) explique ces limites. Ne supprimez pas l'historique des événements pour faire apparaître une vue vide et saine.

## Les connexions à la base échouent par intermittence

Inventoriez les pools et les listeners sur toutes les révisions en fonctionnement. Vérifiez les tailles de pool configurées et la capacité disponible de la base. Les connexions de listener nécessitent un endpoint direct qui conserve la session ; un pool en mode transaction ne peut pas fournir le comportement `LISTEN/NOTIFY` requis.

Vérifiez la configuration TLS dans chaque magasin câblé. Le champ `DB_SSL_MODE` ajouté dans [la persistance](/fr/operate/persistence/) n'affecte que les magasins auxquels vous le transmettez. Ce n'est pas un commutateur universel pour chaque client Postgres.

## Retourner une tâche ciblée à votre agent

Par exemple, une tâche de diagnostic dans le projet d'exercice de commerce en ligne pourrait être :

> « La commande est acceptée sur la révision A. La disponibilité devient prête, mais la requête de cet utilisateur omet le panier. Trouve la requête et sa politique d'accès, conserve cette politique et donne-moi un test qui distingue une erreur de projection d'une erreur de propriété. »

Cela énonce les preuves et conserve la contrainte métier. Lorsque l'agent propose une correction, répétez la reproduction d'origine et un cas de refus voisin.
