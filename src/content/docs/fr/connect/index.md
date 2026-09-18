---
title: Intégrations
description: Reliez les événements applicatifs, les services externes et les commandes de suivi.
sidebar:
  order: 0
---
<!-- translation-source-sha256: 2705c3a7804826cbc75c44a424d78178f2d211d1dd19a6756d2bafe6ecd535e2 -->

Enregistrer une modification et terminer le travail qui en découle sont deux choses distinctes. Un document peut être sauvegardé avant la génération de son aperçu ; un message peut être enregistré avant l'envoi de sa notification. Votre application doit représenter à la fois la modification acceptée et le travail qui reste à faire.

Une **intégration** relie un fait de votre application à un autre travail. NeoHaskell vous permet de décrire la demande et de transformer son résultat en commande. Vous décidez toujours ce que signifie réussir, comment les échecs apparaissent aux personnes et quelles opérations peuvent être répétées sans danger.

Avant d'implémenter des intégrations, soyez à l'aise avec les [commandes et événements](/fr/build/commands-and-events/) et les [requêtes](/fr/build/queries/). Les exemples étendent le projet d'exercice de commerce en ligne, mais le même cycle de vie d'intégration s'applique à d'autres applications. Les personnes qui évaluent l'approche peuvent suivre l'introduction et les sections de décision sans implémenter les exemples.

Continuez dans le projet `mug-shop` créé avec `neo new`, avec ses modules `src/Shop/Cart/` et `src/Shop/Stock/` et l'enregistrement de `src/App.hs`. Terminez d'abord [stock et passage en caisse](/fr/build/stock-and-checkout/), puis conservez les tests existants en ajoutant des effets. Toutes les commandes de cette section s'exécutent depuis ce répertoire de projet.

## Préparer votre projet

Le projet généré par `neo new` inclut déjà les bibliothèques centrales et d'intégration de NeoHaskell. `Integration.Command` et `Integration.Timer`, ainsi que les modules HTTP, e-mail, document et IA utilisés ci-dessous, sont disponibles sans ajouter un package pour chaque fournisseur.

Conservez `neo.json` comme configuration du projet. Les intégrations intégrées ne nécessitent aucune nouvelle entrée dans sa liste de dépendances. Si un adaptateur personnalisé a besoin d'une bibliothèque supplémentaire, utilisez les réglages de dépendances décrits dans la [référence CLI](/fr/reference/cli/) ; laissez Neo gérer les fichiers de build générés.

Ajoutez le code applicatif sous `src/Shop/`, enregistrez les handlers et services dans `src/App.hs` et placez les vérifications sous `tests/`. Depuis la racine du projet, utilisez :

```sh
neo build
neo test
neo run
```

Arrêtez le serveur en cours avant d'en démarrer un autre. Gardez un autre terminal pour les requêtes HTTP et l'IDE. Les identifiants des fournisseurs appartiennent à la [configuration](/fr/build/configuration/) du processus en cours ; installer une bibliothèque ne fournit ni compte, ni identifiants, ni workflow complet.

Les extraits de code se concentrent sur la règle ou la demande enseignée. Les modules d'implémentation utilisent `import Core` ; les en-têtes de modules et autres imports sont omis ici. Le [checkpoint complet des intégrations](/examples/mug-shop-connect.tar.gz) contient des fichiers exécutables pour la coordination, les uploads et l'exercice du timer. Appliquez-le sur votre projet existant lorsque vous voulez vérifier le câblage complet.

Commencez par [la coordination Cart-Stock](/fr/connect/workflows/), qui ne nécessite aucun service externe. Les chapitres suivants placent des fabriques de fournisseurs dans votre projet et identifient les nouvelles commandes et callbacks à définir avant de les connecter.

## Suivre un événement dans une intégration

Pour le projet d'exercice, considérons une confirmation de commande. Le workflow est une conception applicative construite avec ces primitives d'intégration :

1. Une commande accepte la commande et enregistre un événement de commande passée.
2. Un handler sortant reconnaît cet événement et décrit une demande d'e-mail.
3. L'intégration exécute la demande en dehors de la fonction de décision de la commande.
4. Son callback produit une commande qui enregistre l'acceptation ou l'échec du fournisseur.
5. Une requête rend l'état résultant visible.

La quatrième étape est délibérément une **commande** : les informations nouvelles passent toujours par les règles de l'application. Appeler un fournisseur ne modifie pas directement une entité ou une requête.

Une intégration **sortante** réagit aux événements de l'application. Une intégration **entrante** commence par quelque chose d'extérieur à ce flux d'événements, comme un timer, et soumet une commande.

## Lire le petit vocabulaire

Deux petites opérations organisent le travail dans un handler :

```haskell
batch :: Array Action -> Outbound
none :: Outbound
```

`Integration.outbound` transforme un record de demande pris en charge en une action. `Integration.batch` rassemble les actions à effectuer pour un événement. `Integration.none` indique que ce handler n'a aucun travail pour cet événement. Un batch est une collection, pas une transaction couvrant plusieurs systèmes externes.

Le type de demande concret détermine les champs disponibles. La plupart des intégrations de fournisseurs proposent `onSuccess` et `onError`. Les deux callbacks doivent produire le **même type de commande**. Une commande avec des alternatives réussite/échec est une possibilité ; deux types de commandes sans rapport ne satisferont pas un même `Request command`.

## Enregistrer les deux extrémités

Définir un handler ne l'enregistre pas. L'application doit enregistrer le handler sortant et le service contenant chaque commande qu'il peut émettre.

Les commandes émises doivent déclarer `InternalTransport` : le dispatcher d'intégration collecte ces commandes séparément des endpoints HTTP publics. Une commande unique ne peut pas mélanger les transports internes et publics. Lorsque les personnes et les intégrations ont besoin de la même règle, utilisez des points d'entrée séparés qui partagent leur logique de décision, comme le montre [l'exemple du timer](/fr/connect/timers/). Ajoutez le handler Cart-Stock complet à votre projet dans [workflows](/fr/connect/workflows/).

Un handler de callback manquant est journalisé par le dispatcher. Cela ne prouve pas que l'opération externe initiale a échoué : le fournisseur l'a peut-être déjà acceptée.

## D'où vient la confiance

Testez séparément trois limites :

- **Sélection :** l'événement attendu produit-il une action et un événement sans rapport n'en produit-il aucune ?
- **Traduction :** un résultat de fournisseur produit-il la bonne commande, y compris pour les résultats mal formés et les refus ?
- **Achèvement :** cette commande atteint-elle le service enregistré et produit-elle l'état de requête attendu ?

Le runtime d'intégration utilise des workers par entité et des files bornées. Il inclut la gestion des erreurs et des délais configurables. Ces mécanismes n'établissent ni une livraison durable, ni une exécution exactement une fois en cas de crash du processus et de fournisseur externe. Un travail important encore incomplet nécessite une conception de récupération au niveau de l'application.

Les handlers typés reconstruisent l'entité depuis son flux lors du traitement ; ils ne reçoivent pas un snapshot garanti pris au moment de l'événement déclencheur. Placez dans l'événement lui-même les informations qui doivent décrire cette occurrence précise.

## Choisir le prochain besoin

- [Coordonner le travail entre les entités](/fr/connect/workflows/).
- [Appeler une API HTTP externe](/fr/connect/http-and-payments/).
- [Connecter un compte externe](/fr/connect/provider-accounts/) via un consentement OAuth explicite.
- [Envoyer un e-mail](/fr/connect/email/).
- [Joindre des fichiers](/fr/connect/files/) et [extraire le contenu de documents ou d'audio](/fr/connect/documents/).
- [Ajouter une assistance IA](/fr/connect/ai/) et [contraindre les outils IA](/fr/connect/ai-tools/).
- [Planifier un travail périodique](/fr/connect/timers/).
- [Construire une intégration réutilisable](/fr/connect/custom-integrations/).

**À essayer :** décrivez ce que l'application d'exercice doit afficher lorsqu'une commande existe mais que sa demande d'e-mail expire. Incluez un état pour un résultat de fournisseur inconnu. Identifiez ensuite un transfert similaire dans une application que vous aimeriez construire et expliquez quelles parties du modèle restent applicables.

<details>
<summary>Notes sur le code source du framework</summary>

- [Modèle de projet Neo](https://github.com/neohaskell/NeoHaskell/blob/main/neo/assets/templates/project.cabal.j2)
- [core/service/Integration.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Integration.hs)
- [core/service/Service/Application/Integrations.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Application/Integrations.hs)
- [core/service/Service/Integration/Dispatcher.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Integration/Dispatcher.hs)

</details>
