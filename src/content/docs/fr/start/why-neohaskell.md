---
title: "Pourquoi NeoHaskell ?"
description: "Comprenez pourquoi préserver le sens compte lorsque les personnes et les agents d'IA peuvent modifier rapidement les logiciels."
sidebar:
  order: 1
---
<!-- translation-source-sha256: b6fe62649e9204ef2f91dea39a7c8962432a7cbfb9f6eaaed07c25019081d6ea -->

Vous savez ce que vous voulez qu'une application fasse. Elle doit peut-être organiser des réservations, aider à prendre des décisions, gérer des adhésions ou suivre du travail. Vous pouvez expliquer qui l'utilise, ce que ces personnes sont autorisées à faire et à quoi ressemble un résultat réussi. Transformer cette compréhension en logiciel est un défi. La préserver quand le logiciel évolue en est un autre.

NeoHaskell s'attaque d'abord au second défi. Il réunit un dialecte de Haskell, un framework applicatif et des outils de développement autour d'une ambition simple : **vous devez pouvoir comprendre ce que signifie votre application pendant que des personnes et des agents d'IA la construisent et la modifient.**

Cette ambition influence la manière dont vous décrivez une fonctionnalité, dont l'application se souvient de ce qui s'est passé et dont vous décidez si le travail d'un agent est prêt à être utilisé. Vous pouvez comprendre l'idée avant d'apprendre un langage de programmation ou d'installer quoi que ce soit.

## Qu'est-ce qui devient important lorsque le code est plus facile à produire ?

Un agent de codage peut transformer une courte demande en une grande quantité de code. Il peut écrire un écran, connecter un service et proposer une modification pendant que vous êtes encore en train de préciser ce que vous vouliez dire. Cela rend l'expérimentation plus accessible. Cela rend aussi une consigne imprécise très vite lourde de conséquences.

Imaginez que vous demandiez de modifier une adresse de livraison. Plusieurs interprétations sont raisonnables : modifier la valeur par défaut des commandes futures, modifier une commande qui n'a pas été expédiée ou mettre à jour toutes les commandes associées à cette personne. Chacune peut produire du code qui s'exécute. Elles expriment des engagements différents.

La question difficile est donc plus précise que « Le code fonctionne-t-il ? » C'est : « Quelle décision avons-nous prise, où s'applique-t-elle et comment savoir que l'application la respecte toujours ? » Une grande quantité de code plausible ne peut pas répondre à elle seule.

C'est ce que le *sens* désigne dans toute cette documentation. Un nombre représente quelque chose. Un état affirme quelque chose sur un processus. Une permission accorde une autorité précise à une personne. Une modification n'est correcte qu'en relation avec ces intentions.

> Plus l'implémentation est rapide, plus un modèle clair prend de la valeur : le délai entre un malentendu et le logiciel qui en découle diminue.

## Donner une forme commune aux idées importantes

NeoHaskell organise le comportement d'une application autour de quelques concepts dont on peut aussi parler en langage courant :

- Une **commande** demande qu'une chose se produise.
- Une **décision** vérifie si cette demande est autorisée dans la situation actuelle.
- Un **événement** enregistre un fait accepté.
- Une **entité** est la chose dont l'état actuel éclaire la décision.
- Une **requête** prépare les informations dont quelqu'un a besoin pour les lire.

Vous n'avez pas encore besoin de mémoriser ces termes. Imaginez une demande qui arrive à un point de décision clair. Si elle est acceptée, elle devient un fait enregistré. Si elle est refusée, l'appelant reçoit une raison et la modification demandée ne devient pas un fait.

![Une demande passe par des contrôles d'accès et une décision fondée sur l'état actuel. L'acceptation enregistre un événement ; le refus renvoie une raison sans cet événement.](/diagrams/request-decision-event.svg)

*L'application évalue l'intention avant d'enregistrer une modification. Le diagramme décrit le traitement normal d'une commande ; les politiques d'accès et les règles métier doivent être câblées et implémentées par l'application.*

Dans le projet d'exercice de commerce en ligne, « réserver un article » est une demande. « Un article a été réservé » est un fait accepté. Les confondre permettrait à un écran de promettre un stock avant que l'application ne l'ait réellement sécurisé. La même distinction compte pour « approuver cette demande », « réserver ce rendez-vous » ou « publier ce document ».

Ce vocabulaire aide à localiser un désaccord. La demande est-elle imprécise ? La règle est-elle fausse ? Un fait manque-t-il ? L'écran affiche-t-il les mauvaises informations ? Ce sont des questions plus petites et plus utiles que demander à un agent de corriger « le système ».

## Se souvenir de la manière dont le présent s'est formé

Une valeur actuelle est souvent un résumé. Un solde résume des mouvements d'argent. L'état d'une réservation résume une suite de demandes et de décisions. Le niveau actuel d'une adhésion n'explique pas, à lui seul, quelles conditions s'appliquaient l'année dernière.

Une application peut ne conserver que la dernière valeur, ou préserver les faits importants dont cette valeur est dérivée. Le framework de NeoHaskell utilise la seconde approche, appelée **event sourcing**. Les événements acceptés forment l'historique à partir duquel l'état des entités est reconstruit. Les modèles de lecture utilisent les événements pour préparer des vues utiles.

La modification prend ainsi une forme visible. Une correction peut enregistrer ce qui a été corrigé ; une annulation peut conserver le fait que quelque chose avait été accepté auparavant. Un nouveau rapport peut interpréter les faits déjà disponibles au lieu de dépendre entièrement de ce qu'un écran avait montré à un instant donné.

L'historique a toutefois ses limites. Si vous n'avez jamais enregistré la raison, le prix, l'identité ou la preuve pertinente, la relecture ne peut pas l'inventer. Choisir les faits qui comptent fait partie de la conception de l'application. Le chapitre suivant, [historique et modifications](/fr/start/history-and-change/), approfondit ce sujet avec de petits exemples vérifiables à la main.

## Mettre le modèle là où les personnes peuvent en discuter

**Event Modeling** est une manière de décrire la séquence des demandes, des décisions, des faits acceptés et des informations dont les personnes ont besoin. Elle permet à quelqu'un qui comprend le processus de participer avant que l'implémentation ne l'enfouisse accidentellement dans le code.

Vous pouvez par exemple montrer une étape et demander : « Que se passe-t-il si cette demande arrive deux fois ? » ou « Qui a le droit d'annuler cette décision ? » Vous pouvez remarquer qu'un e-mail peut échouer après l'acceptation d'une commande. Vous pouvez exiger que l'interface distingue « demandé » de « confirmé ». Ces contributions sont utiles même si vous ne pouvez pas écrire vous-même l'implémentation.

NeoHaskell donne à ces idées des structures correspondantes dans le programme. Le Neo IDE fournit aussi un graphe pour explorer le modèle à côté du code source. Aujourd'hui, la synchronisation met à jour le modèle depuis le code ; dessiner une boîte ne génère pas une application complète. Vous pouvez utiliser le graphe pour expliquer à un agent la modification attendue et inspecter la manière dont son implémentation s'y relie.

Un modèle utile reste assez proche du programme pour que la conversation continue après la première mise en production. Vous y revenez pour prendre des décisions, enquêter sur un problème ou présenter le projet à quelqu'un.

## Rendre la portée d'une modification compréhensible

Une fonctionnalité devient souvent plus facile à raisonner quand vous pouvez suivre un comportement complet : ce qui le déclenche, la règle qui s'applique, ce qu'il enregistre et ce que quelqu'un peut voir ensuite. Nous appelons cela une **tranche**.

Une tranche fournit à un agent une tâche délimitée et vous donne quelque chose de concret à accepter. « Permettre à un membre de demander un renouvellement et afficher s'il a réussi » a une portée plus claire que « construire la gestion des adhésions ». Dans le projet d'exercice, créer un panier est une première tranche ; préparer son résumé et connecter le stock sont des étapes supplémentaires.

Des limites stables permettent aux nouveaux comportements de s'appuyer sur les faits existants sans dépendre de chaque détail de l'implémentation précédente. Elles peuvent rendre les modifications plus faciles à relire et à répartir entre des personnes ou des agents. Un événement partagé crée tout de même une vraie dépendance : modifier son sens peut affecter plusieurs lecteurs. [Faire évoluer par tranches](/fr/start/growing-by-slices/) explique à la fois le bénéfice et cette responsabilité.

## Ce que le langage et le framework apportent

Cette approche pourrait être construite dans d'autres langages. NeoHaskell réunit le vocabulaire, les conventions et les mécanismes d'exécution afin que vous puissiez travailler dans une structure cohérente.

Les types du langage décrivent les relations entre les valeurs et les opérations. Le compilateur peut rejeter les éléments incompatibles avant l'exécution du programme. Le framework fournit l'exécution des commandes, le stockage des événements, la reconstruction des entités, les requêtes et les mécanismes d'intégration. La CLI propose un parcours commun pour créer, construire, tester et inspecter un projet.

Ces composants apportent des formes de preuve différentes. Un programme qui compile peut tout de même implémenter une limite de quantité inadaptée. Un test peut affirmer la mauvaise réponse. Un modèle peut omettre un refus important. La valeur réside dans l'existence d'emplacements précis où exprimer et examiner chaque préoccupation, avec des outils qui vérifient des catégories particulières d'erreurs.

Vous restez la personne qui décide à quoi sert l'application. Votre agent peut effectuer une grande partie du travail d'implémentation, tandis que vous apprenez à demander des preuves observables qu'il a suivi les règles attendues. [Travailler avec un agent](/fr/start/trusting-your-agent/) montre comment cette relation évolue.

## La valeur pratique à rechercher

Pour quelqu'un qui a une idée d'application, le bénéfice est un chemin plus clair entre une intention et une fonctionnalité qu'il peut expliquer et vérifier. Pour une équipe, c'est une manière partagée de discuter des modifications, de préserver l'historique important et d'intégrer un nouveau contributeur. Pour une personne qui évalue l'adoption, c'est une base concrète pour demander comment une application restera compréhensible après sa première mise en production.

Ce sont des bénéfices à évaluer sur votre propre travail. Ils ne promettent ni une amélioration universelle de la vitesse, ni que toutes les applications ont besoin d'event sourcing. Enregistrer un historique utile, en préserver le sens et exploiter un stockage durable demandent des efforts. Un petit site statique peut avoir peu de raisons d'en payer le coût ; un processus durable avec des révisions, des litiges et plusieurs vues d'une même activité peut en avoir beaucoup plus.

Vous pouvez continuer sans écrire de code. Commencez par voir [comment un historique explique le présent](/fr/start/history-and-change/). Explorez ensuite [comment les fonctionnalités évoluent](/fr/start/growing-by-slices/) et [si les compromis conviennent à votre projet](/fr/start/fit-and-tradeoffs/). Lorsque vous voudrez essayer la méthode vous-même, le [premier exercice de modélisation](/fr/start/a-shop-on-paper/) commence par une règle et quelques exemples.
