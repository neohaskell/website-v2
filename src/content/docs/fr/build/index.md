---
title: "Construire votre application"
description: Faites évoluer un projet, de sa première demande aux décisions, vues, tests et intégrations.
sidebar:
  order: 0
---
<!-- translation-source-sha256: 99f407dc4a61200ac1fffefeb2d025a4c69aa842af22915a2daec5319a885508 -->

Une application accepte des demandes, applique des règles, se souvient de ce qui s'est passé et présente des informations utiles. NeoHaskell donne à ces responsabilités des emplacements explicites dans le code. Comprendre ces connexions vous aide à construire un comportement que vous pouvez expliquer et vérifier.

Ce parcours reste dans **votre propre projet**, créé avec `neo new mug-shop`. Vous écrirez ses modules, le construirez avec `neo build`, l'exécuterez avec `neo run`, le vérifierez avec `neo test` et l'explorerez avec `neo ide`. Chaque leçon fait évoluer cette même application.

Notre projet d'exercice récurrent vend une tasse. Le commerce en ligne donne aux quantités, à la disponibilité et au travail externe des significations familières. Votre application réelle peut gérer des rendez-vous, des documents, de la logistique ou autre chose ; transposez la méthode à ses demandes et à ses engagements.

## Choisir votre profondeur

Si vous évaluez NeoHaskell, lisez l'introduction et les sections consacrées aux décisions. Elles expliquent les bénéfices et les responsabilités qui restent à la charge de votre équipe. Commencez par [pourquoi NeoHaskell](/fr/start/why-neohaskell/) pour la vision d'ensemble.

Si vous construisez, terminez la [mise en route](/fr/getting-started/) et suivez ces jalons. Votre agent de codage peut ouvrir et adapter les fichiers avec vous. La documentation montre tout de même l'implémentation et ses preuves afin que vous puissiez questionner leur signification.

| Jalon | Ce que vous comprendrez ou construirez |
| --- | --- |
| [Votre première tranche fonctionnelle](/fr/build/first-cart/) | Créer les modules Cart et lire le premier résultat de votre application. |
| [Explorer votre panier visuellement](/fr/getting-started/visual-ide/) | Relier la commande, l'événement et le résumé dans l'IDE de votre projet. |
| [Commandes et événements](/fr/build/commands-and-events/) | Ajouter une action avec une règle explicite de quantité positive. |
| [Entités et état](/fr/build/entities-and-state/) | Expliquer comment l'historique accepté éclaire la décision suivante. |
| [Requêtes](/fr/build/queries/) | Organiser les informations autour de la question d'un lecteur. |
| [Stock et passage en caisse](/fr/build/stock-and-checkout/) | Ajouter un second domaine et identifier la coordination nécessaire. |
| [HTTP et interfaces frontend](/fr/build/http-and-frontend/) | Relier une interface aux résultats réels de l'application. |
| [Tester le comportement](/fr/build/testing/) | Écrire des vérifications de décision, de relecture et HTTP. |
| [Contrôle d'accès](/fr/build/access-control/) | Décider qui peut agir et quels enregistrements chacun peut voir. |
| [Configuration](/fr/build/configuration/) | Relier les réglages à leurs consommateurs réels. |
| [Examiner votre application](/fr/build/your-shop/) | Établir ce qui fonctionne et choisir la prochaine tranche utile. |
| [Les fondamentaux du langage](/fr/build/language-essentials/) | Lire la syntaxe inconnue au moment où elle devient utile. |

La page consacrée au langage est un complément, pas un examen d'entrée. Vous pouvez comprendre le sens d'une action avant de mémoriser chaque déclaration qui la prend en charge.

## Faire grandir un engagement à la fois

La première application crée des paniers vides. Nous ajoutons ensuite des sélections, un résumé et des décisions de stock. La [section sur les intégrations](/fr/connect/) relie ces décisions et introduit des fournisseurs externes. [Exploiter et faire évoluer](/fr/operate/) emmène le même projet vers la persistance, le déploiement et les modifications.

Chaque étape a ses limites. Un ajout au panier établit une sélection ; une commande acceptée nécessiterait une politique supplémentaire. Une règle de réservation peut être testée avant d'avoir un déclencheur. Une réponse réussie d'un fournisseur doit être reliée à l'opération qui l'a demandée. Gardez ces significations explicites à mesure que le projet grandit.

L'application d'introduction utilise un magasin en mémoire et des politiques locales publiques de développement. Les chapitres suivants introduisent délibérément un stockage durable et l'authentification au lieu de supposer silencieusement qu'ils sont déjà configurés.

## Une première décision qui vous appartient

« Deux tasses » signifie-t-il une entrée de panier avec une quantité de deux ou deux sélections distinctes ? Nous utiliserons une entrée par ajout accepté. Ainsi, un ajout de deux tasses compte comme une entrée dans le résumé.

<details>
<summary>Raisonnement et vérifications suggérés</summary>

Énoncez ce que signifie le compteur de l'interface avant de l'implémenter. Vérifiez un panier vide, un ajout de deux unités, un second ajout et une quantité nulle refusée. Si votre application doit fusionner les produits répétés ou afficher le total des unités, concevez et testez explicitement cette modification.

</details>

Commencez par [votre première tranche fonctionnelle](/fr/build/first-cart/). Consultez le [glossaire](/fr/reference/glossary/) lorsqu'un terme a besoin d'un rappel rapide.
