---
title: Extraire le texte de documents et transcrire l'audio
description: Transformez des pièces jointes en informations révisables sans traiter le texte extrait comme un fait.
sidebar:
  order: 6
---
<!-- translation-source-sha256: b8c5cb4e9e1fac8c5d9b28ae670333b4fd76a8683059f6fc2b6461d5210b60fa -->

Un PDF ou un enregistrement audio contient des informations que vous voulez utiliser dans une application. L'extraction peut les transformer en texte interrogeable ou en brouillon à réviser, tandis que la pièce jointe originale reste la preuve. Décider si le résultat est suffisamment exact est une étape distincte.

NeoHaskell inclut l'extraction locale de texte PDF, l'extraction de documents assistée par IA et la transcription audio. L'extraction locale conserve ce traitement sur votre serveur. Les chemins IA envoient le contenu du fichier à un fournisseur externe et ajoutent des questions de coût, de latence et d'exactitude.

Prérequis : [uploads de fichiers](/fr/connect/files/), [cycle de vie des intégrations](/fr/connect/) et une commande de résultat pour enregistrer les résultats. Pour la pratique, utilisez un exemple de PDF décrivant des tasses et extrayez-en des informations de catalogue à l'état de brouillon.

## Continuer avec votre fichier importé

Utilisez la configuration d'upload `mug-shop` de [fichiers](/fr/connect/files/) et terminez la [configuration des intégrations](/fr/connect/#prepare-your-project). Placez un helper tel que `src/Shop/Integrations/ExtractArtworkText.hs` à côté de vos autres intégrations applicatives. Il reçoit le `FileRef` déjà accepté par votre commande de pièce jointe.

Déclarez la commande de résultat du traitement avec `InternalTransport` et ajoutez-la au service propriétaire avant de câbler le handler sortant dans `src/App.hs`. Le résultat a besoin d'un identifiant de tentative de traitement afin qu'une réponse tardive ne remplace pas silencieusement une tentative plus récente. La demande ci-dessous constitue la partie extraction de ce workflow.

## Commencer avec un PDF numérique

Cette **fabrique partielle** demande les deux premières pages. `attachment`, `recordExtraction` et `recordFailure` sont des valeurs de votre application. Les deux callbacks produisent un seul type de commande enregistré.

```haskell
Integration.outbound PdfExtract.Request
  { fileRef = attachment
  , config = PdfExtract.defaultConfig
      { PdfExtract.layout = PdfExtract.PreserveLayout
      , PdfExtract.pageRange = Just (1, 2)
      }
  , onSuccess = recordExtraction
  , onError = recordFailure
  }
```

Enregistrez le handler englobant comme indiqué dans [workflows](/fr/connect/workflows/). L'instance d'exécution actuelle se trouve dans `Integration.Pdf.ExtractText.Internal` ; conservez cette dépendance dans le helper complet.

Installez `pdftotext` et `pdfinfo` dans l'environnement d'exécution de l'application. L'intégration récupère les octets du fichier, écrit un PDF temporaire, exécute ces outils et renvoie le texte avec le nombre de pages et des métadonnées facultatives. `PreserveLayout` conserve le positionnement, `RawText` supprime cette préférence de disposition et `Table` utilise une option d'extraction à largeur fixe. Le résultat est du texte, pas des enregistrements parsés tels que des produits ou des entrées de document.

Si l'extraction des métadonnées échoue mais que l'extraction de texte réussit, l'implémentation actuelle peut renvoyer le nombre de pages `0` et des métadonnées `Nothing`. Cela signifie que les métadonnées sont indisponibles, pas nécessairement que le document possède zéro page.

Une page numérisée peut ne contenir aucun texte sélectionnable. L'extraction locale de PDF n'est pas de l'OCR. Vérifiez une sortie vide avant de considérer l'extraction comme un résultat applicatif utile.

## Utiliser l'IA lorsque le contenu nécessite une interprétation

`Integration.Ocr.Ai.Request` prend `fileRef`, `mimeType`, `model`, `config`, `onSuccess` et `onError`. Son instance d'exécution se trouve dans `Integration.Ocr.Ai.Internal`.

La configuration propose les modes d'extraction `FullText`, `Summary` et `Structured`. `Structured` modifie le prompt ; il ne transforme pas le `Text` renvoyé en données applicatives validées. Parsez le résultat et appliquez les mêmes règles que pour une entrée humaine ; dans l'exemple, ce sont les règles produit.

Choisissez un modèle actuellement pris en charge pour votre type de fichier et fournissez `OPENROUTER_API_KEY`. L'adaptateur envoie le fichier complet comme pièce jointe. `maxPages` est une instruction dans le prompt, pas un mécanisme de troncature du payload ni une limite de dépense stricte. L'implémentation renvoie actuellement `Nothing` pour `pageCount` et `confidence`.

## N'ajouter l'audio que lorsqu'il répond à un vrai besoin

Pour des notes enregistrées, `Integration.Audio.Transcribe.Request` utilise le même modèle de référence de fichier. Son instance d'exécution se trouve dans `Integration.Audio.Transcribe.Internal`. Sa configuration inclut une indication de langue et `maxDurationSeconds` ; ce dernier demande au modèle de limiter la transcription mais envoie tout de même le fichier complet.

Le résultat actuel fournit le texte transcrit tandis que `duration`, `confidence` et `language` valent tous `Nothing`. Cette implémentation ne propose ni transcription par fragments ni streaming. Vérifiez que le fournisseur/modèle choisi accepte le véritable encodage et le type multimédia de la pièce jointe avant de construire un workflow dessus.

## Budgéter l'opération entière

Le délai par défaut du dispatcher d'intégration est de 30 secondes. OCR utilise par défaut un délai de requête de 120 secondes et l'audio de 180 secondes. Un délai de requête plus long ne peut pas à lui seul prolonger le délai du traitement d'événement englobant.

Ce **fragment de câblage applicatif** donne quatre minutes à l'ensemble du travail événementiel ; ajustez-le d'après le comportement mesuré et les besoins de concurrence :

```haskell
    |> Application.withDispatcherConfig @()
        (\_ -> Dispatcher.defaultConfig
          { Dispatcher.eventProcessingTimeoutMs = Just 240000 })
```

Certains échecs de préparation — uploads de fichiers désactivés, fichiers manquants ou exécutable PDF manquant — lèvent des erreurs d'intégration avant le callback de résultat. Surveillez les échecs du runtime ainsi que les commandes de résultat ; sinon un document peut rester indéfiniment à l'état « traitement en cours ».

## Vérifier l'extraction dans le projet en fonctionnement

Après avoir ajouté la commande et le handler de résultat, exécutez `neo build` et `neo test` depuis `mug-shop`. Démarrez `neo run` dans un environnement qui contient les exécutables PDF nécessaires. Importez votre propre petit PDF, soumettez sa référence via la commande de pièce jointe et inspectez à la fois l'état du traitement et le texte extrait. Conservez dans `tests/` des fixtures pour la sortie vide et les métadonnées indisponibles, ainsi que pour un texte utile.

## Exercice : une dimension produit erronée

Étendez le projet d'exercice avec un workflow où les dimensions extraites doivent être révisées avant publication. Jouez les deux rôles : importez le document d'exemple, puis inspectez les valeurs proposées avant de les approuver.

<details>
<summary>Vérifications suggérées</summary>

Vérifiez un PDF numérique propre, un scan, une extraction vide, un fichier manquant, un exécutable indisponible, un timeout, un texte structuré mal formé et une dimension plausible mais fausse. Préservez la pièce jointe originale et l'identifiant de la tentative de traitement. L'approbation d'un brouillon doit être une commande distincte avec ses propres règles ; la confiance du modèle n'est pas disponible dans ces adaptateurs.

</details>

Ensuite, [utiliser l'IA pour les fonctionnalités applicatives](/fr/connect/ai/) avec la même séparation entre une suggestion générée et des données applicatives acceptées.

<details>
<summary>Notes sur le code source du framework</summary>

- [integrations/Integration/Pdf/ExtractText.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Pdf/ExtractText.hs)
- [integrations/Integration/Pdf/ExtractText/Internal.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Pdf/ExtractText/Internal.hs)
- [integrations/Integration/Ocr/Ai.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Ocr/Ai.hs)
- [integrations/Integration/Ocr/Ai/Internal.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Ocr/Ai/Internal.hs)
- [integrations/Integration/Audio/Transcribe.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Audio/Transcribe.hs)
- [integrations/Integration/Audio/Transcribe/Internal.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Audio/Transcribe/Internal.hs)
- [core/service/Service/Application.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Application.hs)
- [core/service/Service/Integration/Dispatcher.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Integration/Dispatcher.hs)
- [testbed/src/Testbed/Examples/PdfExtraction.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/Testbed/Examples/PdfExtraction.hs)

</details>
