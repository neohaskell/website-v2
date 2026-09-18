---
title: "Trouver votre parcours"
description: "Découvrez NeoHaskell étape par étape, évaluez-le pour votre équipe ou consultez la solution d'un problème précis."
sidebar:
  order: 0
---
<!-- translation-source-sha256: af2cdc964d0cdd2001cd719d0d6411f2e63b82dd588e12801ab137f6d8d5d093 -->

Vous n'avez pas besoin d'apprendre les détails internes d'un framework avant de décider s'il aidera votre application. Vous ne devriez pas non plus devoir relire une introduction chaque fois que vous oubliez comment configurer un service. Cette documentation accompagne ces deux situations.

## Évaluer avant de construire

Lisez [pourquoi NeoHaskell](/fr/start/why-neohaskell/), [l'historique et les modifications](/fr/start/history-and-change/), [faire évoluer par tranches](/fr/start/growing-by-slices/) et [adéquation et compromis](/fr/start/fit-and-tradeoffs/). Ces chapitres construisent l'explication à partir d'exemples et de diagrammes familiers avant d'introduire l'implémentation. Poursuivez avec les sections d'ouverture des pages sur la construction, la connexion et l'exploitation. Elles expliquent les décisions et leurs conséquences avant d'introduire du code. Même les pages avancées commencent par un problème d'application reconnaissable.

À la fin de ce parcours, vous pourrez discuter avec votre équipe des bénéfices, de l'effort d'implémentation, des responsabilités opérationnelles et des limites. Vous n'avez pas besoin d'exécuter un exemple pour comprendre ces choix.

Les diagrammes mettent en évidence une relation à la fois : une demande et son résultat, un historique et son résumé, ou une fonctionnalité et le contrat qu'elle partage. Leurs légendes expliquent la même idée avec des mots. Les diagrammes s'adaptent à la largeur de votre écran ; sélectionnez-en un pour l'agrandir sur place. Appuyez sur Échap ou sélectionnez le contrôle de fermeture pour revenir au même endroit de la page.

## Construire avec votre agent

Le parcours principal est le suivant :

1. [Décrire le comportement de l'application](/fr/start/event-modeling/) et [convenir d'une méthode de travail](/fr/start/trusting-your-agent/).
2. [Configurer un projet](/fr/getting-started/) et [l'explorer visuellement](/fr/getting-started/visual-ide/).
3. [Construire des applications](/fr/build/) : apprendre les commandes, l'état, les requêtes et les tests à travers des exemples de panier et de stock.
4. [Connecter des systèmes](/fr/connect/) et ajouter des fonctionnalités d'IA soigneusement délimitées.
5. [Exploiter et faire évoluer votre application](/fr/operate/) avec une persistance, des vérifications de déploiement et une récupération après incident.

Le commerce en ligne sert d'exemple récurrent. Le projet d'exercice commence petit et grandit au fil de l'apprentissage, afin que vous voyiez comment les concepts s'assemblent. Les pages consacrées à un sujet précis fonctionnent aussi seules : vous pouvez apprendre les requêtes ou les permissions en construisant une application complètement différente.

Les premiers exemples fournissent les décisions et les vérifications. Les exercices suivants vous demandent de faire un choix, d'en expliquer la conséquence ou de corriger la proposition d'un agent. Un raisonnement suggéré et facultatif vous aide à évaluer votre réponse. Un agent peut écrire l'implémentation ; vous restez responsable de décider ce que signifie réussir.

## Comprendre ce que promet un exemple

Un **exemple suivi** fournit du code à ajouter à votre propre projet et des vérifications à exécuter. Un **extrait partiel** enseigne une partie d'une implémentation et indique le module environnant ou le câblage applicatif dont elle a besoin. Un **exercice de conception** vous demande de choisir et d'implémenter un comportement avec les outils appris.

Vous créez une seule fois le projet d'exercice avec `neo new`, puis vous le faites évoluer tout au long du parcours. Les chapitres suivants continuent d'utiliser son panier, ses tests, sa configuration et son modèle visuel. Les exercices avancés vous laissent les choix métier tout en montrant comment implémenter et vérifier les mécanismes sous-jacents.

Pour obtenir une réponse directe, utilisez le [guide des capacités](/fr/reference/capabilities/), la [référence CLI](/fr/reference/cli/), le [glossaire](/fr/reference/glossary/) ou le [guide de dépannage](/fr/reference/troubleshooting/). La contribution est une [branche séparée](/fr/operate/contributing/) que vous pourrez suivre lorsqu'elle vous sera utile.
