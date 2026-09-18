---
title: "Faire évoluer une application par tranches utiles"
description: "Construisez un comportement compréhensible à la fois, avec des connexions explicites entre les fonctionnalités."
sidebar:
  order: 3
---
<!-- translation-source-sha256: e363345e4100abe16e40eb8cd9f55f24cee8f2c6b62500a3c353ffefc2baa2da -->

Une application arrive rarement sous la forme d'une idée complète. Vous résolvez un problème immédiat, apprenez de ses utilisateurs et découvrez la prochaine modification utile. Le défi consiste à garder le travail précédent compréhensible à mesure que ces modifications s'accumulent.

NeoHaskell vous permet de décrire cette évolution par petits éléments reliés. Une demande, la règle qui l'évalue, le fait qu'elle produit et l'information que quelqu'un voit peuvent former une **tranche de fonctionnalité** : un comportement que vous pouvez expliquer, implémenter et vérifier. Vous n'avez pas besoin de comprendre chaque partie de l'application pour discuter de cette tranche. Vous devez comprendre les engagements qu'elle prend envers ses voisines.

Cette approche convient aux services d'adhésion, aux outils de réservation, aux processus d'approbation et aux applications de commerce en ligne. Le domaine change ; les questions restent reconnaissables.

## Commencer par un résultat reconnaissable

« Construire la base de données » décrit un travail technique. « Permettre à un membre de demander une place et de voir si sa demande a été acceptée » décrit un résultat. La seconde formulation vous donne quelque chose à discuter avant de choisir l'implémentation.

Pour chaque tranche, répondez à quatre questions :

| Élément | Question | Exemple de commerce en ligne |
| --- | --- | --- |
| Déclencheur | Qu'est-ce qui démarre cette étape ? | Quelqu'un demande à ajouter deux tasses à un panier. |
| Décision | Qu'est-ce qui doit être vrai pour que la demande réussisse ? | Le panier existe et la quantité est positive. |
| Fait | Qu'enregistrons-nous si elle réussit ? | Un article a été ajouté avec la quantité demandée. |
| Vue | Que devrait pouvoir voir quelqu'un ? | Le résumé du panier reflète l'ajout accepté. |

Un refus fait aussi partie de cette description. Une quantité nulle ne doit pas produire de fait « article ajouté ». L'écrire donne à la personne, à l'agent et à l'implémentation une limite commune : ils peuvent être en désaccord sur le code proposé tout en étant d'accord sur le résultat vérifié.

![Une tranche accepte une demande et enregistre un fait. Deux autres tranches utilisent ce contrat d'événement partagé : l'une prépare une vue et l'autre demande une action de suivi.](/diagrams/growing-by-slices.svg)

*Chaque connexion porte un sens explicite. Accepter une étape ne signifie pas que toutes les étapes suivantes ont réussi.*

Une tranche est une manière de diviser le comportement, pas une règle sur la taille d'un dossier. Certaines tranches acceptent des demandes. D'autres préparent une nouvelle vue à partir d'informations existantes ou réagissent à un fait en demandant une autre action. Leur taille utile est celle à laquelle vous pouvez expliquer la réussite et l'échec sans dissimuler une étape qui aurait des conséquences.

## Laisser les fonctionnalités suivantes utiliser les engagements précédents

Supposons que l'application enregistre déjà les demandes d'adhésion acceptées. Ajouter un tableau de bord pour les réviseurs ne devrait pas obliger ce tableau à comprendre la disposition du formulaire de demande. Il a besoin des informations acceptées et d'un sens clair pour « en attente de révision ».

Il s'agit d'un **contrat explicite** : un accord sur les informations disponibles et leur signification. Dans NeoHaskell, les commandes, événements et requêtes donnent à ces accords des emplacements nommés dans le programme. Une commande exprime une demande ; un événement enregistre un fait accepté ; une requête prépare des informations à lire.

Des contrats stables permettent à une nouvelle fonctionnalité d'utiliser une capacité existante sans pénétrer dans son implémentation. Les tests peuvent vérifier chaque règle près de la décision qui en est responsable. Les tests de la connexion vérifient ensuite si les éléments fonctionnent ensemble. Cela rend les changements plus faciles à raisonner ; cela ne fait pas disparaître les connexions.

## Faire évoluer le projet d'exercice par étapes délibérées

Le projet de commerce en ligne vous offre un contexte familier pour pratiquer cette manière d'évoluer :

1. **Créer un panier.** Établir un panier identifiable avant d'y ajouter quoi que ce soit.
2. **Ajouter un article.** Accepter une quantité positive et expliquer clairement un refus.
3. **Afficher le résultat.** Préparer un résumé du panier, en tenant compte de la possibilité qu'une modification récemment acceptée n'ait pas encore atteint la vue.
4. **Connecter le stock.** Donner au stock sa propre décision sur la possibilité de réserver une quantité, puis connecter l'action du panier à cette demande.
5. **Concevoir l'acceptation d'une commande.** Décider ce qui doit être confirmé avant qu'une commande soit acceptée et ce que voit la personne pendant l'attente de la confirmation.
6. **Ajouter des services externes.** Décider comment les résultats de paiement, les notifications et les échecs influencent le processus.

Vous construirez le panier, son résumé et les fonctionnalités de stock dans votre propre projet. L'acceptation de commande et le paiement prolongent cette base avec des décisions que vous prenez ; ce sont des exercices de conception ultérieurs. Le [parcours de construction](/fr/build/) présente les éléments fonctionnels avant que [l'étape du projet d'exercice](/fr/build/your-shop/) ne vous demande de prendre davantage de décisions vous-même.

Remarquez comment chaque étape introduit une raison d'utiliser un nouveau concept. Le stock compte lorsque la disponibilité compte. Une intégration compte lorsqu'une action acceptée doit obtenir une réponse ailleurs. Vous apprenez les mécanismes lorsqu'une question utile leur demande une réponse.

## Garder les relations visibles

De petites tranches peuvent tout de même participer à un processus vaste. Dans le workflow que vous construirez, l'ajout d'un article à un panier déclenche une demande séparée de réservation de stock. Le panier accepte sa modification avant la fin de cette demande ultérieure. La décision du stock peut refuser une quantité indisponible.

Cela signifie que « article ajouté » et « stock réservé » sont deux engagements différents. Une application complète doit décider comment communiquer et gérer cet écart. L'article doit-il rester en attente ? Une réservation échouée doit-elle le supprimer ? Qui peut réessayer ? Dessiner la connexion révèle ces questions ; cela ne choisit pas la politique à votre place.

Le même problème se présente lorsqu'une réservation est acceptée avant la fin d'un paiement ou lorsqu'un projet est approuvé avant la confirmation d'une livraison par un fournisseur. Une limite utile clarifie chaque responsabilité tout en laissant le processus général visible. Plus loin, les [workflows entre domaines](/fr/connect/workflows/) expliquent comment implémenter ces connexions et vérifier les cas d'échec.

## Donner à votre agent une limite dans laquelle travailler

Une tâche délimitée peut être : « Permettre l'ajout d'une quantité positive à un panier existant. Refuser les quantités nulles et négatives. Montrer les preuves de l'acceptation, du refus et de l'absence de panier. Expliquer quels contrats existants ont été modifiés. »

Vérifiez que la règle choisie est correcte, puis demandez la tranche suivante en fournissant les décisions précédentes comme contexte.

À mesure que votre confiance grandit, déléguez des modifications plus importantes dont vous pouvez encore expliquer les limites. L'[IDE visuel](/fr/getting-started/visual-ide/) aide à relier le vocabulaire au code découvert. Les tests rendent les résultats attendus inspectables. Aucun des deux ne remplace la décision sur ce que l'application doit faire.

## Prévoir les contrats qui finiront par changer

Un nouveau champ ou une modification du sens d'un événement peut affecter plusieurs tranches. Le compilateur aide à repérer les usages incompatibles dans le code construit ensemble. Il ne peut pas établir que les anciens enregistrements stockés ont toujours le même sens, qu'un consommateur distant a été mis à jour ou qu'une nouvelle règle convient aux décisions précédentes.

Traitez ce type de modification comme un travail coordonné : identifiez les consommateurs, conservez des exemples de l'ancien historique et vérifiez comment la nouvelle version le lit et l'explique. Le [chapitre sur l'évolution](/fr/operate/evolution/) développe cette responsabilité.

Avec le temps, un historique significatif peut aussi préserver la mémoire institutionnelle : ce qui a été demandé, ce qui s'est passé et la manière dont les actions ultérieures ont répondu. Les raisons, les preuves et l'autorité ne restent disponibles que si vous choisissez de les enregistrer.

Choisissez un processus de votre propre domaine et dessinez sa plus petite tranche complète, refus compris. Nommez ensuite la tranche suivante et l'engagement qui les relie.

Ensuite : [évaluer la valeur d'adoption et les compromis](/fr/start/fit-and-tradeoffs/).
