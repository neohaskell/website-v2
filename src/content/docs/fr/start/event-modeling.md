---
title: "Décrire l'application avec des événements"
description: "Utilisez un modèle partagé pour relier les demandes, les décisions, les faits enregistrés et ce que voient les personnes."
sidebar:
  order: 6
---
<!-- translation-source-sha256: 68fc7492badcdb6e1b41f881daeed6e78a63fde57f51b1fe140a36479ccca065 -->

Avant qu'une application puisse faire ce qu'il faut, les personnes doivent s'accorder sur ce que signifie « ce qu'il faut ». Une demande comme « permettons aux gens d'annuler » paraît simple jusqu'à ce que quelqu'un demande : annuler quoi, jusqu'à quand et que se passe-t-il pour le travail déjà commencé ?

Event Modeling donne à ces questions un emplacement visible. Vous décrivez ce que quelqu'un veut faire, les règles qui décident si cela peut arriver, les faits qui méritent d'être mémorisés et les informations dont les personnes auront besoin ensuite. Vous pouvez en discuter sans lire le code d'implémentation.

Pour quelqu'un qui évalue NeoHaskell, le bénéfice est la continuité : les mots utilisés pour expliquer un processus ont des équivalents dans l'application. Pour quelqu'un qui construit avec un agent de codage, le modèle fournit un accord commun à implémenter et à remettre en question. Le choix des règles reste nécessaire ; il devient plus visible.

## Apprendre à lire le schéma

Un Event Model suit un exemple concret dans le temps. Lisez-le de gauche à droite : l'écran utilisé par quelqu'un, sa demande, le fait accepté et les informations préparées pour l'écran suivant. Les étapes suivantes utilisent les informations déjà apparues. Les écrans se trouvent au-dessus du comportement applicatif ; des couloirs distincts peuvent différencier les acteurs ou les parties d'un système. Cette disposition suit [l'introduction à Event Modeling d'Adam Dymitruk](https://eventmodeling.org/posts/what-is-event-modeling/).

Trois couleurs aident à reconnaître les rôles. Nous étiquetons aussi chaque rôle afin que vous puissiez lire les diagrammes sans dépendre de la couleur :

| Couleur et élément | Question à laquelle il répond | Exemple |
| --- | --- | --- |
| Commande bleue | Quelle modification est demandée ? | CreateCart |
| Événement orange | Que s'est-il passé ? | CartCreated |
| Modèle de lecture vert | Quelles informations quelqu'un peut-il lire ? | CartSummary |
| Croquis d'écran simple | Que peut voir ou faire la personne ici ? | Un bouton pour créer un panier |

Ce sont les conventions décrites dans [l'introduction de Martin Dilger](https://eventmodelers.ai/docs/blog/documenting-software-with-event-modeling/). Un événement utilise le passé parce qu'il décrit un fait. Un modèle de lecture donne une présentation utile à ces faits. L'écran est un croquis de cette présentation, pas une catégorie supplémentaire d'événement métier.

Deux autres mots aident à expliquer ce qui se passe derrière une commande. **L'état de l'entité** est la connaissance actuelle de la chose modifiée. Une **décision** utilise cette connaissance pour accepter ou refuser la demande. Nous décrivons les règles à côté de nos exemples ; vous n'avez pas besoin d'ajouter des mécanismes d'implémentation au schéma.

## Premier exemple : créer un panier vide

Commencez plus petit qu'avec l'ajout d'un produit. Quelqu'un veut un panier vide qu'il pourra utiliser. C'est la première fonctionnalité que vous construirez dans votre projet d'exercice. Les écrans sont des croquis de l'expérience prise en charge par l'application.

![Un écran de création de panier déclenche la commande bleue CreateCart, qui produit l'événement orange CartCreated ; le modèle de lecture vert CartSummary fournit un écran de panier vide.](/diagrams/event-model-first-cart.svg)

*Suivez les informations de l'action d'une personne jusqu'au fait enregistré, puis revenez à ce qu'elle voit. [Télécharger le diagramme modifiable](/diagrams/event-model-first-cart.drawio).* 

Lisez l'exemple en quatre étapes :

1. La personne demande la création d'un panier. **CreateCart** ne nécessite aucun champ de saisie.
2. L'application choisit un nouvel identifiant de panier et un identifiant de propriétaire. L'identifiant d'un utilisateur authentifié fournit le propriétaire ; une demande anonyme reçoit un identifiant de propriétaire généré.
3. **CartCreated** enregistre ces identifiants sous `entityId` et `ownerId`.
4. **CartSummary** identifie le panier via `cartSummaryId` et indique `itemCount: 0` et `isEmpty: true`, ce qui permet à l'écran d'afficher un panier vide.

Le champ propriétaire enregistre une relation ; sa seule présence ne définit pas une politique d'accès. L'important ici est le cheminement de l'information : l'identifiant du panier naît lors de la création et permet aux demandes suivantes de faire référence au même panier. Vous implémenterez ce parcours dans [votre premier panier](/fr/build/first-cart/).

## Deuxième exemple : poursuivre la même chronologie

La personne sélectionne maintenant un produit et demande deux unités. Le modèle s'agrandit vers la droite en conservant l'étape de création qui rend l'action suivante possible.

![La chronologie du panier continue de CreateCart et CartCreated vers AddItem avec une quantité de deux, puis ItemAdded et un CartSummary mis à jour indiquant une entrée et isEmpty à false.](/diagrams/event-model-cart-journey.svg)

*La seconde action utilise le panier créé précédemment. Son résultat fournit la vue suivante. [Télécharger le diagramme modifiable](/diagrams/event-model-cart-journey.drawio).*

**AddItem** reçoit `cartId`, `stockId` et `quantity`. Ici, la quantité vaut deux. Si le panier existe et que la quantité est positive, **ItemAdded** enregistre le panier comme `entityId`, avec `stockId` et `quantity`.

Le résumé indique alors `itemCount: 1` et `isEmpty: false`. Pourquoi un et non deux ? Ce modèle de lecture compte les entrées du panier, pas la somme de leurs quantités. Un ajout accepté crée une entrée, même lorsque cette entrée contient deux unités. Son écran doit dire « 1 entrée », et non « 1 unité ».

C'est exactement le genre de malentendu qu'un modèle concret peut révéler. Si vous voulez compter le total des unités, il s'agit d'une autre exigence de requête à implémenter et à vérifier. La [leçon sur les commandes et événements](/fr/build/commands-and-events/) suit ces valeurs dans le code que vous ajoutez à votre projet.

## Une demande n'est pas un fait

« Ajouter deux tasses » et « deux tasses ont été ajoutées » ont des sens différents. La première peut échouer : le panier n'existe peut-être pas. La seconde indique que l'application a accepté cette modification. Les séparer empêche de traiter une demande optimiste comme un travail terminé.

Un ajout accepté ne signifie pas que le paiement a réussi ou qu'un colis a été expédié. Chacune de ces étapes nécessiterait ses propres règles et preuves.

Cette distinction est utile en dehors du commerce en ligne. « Réserver la salle » est une demande ; « la salle a été réservée » est un fait. « Envoyer le document en révision » diffère de « le réviseur l'a approuvé ». Nommer ces étapes révèle les engagements qu'un seul état « terminé » pourrait dissimuler.

Un refus ne crée pas automatiquement un événement métier. Si votre application doit conserver les tentatives rejetées et leurs raisons, décidez comment représenter explicitement cette exigence. Un modèle utile décrit à la fois l'acceptation et le refus.

## Rendre la règle testable avec des exemples

Une chronologie réussie laisse place aux malentendus concernant d'autres demandes. **Given–When–Then** ajoute des scénarios précis : l'historique déjà connu, la commande demandée maintenant et l'événement ou le refus attendu ensuite. Les scénarios de modèle de lecture décrivent les informations attendues pour un historique donné. Ces conventions apparaissent dans [la fiche de référence Event Modelers](https://eventmodelers.ai/cheatsheet/).

Pour le second diagramme, utilisez ces scénarios :

| Étant donné | Quand | Alors |
| --- | --- | --- |
| Un panier vide a été créé | AddItem demande deux unités | ItemAdded enregistre la quantité deux |
| Le même panier existe | AddItem demande zéro unité | La demande est refusée ; aucun ItemAdded n'est enregistré |
| Aucun panier n'existe pour l'identifiant demandé | AddItem demande deux unités | La demande est refusée parce que le panier n'existe pas |

Vérifiez ensuite la vue séparément : étant donné la création et l'ajout accepté, CartSummary doit finir par indiquer une entrée et un panier non vide.

Ces exemples distinguent une demande d'un fait et un fait de sa présentation. Ils donnent aussi à votre agent de codage une cible d'implémentation claire. Le compilateur peut vérifier les relations structurelles ; ces scénarios aident à vérifier que le comportement choisi correspond à votre intention.

## Ce que voient les personnes peut suivre un instant plus tard

Accepter une commande et mettre à jour les informations affichées à l'écran sont deux étapes distinctes. Les modèles de lecture de NeoHaskell se mettent à jour de manière asynchrone : ils consomment les modifications après leur acceptation. Une personne peut donc recevoir un accusé de réception avant qu'une requête n'affiche le nouveau résultat.

C'est une question de conception à discuter avant l'implémentation. L'écran doit-il afficher « mise à jour en cours » ? Quel résultat confirme-t-il que la modification demandée est visible ? Si le résumé reste brièvement inchangé, la personne doit-elle attendre ou envoyer une autre demande ? Soumettre la commande plusieurs fois peut demander davantage de travail ; ce n'est pas la même chose qu'actualiser la vue.

Séparer les vues permet aussi à des lecteurs différents de poser des questions différentes sur la même activité. Un résumé de panier et une vue du stock répondent à des besoins différents. Leur existence ne transforme pas les modifications du panier et du stock en une action indivisible ; la [coordination entre les deux](/fr/build/stock-and-checkout/) nécessite sa propre conception.

## Quand l'acteur suivant est l'application

Certaines étapes démarrent sans que quelqu'un appuie sur un bouton. Event Modeling utilise un engrenage pour une **automatisation** : une information devient disponible, un processus réagit et émet la commande suivante. Le [modèle d'automatisation Event Modelers](https://eventmodelers.ai/cheatsheet/) représente cela par des événements alimentant un modèle de lecture, puis une automatisation, une commande et un nouvel événement.

Les deux schémas de panier se concentrent sur le parcours de la personne. Vous pourriez ensuite ajouter une étape distincte de réservation de stock et en expliquer le déclencheur et le résultat. Cette nouvelle étape a besoin de ses propres règles et scénarios d'échec ; une flèche ne promet ni que toutes les étapes se terminent ensemble, ni que le travail externe n'arrive exactement qu'une fois.

## Dessiner une petite tranche complète

Une **tranche** est un élément de comportement utile que vous pouvez décrire et vérifier d'un seul tenant. Commencez par l'écran et la demande. Ajoutez la règle et l'événement qui en résulte, puis le modèle de lecture nécessaire ensuite. Incluez des scénarios d'acceptation et de refus. Le premier diagramme vous donne une petite forme fonctionnelle à adapter.

Demandez à votre agent de vous réexpliquer la tranche. Remettez en question les décisions manquantes : « Où la quantité est-elle vérifiée ? » « Ce fait signifie-t-il demandé ou terminé ? » « Que se passe-t-il si l'étape suivante échoue ? » Ce sont des questions d'ingénierie pertinentes, même si vous ne pouvez pas encore lire l'implémentation.

Les petites tranches donnent à un agent une tâche délimitée. Elles partagent tout de même des contrats : modifier le sens d'un événement peut affecter plusieurs lecteurs. Le modèle rend cette dépendance visible. Le [graphe du Neo IDE](/fr/getting-started/visual-ide/) reliera plus tard ces concepts au code afin que vous puissiez explorer visuellement leurs relations.

## Essayer le modèle avec vos propres mots

Choisissez une petite action dans une application que vous voulez construire. Décrivez une demande acceptée, une demande refusée et les informations dont quelqu'un a besoin ensuite. Demandez-vous ensuite ce qu'il faudrait savoir dans un mois pour expliquer le résultat.

<details>
<summary>Une façon de vérifier votre raisonnement</summary>

Utilisez le passé pour le fait accepté et un verbe pour la demande. Identifiez la règle qui sépare vos exemples réussis et refusés. Vérifiez que la vue répond à une vraie question et que votre explication lui permet d'être mise à jour plus tard. Enfin, cherchez le contexte important que vous supposiez mémorisé mais qui ne figure jamais dans le modèle.

</details>

Ensuite, utilisez ce vocabulaire commun pour [déléguer avec confiance à votre agent de codage](/fr/start/trusting-your-agent/).
