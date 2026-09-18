---
title: "Explorer visuellement votre application"
description: "Utilisez le modèle du Neo IDE pour discuter du comportement et le relier au code."
sidebar:
  order: 1
---
<!-- translation-source-sha256: 5f75827f46bf20138bfe3830aa38e93b3c96a4cb9bdf42deb24c9a74798c14f6 -->

Vous avez créé un panier et lu son résumé dans [l'exercice du premier panier](/fr/build/first-cart/). Suivez maintenant ce même comportement dans le Neo IDE : la demande envoyée, le fait enregistré et les informations relues. Continuez à travailler dans `mug-shop`, le projet créé pendant la configuration.

Utilisez-le en parallèle des vérifications de comportement. Un graphe cohérent vous aide à comprendre une modification ; il ne prouve pas que l'application exécute la politique attendue.

## Voir le modèle avant d'ouvrir le code

![Le Neo IDE dans mug-shop affiche la commande bleue CreateCart, l'événement orange CartCreated et la requête verte CartSummary reliés dans la première fonctionnalité de panier.](/screenshots/neo-ide-overview.png)

*Votre première fonctionnalité de panier : la création, le fait enregistré et le résumé. Sélectionnez l'une ou l'autre capture pour l'agrandir sans quitter cette page.*

Lisez l'image en trois passages :

1. **Trouver une demande.** La carte bleue `CreateCart` représente la demande de création d'un panier. Suivez sa flèche vers le bas jusqu'au fait orange `CartCreated`.
2. **Trouver l'information visible.** La carte verte `CartSummary` reçoit des informations de `CartCreated`. Ses champs incluent `itemCount` et `isEmpty`. L'IDE appelle ces cartes vertes des **requêtes** ; elles représentent le côté modèle de lecture de l'application.
3. **Trouver un endroit où travailler.** Le panneau de gauche liste les chapitres et les tranches. Ici, `CreateCart` et `CartSummary` divisent le chapitre Cart en petits éléments dont vous pouvez discuter avec votre agent.

Comparez-le aux [modèles d'événements suivis](/fr/start/event-modeling/). Ces dessins suivent un exemple dans le temps, avec les écrans successifs et des valeurs concrètes. Le graphe de l'IDE montre des commandes, des types d'événements et des requêtes réutilisables : une carte `CartSummary` peut décrire la vue après de nombreux historiques différents. Ses flèches décrivent des relations dans le modèle, pas une trace en direct de l'exécution des demandes.

## Continuer dans votre projet de panier

Si vous avez déjà ouvert l'IDE pendant l'exercice du panier, gardez cette fenêtre ouverte. Sinon, exécutez ceci depuis le répertoire contenant le `src/` de votre application de panier :

```sh
neo ide
```

Utilisez le répertoire `mug-shop` créé pendant la configuration. Ci-dessous, vous synchroniserez son modèle avec le code du panier ajouté sous `src/Shop/Cart/`.

Ouvrez l'adresse affichée, normalement `http://127.0.0.1:2323`. L'IDE se lie au répertoire du projet depuis lequel vous l'avez lancé. Confirmez l'espace de travail affiché dans l'état de connexion avant de modifier quoi que ce soit. L'IDE et le serveur HTTP de l'application sont des processus distincts, sur des ports distincts.

Le modèle se trouve dans `event-model.json`, à la racine du projet. Un projet vierge peut ne pas encore en avoir. Créez un modèle avec les contrôles du canevas et faites une petite modification afin que la sauvegarde automatique l'écrive. Dans un espace de travail vierge, vérifiez que vous ne consultez pas un ancien modèle local au navigateur ; **New** démarre un modèle vide et **Open** lit le fichier de l'espace de travail actuel.

Les modifications sont sauvegardées automatiquement lorsque la connexion est établie. Attendez l'état de sauvegarde avant de fermer et utilisez Git pour conserver des versions importantes. Cmd/Ctrl-S force l'écriture de la sauvegarde automatique en attente ; cela ne crée pas de commit Git.

## Relier le schéma au code source

Une fois que l'espace de travail possède un fichier de modèle, exécutez ceci depuis un autre terminal dans le même projet :

```sh
neo inspect
neo inspect sync
neo validate
```

`neo inspect` affiche la structure de domaine découverte. `neo inspect sync` met à jour le modèle à partir du code source ; il écrit le fichier de modèle. `neo validate` vérifie son schéma et ses références sans le modifier. Après une synchronisation via la CLI, cliquez sur **Open** dans l'IDE (ou rechargez la page) pour lire le modèle sauvegardé ; une écriture par la CLI ne diffuse pas à elle seule une actualisation via le watcher des fichiers source. Un fichier de modèle manquant est une erreur de validation : créez et sauvegardez d'abord le modèle.

L'IDE surveille également les modifications du code source et tente la même synchronisation. Une modification de champ sur un nœud existant est conçue pour préserver la disposition ; une structure nouvellement découverte peut déclencher une mise à jour plus large de la disposition. Inspectez le résultat après une importante refactorisation.

La synchronisation s'effectue actuellement **du code vers le modèle**. Modifier le schéma ne génère pas le code applicatif correspondant. Discutez du modèle voulu avec l'agent de codage, laissez-le modifier le code source, puis comparez le schéma actualisé avec votre intention.

## Lire un petit morceau de comportement

Trouvez `CreateCart` et suivez-le jusqu'à `CartCreated`, puis jusqu'à `CartSummary`. Reliez ces noms à la demande envoyée et au résumé du panier vide observé dans l'exercice précédent. Demandez à votre agent de vous montrer où l'identifiant du panier circule dans ce parcours.

## Revenir ici à mesure que le panier grandit

Après avoir ajouté `AddItem` dans [commandes et événements](/fr/build/commands-and-events/), synchronisez de nouveau le même projet et sélectionnez cette commande. De quelles informations a-t-elle besoin et qu'enregistrerait-elle si elle était acceptée ? La vue rapprochée ci-dessous montre ce que vous pourrez alors inspecter.

![La sélection de la commande bleue AddItem met en évidence sa flèche vers l'événement orange ItemAdded. AddItem porte cartId, stockId et quantity ; ItemAdded porte entityId, stockId et quantity. Les autres nœuds sont estompés.](/screenshots/neo-ide-detail.png)

*La sélection de `AddItem` met en évidence sa connexion à `ItemAdded`. Un zoom permet de lire les champs ; le modèle environnant reste visible pour fournir le contexte.*

Vous pouvez ici suivre un élément précis d'information : `quantity` entre dans la commande et apparaît dans l'événement accepté. Le `cartId` demandé identifie le panier dont l'événement porte `entityId`. Demandez à votre agent de vous montrer la règle correspondante dans le code source et de démontrer que zéro est refusé. Voir un champ nommé `quantity` vous indique quelles informations circulent ; cela ne vous dit pas quelles valeurs la règle accepte.

Utilisez les contrôles **+** et **−** du canevas pour modifier le zoom. Sélectionner un nœud met en évidence ses connexions. Si le schéma se trouve hors de la zone visible, essayez **Fit View** ; rouvrir ou recharger le modèle sauvegardé restaure également un cadre de départ utile.

Quand le modèle d'une application grandit, utilisez ses fonctionnalités et ses chapitres pour vous concentrer sur un comportement. Suivez les connexions au-delà d'une limite lorsque vous examinez un autre domaine ou un fournisseur externe. **Tidy by flow** ajuste la présentation ; il ne corrige pas les règles métier. Le panneau Problems aide à localiser les problèmes de validation du modèle.

**Heal with AI** est une action facultative de réparation du modèle qui invoque le workflow de la CLI Claude configurée. L'affichage, l'inspection, la validation et la synchronisation déterministe ordinaires ne nécessitent pas cette action. Examinez ses modifications comme vous le feriez pour la proposition d'un autre agent ; ce n'est pas une preuve du comportement à l'exécution.

## Connaître le périmètre actuel

Le canevas Model est implémenté. Les vues Schema, Logs et Emulate affichent actuellement des espaces réservés pour de futurs travaux. Utilisez les journaux et les tests de l'application réelle pour obtenir des [preuves opérationnelles](/fr/operate/observability/).

Conservez la liaison loopback par défaut pour le travail local. Une liaison avec `--host 0.0.0.0` expose l'IDE sur d'autres interfaces réseau ; les outils d'espace de travail local ne doivent pas être traités comme une interface client de production.

## Votre vérification

Pour la fonctionnalité actuelle, prédisez ce que fera une seconde demande `CreateCart`. Envoyez-la et trouvez les deux identifiants dans le résumé. Le graphe ne comporte toujours qu'un seul nœud `CreateCart` : il décrit un type de demande, pas chaque occurrence. Demandez à votre agent de localiser le code qui choisit un nouvel identifiant, puis suivez ce champ de la commande à l'événement et à la requête.

Après la prochaine leçon, revenez également vérifier le refus d'une quantité nulle. La carte `AddItem` nomme la demande ; sa fonction de décision détermine quelles valeurs sont acceptées.

Ensuite : [commandes et événements](/fr/build/commands-and-events/) explique la décision derrière ces connexions. Pour des commandes individuelles, consultez la [référence CLI](/fr/reference/cli/).

Preuves d'implémentation : [serveur IDE](https://github.com/neohaskell/NeoHaskell/blob/main/neo/src/commands/ide.rs), [synchronisation du code source](https://github.com/neohaskell/NeoHaskell/blob/main/neo/src/ide/sync.rs) et [vues actuelles](https://github.com/neohaskell/NeoHaskell/blob/main/neo/assets/ide/src/ui/lenses/lenses.tsx).
