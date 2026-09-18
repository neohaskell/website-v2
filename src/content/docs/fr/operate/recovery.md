---
title: Récupérer avec des preuves
description: Répétez les restaurations, distinguez les échecs de projection de l'historique perdu et rapprochez les effets externes.
sidebar:
  order: 4
---
<!-- translation-source-sha256: 3efad6b471692ef116036de40f463296ac5478f053edd8e8318e41b845bebe28 -->

Restaurer une base de données ne récupère qu'une partie de l'application. Les systèmes externes peuvent encore se souvenir d'un travail que votre copie restaurée ne connaît pas. La récupération doit prendre en compte ces deux historiques sans répéter les opérations terminées ni oublier silencieusement celles qui sont inachevées. Dans un exemple de commerce en ligne, il peut s'agir de rapprocher un paiement sans débiter à nouveau le client.

L'historique des événements aide à reconstruire l'état de l'application. Il ne peut pas recréer une pièce jointe perdue à partir de métadonnées ni annuler seul un paiement externe. La récupération inclut les ressources et les organisations qui entourent l'application.

## Identifier d'abord ce qui a échoué

| Observation | À examiner avant de modifier les données |
| --- | --- |
| Aucune réponse de `/health` | Démarrage du processus, configuration, connexion à la base, liaison du port |
| `/health` fonctionne, `/ready` reste à `503` | Progression ou échec de la reconstruction des requêtes |
| Prêt, mais une vue est incorrecte | Logique de projection, événements stockés, autorisation, révision en fonctionnement |
| Les métadonnées du fichier existent, le téléchargement échoue | Volume de blobs et état du cycle de vie du fichier |
| Le fournisseur a réussi, le résultat applicatif est incertain | Identité de la transaction fournisseur et historique local de suivi |

Conservez les journaux utiles et l'identité de la révision en échec. Une réinitialisation aveugle de la base peut détruire les preuves nécessaires pour distinguer ces cas.

## Répéter une restauration dans un environnement isolé

Terminez d'abord [la persistance](/fr/operate/persistence/) ; le magasin initial en mémoire ne possède aucun historique conservé à restaurer. Avant que des personnes ne dépendent des données retenues, répétez une restauration avec des opérations représentatives :

1. Créez un petit historique connu : une modification acceptée, une modification rejetée et toute pièce jointe ou tout résultat d'intégration pris en charge. Dans `mug-shop`, créez un panier, ajoutez une quantité positive et confirmez que zéro est refusé.
2. Effectuez une sauvegarde avec les procédures de base de données et de stockage de fichiers de votre environnement d'hébergement.
3. Restaurez dans un environnement isolé où les effets sortants de production sont désactivés ou remplacés par des endpoints de test contrôlés.
4. Exécutez `neo run` depuis le projet applicatif restauré avec sa configuration de stockage isolée et attendez `/ready`.
5. Comparez les entités et les vues reconstruites avec l'historique connu.
6. Vérifiez les octets des pièces jointes, les limites d'autorisation et le traitement du travail externe inachevé.
7. Enregistrez la durée de récupération et la dernière opération acceptée incluse dans la sauvegarde.

Incluez les uploads abandonnés dans cette répétition. Le module d'upload de fichiers possède un worker de nettoyage, mais le démarrage normal de l'application ne le lance pas actuellement. Ne supposez pas qu'une expiration ou un intervalle de nettoyage configuré prouve que les octets expirés ont été supprimés.

Les deux dernières mesures répondent à des questions métier : pendant combien de temps l'application pourrait-elle être indisponible et quelle quantité de travail récent pourrait nécessiter un rapprochement ? NeoHaskell ne choisit pas ces tolérances à votre place.

## Répéter avec votre base Postgres locale

Pour la base Docker Compose de [la persistance](/fr/operate/persistence/), vous pouvez pratiquer une restauration limitée à la base sans remplacer l'originale. Arrêtez `neo run` après avoir créé un panier connu et noté son résumé. Depuis `mug-shop`, exportez la base locale dans un fichier de sauvegarde protégé :

```sh
docker compose exec -T postgres pg_dump -U neohaskell -d neohaskell --format=custom > mug-shop.backup
```

Créez une nouvelle base dans ce même service Postgres local et restaurez-la :

```sh
docker compose exec -T postgres createdb -U neohaskell mug_shop_restore
docker compose exec -T postgres pg_restore -U neohaskell --dbname=mug_shop_restore < mug-shop.backup
```

`createdb` doit échouer si cette base de restauration existe déjà. Choisissez un nouveau nom de restauration pour une répétition ultérieure au lieu de remplacer des données que vous n'avez pas inspectées. Vérifiez que les deux commandes réussissent avant de démarrer l'application.

Si vous avez ajouté de vraies intégrations sortantes, utilisez d'abord des endpoints fournisseur contrôlés ou retirez leurs enregistrements dans une révision applicative isolée. Sélectionnez ensuite la base restaurée avec la configuration ajoutée :

```sh
DB_NAME=mug_shop_restore DB_PASSWORD=neohaskell neo run
```

Conservez tout `DB_PORT` personnalisé utilisé pour la base locale. Dans un autre terminal, vérifiez `/ready` et récupérez le résumé du panier original avec le même identifiant en utilisant les demandes de [HTTP et frontend](/fr/build/http-and-frontend/). Comparez-le avant d'exécuter des tests ou de créer d'autres données. La sauvegarde contient les données de la base, y compris un historique d'événements potentiellement sensible ; stockez-la avec une protection d'accès appropriée.

Cette procédure restaure la base d'événements. Les octets des uploads et les magasins séparés d'identifiants fournisseur nécessitent leurs propres sauvegardes. Un `pg_restore` réussi est le début des vérifications de l'application, pas leur remplacement.

## Comprendre la limite de reconstruction

Un subscriber de requête peut reconstruire les vues à partir des événements et expose des états de disponibilité. Il existe des API de niveau inférieur `rebuildAllAsync`, `rebuildFrom` et de checkpoint ; ce sont des API d'application/framework, pas une commande `neo rebuild`.

Le câblage normal de `Application` crée actuellement `Subscriber.new`, sans connecter automatiquement le magasin de checkpoints. Des lignes de requête persistantes ne prouvent pas à elles seules la reprise depuis un checkpoint. Testez le magasin exact, le parcours de démarrage et la logique de projection que vous utilisez ; consultez [la persistance](/fr/operate/persistence/).

Le magasin de requêtes Postgres crée sa table si elle est absente. Ce n'est pas un service général de migration de schéma. Les installations existantes dont le schéma de table est incompatible nécessitent un plan de migration explicite.

## Récupérer le travail externe par identité

Conservez suffisamment d'informations pour relier une opération applicative à son équivalent externe. Pour un futur workflow de paiement dans le projet d'exercice, cela signifie relier la commande à l'opération du fournisseur. Définissez ce qui arrive lorsque le fournisseur accepte une demande mais que la connexion échoue avant le retour de la réponse.

Il s'agit d'une exigence de conception pour votre adaptateur de paiement, pas d'une affirmation que NeoHaskell fournit un système complet de paiement/rapprochement. L'idempotence et la recherche de statut prises en charge par le fournisseur peuvent éclairer la conception ; leurs garanties exactes doivent être vérifiées avec le fournisseur choisi.

## Exercice : interrompre le transfert

Pour la conception de paiement ci-dessus, organisez un test contrôlé dans lequel l'opération externe réussit mais la confirmation locale est interrompue. Redémarrez et inspectez le résultat. Appliquez la même méthode à l'effet externe réalisé par votre propre application.

<details>
<summary>À vérifier</summary>

Le client ne doit pas recevoir un second débit simplement parce que la première réponse a été perdue. L'application doit atteindre un état final correct ou exposer clairement un état en attente qui peut être rapproché. Un timeout est la preuve d'une réponse incertaine, pas la preuve que le fournisseur n'a rien fait.

</details>

Ensuite, préservez ces garanties en [faisant évoluer l'application](/fr/operate/evolution/).
