---
title: Donner son sens au changement grâce à l'historique
description: Comprenez pourquoi les valeurs actuelles sont des résumés, comment les corrections préservent le contexte et ce qu'un historique utile permet d'expliquer à une application.
sidebar:
  order: 2
---
<!-- translation-source-sha256: a2c5a277e67ec13d6109666beb338dfd2fc858b2b5b927b91b2267d3167573a6 -->

Vous ouvrez une application et voyez qu'une demande a été refusée. Cela vous indique son état actuel, mais laisse sans réponse les questions qui vous intéressent réellement. Qu'a-t-on demandé ? Quelle règle s'appliquait ? Une information manquait-elle ? Quelqu'un a-t-il ensuite corrigé la décision ?

Le même manque apparaît pour un solde, une adresse de livraison ou l'indicateur d'avancement d'un projet. Une valeur actuelle peut être parfaitement exacte tout en vous disant très peu de la manière dont elle a été obtenue. Lorsque des personnes comptent sur une application pour expliquer des décisions, modifier ses règles ou résoudre des erreurs, ce contexte manquant compte.

NeoHaskell s'appuie sur des événements porteurs de sens : les faits que l'application accepte et conserve à propos de ce qui s'est passé. Pour comprendre pourquoi, commençons par un nombre familier.

## Le solde répond à une question

Imaginez un relevé bancaire simplifié. Il commence à 100 €, puis son titulaire retire 30 €. Le solde actuel est de 70 €.

Si l'application ne conserve que le solde actuel, elle peut répondre à « Combien y a-t-il maintenant ? » Elle ne peut pas répondre à « Pourquoi le solde est-il celui-là ? » à partir de ce seul nombre. Les mêmes 70 € peuvent provenir de nombreuses histoires différentes.

Imaginez plutôt que le montant initial et le retrait soient conservés. L'application calcule le solde actuel à partir de ces entrées : 100 € moins 30 € égale 70 €. Le nombre utile est toujours présent, mais les faits qui l'expliquent restent également disponibles.

![Un montant initial de 100 € et un retrait de 30 € restent dans l'historique et produisent un solde actuel de 70 €.](/diagrams/history-and-summary.svg)

L'historique conserve les deux entrées significatives. Le solde résume leur effet ; afficher 70 € ne nécessite de remplacer aucune des deux entrées.

Il s'agit d'un exemple conceptuel, pas d'une fonctionnalité bancaire fournie par NeoHaskell. Sa leçon s'applique partout où une valeur présente résume une séquence : l'état d'une adhésion, le nombre de places disponibles ou l'approbation d'un document.

**L'event sourcing** fait de cette séquence conservée la base de la reconstruction de l'état applicatif. La réponse actuelle reste utile. Elle peut aussi être expliquée à partir des faits qui ont servi à la produire.

## Une correction peut dire la vérité sur l'erreur

Supposons maintenant que le retrait de 30 € ait été enregistré deux fois par erreur. Le solde calculé devient 40 €, alors qu'un seul retrait devrait compter.

Modifier directement le nombre pour revenir à 70 € répare l'affichage. Cela n'explique pas, à lui seul, quelle entrée était erronée ni pourquoi la correction était justifiée. Un lecteur ultérieur voit la bonne réponse, sans le raisonnement nécessaire pour lui faire confiance.

Dans l'historique conservé, l'application peut enregistrer l'annulation explicite du retrait en double. Les entrées d'origine restent présentes et la correction ajoute 30 € au solde calculé.

![Le retrait en double réduit le solde enregistré à 40 € ; une annulation explicite ajoute 30 € et rétablit 70 € tout en conservant l'entrée erronée.](/diagrams/correction-history.svg)

L'annulation identifie l'entrée en double qu'elle corrige. Le solde obtenu est de 70 € et l'historique explique à la fois l'erreur et sa réparation.

Cela nécessite une opération conçue à cet effet. Quelqu'un demande l'annulation ; l'application vérifie que cette entrée peut être annulée et qu'elle n'a pas déjà été corrigée. Si elle est acceptée, l'annulation devient un fait supplémentaire. La détection des doublons et ces règles relèvent du modèle applicatif.

Pour un agent d'IA, cette distinction est importante. « Rends le nombre correct » est une instruction incomplète. « Corrige ce doublon grâce à l'opération d'annulation autorisée, puis affiche l'historique obtenu » décrit une action dont l'intention et l'effet peuvent être vérifiés.

## Une nouvelle préférence ne doit pas réécrire un ancien accord

Considérons le projet d'exercice de commerce en ligne utilisé dans toute cette documentation. Imaginez qu'on lui ajoute des commandes et des préférences d'adresse client.

Un client passe une commande à livrer à Erevan. Plus tard, il modifie son adresse préférée pour Lisbonne. Les deux affirmations peuvent rester vraies : la commande précédente a été passée pour Erevan et la préférence actuelle est Lisbonne.

Si l'ancienne commande affiche l'adresse qui se trouve aujourd'hui dans le profil du client, elle peut donner l'impression que Lisbonne a toujours été la destination convenue. La mise à jour d'une préférence a accidentellement modifié le sens d'une transaction antérieure.

Un modèle explicite donne à ces faits des emplacements distincts. La commande enregistre sa destination de livraison convenue. Le profil enregistre la préférence pour les demandes futures. Si la modification d'une commande existante est autorisée, il s'agit d'une autre opération avec ses propres règles — peut-être la livraison peut-elle changer avant l'expédition, mais nécessite-t-elle un processus différent ensuite.

Le framework ne peut pas déduire cette distinction d'un champ appelé « address ». Vous et votre agent devez identifier ce que signifie la valeur et quand elle devient partie d'un accord. Le même raisonnement s'applique à un budget approuvé, à une version de document acceptée ou à une éligibilité évaluée selon une politique antérieure.

## L'historique rend de nouvelles questions possibles

Une application connaît rarement toutes les questions que ses utilisateurs poseront un jour. Aujourd'hui, ils ont peut-être besoin d'un état actuel. Plus tard, ils voudront comprendre la durée d'un processus, les étapes souvent corrigées ou l'endroit où le travail se bloque.

Les événements conservés peuvent alimenter de nouvelles vues de la même activité. Une vue présente l'état actuel ; une autre explique la séquence à une personne qui enquête sur un problème. Dans NeoHaskell, les **requêtes** préparent les informations destinées aux lecteurs, tandis que les entités reconstruisent l'état utilisé pour décider de ce qui peut se produire ensuite. Vous explorerez les deux dans les [chapitres consacrés à la construction](/fr/build/).

Les questions disponibles dépendent des informations réellement enregistrées. Un nouveau rapport ne peut pas retrouver une raison de refus qui n'a jamais été conservée. L'horodatage d'un événement stocké n'établit pas automatiquement le moment où quelque chose s'est passé en dehors de l'application. Si cette distinction compte, modélisez explicitement l'occurrence externe et son heure.

Voici une conversation utile avant l'implémentation : « À quelle question regretterions-nous de ne pas pouvoir répondre ? » La réponse aide à choisir les faits et le contexte importants sans essayer de tout conserver.

## Événements, journaux d'audit et sauvegardes ont des rôles différents

Une sauvegarde aide à récupérer des informations stockées après une perte. Les journaux opérationnels aident à diagnostiquer l'exécution. Un mécanisme d'audit peut conserver les modifications et leurs auteurs. Ce sont des outils utiles, et les applications qui stockent l'état actuel peuvent conserver d'excellents historiques grâce à une conception d'audit délibérée.

L'event sourcing place les faits métier acceptés sur le chemin qui produit l'état. « La commande a été annulée » a un sens que l'application comprend et applique. Une trace technique telle que « le champ est passé de 2 à 3 » a besoin d'une interprétation supplémentaire pour expliquer le même résultat.

Cela ne transforme pas automatiquement un historique d'événements en dossier d'audit complet. Un événement d'annulation peut établir l'annulation tout en omettant la raison, les preuves ou l'autorité qui la sous-tendent. Ces détails doivent être modélisés là où ils comptent. Les métadonnées d'événement de NeoHaskell fournissent des emplacements pour les identifiants et les relations ; les champs facultatifs ne se remplissent pas d'eux-mêmes avec toutes les explications nécessaires à un futur réviseur.

Les sauvegardes restent nécessaires pour l'historique que vous promettez de conserver. La reconstruction de l'état fonctionne à partir des événements disponibles pour l'application ; elle ne peut pas reconstruire des faits perdus depuis un magasin vide.

## Préserver délibérément le sens

Choisir un historique signifie aussi choisir ce qui y appartient. Un événement utile capture suffisamment de contexte pour préserver son sens. Il n'a pas besoin de copier chaque champ d'une demande ni de conserver indéfiniment tous les détails sensibles.

Décidez ce qui doit rester explicable, qui peut l'inspecter et ce qui peut être supprimé ou stocké séparément. Si certains détails ont une durée de vie plus courte que le fait qu'ils étayent, concevez explicitement cette relation. Les changements de conservation peuvent affecter la reconstruction et les rapports ; testez donc ce qui reste compréhensible ensuite.

Le code futur doit aussi interpréter fidèlement les anciens événements. Modifier demain la limite de quantité ne doit pas faire disparaître la demande acceptée hier. [Faire évoluer une application](/fr/operate/evolution/) développe le travail de compatibilité qui découle de ce principe.

## Ce que vous pouvez maintenant demander à votre agent

Choisissez une valeur dans l'application que vous voulez construire. Demandez à votre agent d'expliquer à quelle question elle répond, quels faits la produisent et comment une modification erronée serait corrigée. Demandez ensuite quel contexte resterait disponible à une personne qui examinerait la décision plus tard.

Pour un exercice court, utilisez l'exemple de l'adresse : une préférence change après le passage d'une commande et une demande séparée tente de modifier cette commande après son expédition. Décidez ce que chaque opération peut faire avant de demander du code.

<details>
<summary>Raisonnement suggéré</summary>

La nouvelle préférence peut s'appliquer aux commandes futures, tandis que la commande précédente conserve sa destination convenue. Modifier cette commande nécessite une règle distincte. Testez une modification autorisée, une modification refusée après la limite choisie et la soumission deux fois de la même demande de modification. L'historique doit expliquer les modifications acceptées sans transformer silencieusement un refus en réussite.

</details>

NeoHaskell donne à ces distinctions une structure exécutable. Ses garanties sont plus limitées que le fait de connaître la bonne politique : une décision bien typée et traçable peut tout de même être erronée. Le bénéfice est de disposer d'une base plus claire pour la reconnaître, la questionner et la corriger tout en préservant le sens de ce qui a précédé.

Ensuite, explorez [l'évolution par tranches](/fr/start/growing-by-slices/) pour voir comment ces faits relient de nouvelles capacités. Pour la méthode pratique de modélisation, continuez avec [Event Modeling](/fr/start/event-modeling/).

Fondations publiques de l'implémentation : [reconstruction des entités](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Entity/Core.hs), [définitions des requêtes](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Query/Core.hs), [métadonnées des événements](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Event/EventMetadata.hs) et [opérations du magasin d'événements](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/EventStore/Core.hs).
