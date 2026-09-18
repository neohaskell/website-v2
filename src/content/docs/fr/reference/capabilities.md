---
title: Trouver la capacité dont vous avez besoin
description: Reliez un besoin applicatif au concept NeoHaskell, à la documentation et à la limite d'implémentation appropriés.
sidebar:
  order: 0
---
<!-- translation-source-sha256: a2e9e49f2dcbc6c452fccd1c6453a08068495aac69104a55064b744148f2ea17 -->

Vous n'avez pas besoin d'apprendre chaque module avant d'utiliser NeoHaskell. Commencez par la tâche que votre programme doit effectuer, trouvez le concept pertinent et approfondissez lorsque la tâche actuelle l'exige. Cette carte aide aussi une personne qui évalue l'approche à distinguer les briques du framework des fonctionnalités qu'une équipe doit implémenter.

Continuez dans l'application créée avec `neo new`. Dans le projet guidé, le code Cart et Stock se trouve sous `src/Shop/`. Les liens ci-dessous expliquent comment utiliser chaque capacité ; les liens vers l'implémentation publique fournissent des preuves complémentaires.

## Modéliser et exposer le comportement applicatif

| Besoin | Capacité | Où continuer |
| --- | --- | --- |
| Décider si une modification demandée est autorisée | Commandes et `Decider` | [Construire une application](/fr/build/) |
| Préserver les faits acceptés | Événements et magasins d'événements | [Persistance](/fr/operate/persistence/) |
| Reconstruire l'état actuel d'une entité | Entités et interfaces de snapshot-cache | [Construire une application](/fr/build/) |
| Préparer des vues pour différents lecteurs | Requêtes, magasins d'objets de requête, pagination | [Construire une application](/fr/build/) |
| Servir des commandes et des requêtes | Transport HTTP, JSON, schéma/OpenAPI | [Construire une application](/fr/build/) |
| Câbler l'application | `Application` et définitions de services | [Mise en route](/fr/getting-started/) |
| Restreindre les actions et les lectures | Authentification, politiques de commande, contrôles d'accès aux requêtes | [Sécurité](/fr/operate/security/) |

Les commandes, événements et requêtes ont des marqueurs de dérivation qui génèrent le câblage du framework. Les entités fournissent explicitement leur état initial et leur comportement de mise à jour. Apprenez le rôle conceptuel avant d'explorer le fonctionnement de cette génération.

## Connecter une application à d'autres systèmes

| Besoin | Capacité | Limite |
| --- | --- | --- |
| Réagir à un fait accepté | Runtime d'intégration sortante | Définir le suivi métier et le résultat d'échec |
| Recevoir des déclencheurs externes ou un travail temporisé | Intégrations entrantes | Transformer l'entrée en commande explicite |
| Appeler un fournisseur | Client HTTP et types de demande/réponse d'intégration | Les contrats propres au fournisseur nécessitent encore une implémentation et des tests |
| Connecter le compte d'un utilisateur chez un fournisseur | Consentement OAuth2, callbacks et stockage de secrets | [Comptes fournisseurs](/fr/connect/provider-accounts/) |
| Envoyer un e-mail | Intégrations Brevo et Azure Communication Services | Nécessite une configuration du fournisseur et une vérification de livraison |
| Ajouter des fonctionnalités de modèle de langage | OpenRouter, AzureAI et intégrations d'agent/outils | Définir les actions autorisées et la vérification des résultats |
| Traiter des documents | Uploads de fichiers, PDF, OCR et intégrations de fournisseurs associées | Persister les octets, protéger l'accès et traiter les échecs d'extraction |
| Traiter de l'audio | Intégrations audio/transcription | Traiter la sortie externe comme une entrée faillible |

Suivez les [intégrations](/fr/connect/) pour ces sujets. Le projet d'exercice de commerce en ligne illustre leur combinaison, mais les capacités s'appliquent à tous les domaines. Un client HTTP générique a toujours besoin d'un contrat fournisseur : il ne s'agit pas, par exemple, d'un adaptateur de paiement ou d'expédition prêt à l'emploi. Les règles et workflows propres au domaine restent du travail applicatif, sauf si une implémentation précise les fournit.

## Utiliser le vocabulaire du langage lorsque nécessaire

La bibliothèque core inclut `Text`, `Array`, `Map`, `Maybe`, `Result`, `Task`, les identifiants, les dates, la journalisation et des primitives associées. Les traits décrivent des opérations réutilisables entre les types. Les modules JSON/schéma relient les données typées aux représentations externes.

Les modules système fournissent les fichiers, chemins, répertoires, accès à l'environnement, temps et sous-processus. Les modules de concurrence fournissent les tâches, canaux, verrous et variables partagées. Ce sont des mécanismes pour un besoin particulier ; introduire de la concurrence ne rend pas automatiquement une opération métier atomique entre services.

Les modules proches du langage incluent l'arithmétique décimale, le parsing et les outils NeoQL. Leur existence ne promet ni un modèle complet d'argent/fiscalité, ni un langage de reporting métier sans restriction. Choisissez l'opération prise en charge, la représentation et les tests aux limites correspondant au besoin réel de votre application.

Consultez [les fondamentaux du langage](/fr/build/language-essentials/) et le [glossaire](/fr/reference/glossary/) lorsque du vocabulaire vous est inconnu.

## Construire, inspecter, vérifier et exploiter

| Besoin | Capacité | Documentation |
| --- | --- | --- |
| Créer et utiliser un projet | CLI Neo | [Référence CLI](/fr/reference/cli/) |
| Comprendre visuellement le modèle | Neo IDE intégré | [IDE visuel](/fr/getting-started/visual-ide/) |
| Établir des preuves comportementales | DSL de test, scénarios applicatifs, tests d'acceptation Hurl | [Tests](/fr/build/testing/) |
| Relier des stockages persistants | Infrastructure Postgres | [Persistance](/fr/operate/persistence/) |
| Exécuter et modifier l'application | Sondes, journalisation, relecture et pratiques de compatibilité | [Exploiter et faire évoluer](/fr/operate/) |
| Améliorer le framework | Application de référence publique, outils du dépôt, décisions architecturales | [Contribuer](/fr/operate/contributing/) |

Pour les détails au niveau du code source, la [carte des capacités](https://github.com/neohaskell/NeoHaskell/blob/main/codemap/capabilities.yaml) du dépôt identifie les responsables de l'implémentation et les tests. Une capacité listée indique où enquêter ; un exemple précis et un test établissent le comportement sur lequel vous pouvez compter.

Pour des recettes ciblées, parcourez les [guides pratiques](/fr/guides/).
