---
title: Observer une application en fonctionnement
description: Reliez la santé du processus, la progression des projections et les résultats métier sans exposer de données privées.
sidebar:
  order: 3
---
<!-- translation-source-sha256: c337ef545bf196d00e1483a4dd0a4c655482fe36b09d9954aa84f30bf0465f45 -->

Une personne signale qu'une modification acceptée n'est pas visible. Vous devez distinguer une demande rejetée, une vue retardée, un mauvais compte et un échec externe. « Le serveur est actif » ne répond qu'à une petite partie de cette question. Dans le projet d'exercice de commerce en ligne, le signalement pourrait être : « J'ai ajouté un article, mais mon panier n'a pas changé. »

Observez l'application par couches : processus, faits stockés, vues et résultats externes. Donnez à chaque alerte une question sur laquelle une personne peut agir.

## Commencer par les deux signaux intégrés

Pour une application utilisant le câblage web par défaut sur le port 8080 :

```sh
curl -i http://127.0.0.1:8080/health
curl -i http://127.0.0.1:8080/ready
```

La réponse de disponibilité est un état agrégé :

```json
{"status":"ready"}
```

Pendant le rattrapage, elle vaut `{"status":"rebuilding"}` avec HTTP `503`. En cas d'échec, elle renvoie aussi `503`, avec `status` défini sur `failed` et une `reason`. La réponse HTTP actuelle n'est pas un tableau de bord des valeurs de retard de chaque requête.

Un processus sain peut être en train de reconstruire les requêtes. Un processus disponible peut encore rencontrer une panne du fournisseur externe. Surveillez séparément l'opération métier.

## Lire les journaux de l'application

Le module `Log` écrit des enregistrements JSON sur la sortie standard avec `time`, `level` et `message`, ainsi que des informations sur le site d'appel et des champs de portée du framework lorsqu'ils sont disponibles. Votre hôte doit collecter, conserver et rendre ces enregistrements interrogeables.

Pour une exécution locale de diagnostic :

```sh
LOG_LEVEL=debug neo run
```

Le niveau par défaut est `Info` ; l'implémentation reconnaît les formes debug, info, warn, error et critical en minuscules, avec capitale initiale ou en majuscules. Modifier l'environnement nécessite un nouveau processus. `neo --verbose` contrôle la verbosité de la CLI ; `LOG_LEVEL` contrôle la journalisation de l'application.

Les journaux du framework identifient la progression et les échecs de relecture des requêtes. Les messages de progression incluent `events_replayed`, `lag_from_head` et `duration_seconds` dans le texte du message. Ne supposez pas que ces valeurs sont exportées comme métriques distinctes. Le test de démarrage à froid vérifie les messages de progression et vérifie dans les journaux d'échec l'identité de la requête et la position, sans fuite de payload d'événement.

[Inspectez l'implémentation de la journalisation](https://github.com/neohaskell/NeoHaskell/blob/main/core/core/Log.hs) et [la vérification du démarrage à froid](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/scripts/cold-start-readiness.sh).

## Suivre une opération dans le système

Enregistrez la révision, l'heure approximative et un identifiant sûr pour l'opération ou l'entité. Gardez l'identifiant de panier renvoyé par votre demande `mug-shop`. Demandez ensuite :

1. La commande a-t-elle réussi ou signalé un refus ?
2. L'historique persistant contient-il le fait attendu ?
3. La requête concernée a-t-elle rattrapé son retard et le lecteur est-il autorisé à la voir ?
4. Si une intégration était attendue, quel résultat a-t-elle signalé ?
5. Le résultat est-il devenu le fait métier suivant ou le suivi est-il toujours en attente ?

Utilisez le [graphe de l'IDE](/fr/getting-started/visual-ide/) pour trouver la commande, l'événement, la requête et l'intégration responsables. Il explique les relations dans le code source ; il n'affiche pas l'historique réel de la base de production et ne remplace pas la surveillance en production.

Choisissez des identifiants de diagnostic sûrs. Les adresses personnelles, les tokens d'accès, les documents importés et les réponses complètes des fournisseurs n'ont généralement pas leur place dans les journaux courants. Le masquage d'un champ de configuration typé ne masque pas le texte arbitraire que vous journalisez ensuite.

## Exercice : un processus vert avec un résultat en attente

Après avoir ajouté une intégration externe à `mug-shop`, concevez un scénario de staging dans lequel la modification déclenchante est acceptée mais la confirmation externe est retardée. Décrivez l'état visible par le client et le signal visible par l'opérateur avant de l'exécuter.

<details>
<summary>Raisonnement suggéré</summary>

La santé peut rester verte pendant que la confirmation est en attente. La vue concernée doit communiquer honnêtement cet état intermédiaire. Un opérateur a besoin de la durée d'attente et d'un identifiant de corrélation sûr. Redémarrer à répétition un processus sain ne résoudra probablement pas une panne de fournisseur et peut compliquer le diagnostic.

</details>

Utilisez [la récupération](/fr/operate/recovery/) lorsque le diagnostic révèle un travail interrompu ou une infrastructure perdue.
