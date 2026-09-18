---
title: Déployer une révision que vous pouvez identifier
description: Construisez et supervisez un exécutable NeoHaskell, configurez les sondes et vérifiez la nouvelle révision.
sidebar:
  order: 2
---
<!-- translation-source-sha256: f4e8162eabb9115e8838e9a1afd3ac78aa2cc8dde8a4ef4d56d736825aec86af -->

Une release est réussie lorsque la révision attendue sert le bon comportement, pas seulement lorsqu'une commande de déploiement se termine. Pour un service utilisant l'event sourcing, gardez le trafic éloigné d'un processus frais pendant que ses modèles de lecture rattrapent l'historique. La même règle s'applique à une vue de réservation, une file documentaire ou au résumé du panier du projet d'exercice.

NeoHaskell fournit une application exécutable et des endpoints HTTP de sonde. Votre environnement d'hébergement fournit le superviseur de processus, le routage du trafic, les secrets, le stockage persistant et la politique de redémarrage. La CLI actuelle ne possède pas de commande `neo deploy`.

## Préparer la même application pour un hôte

Continuez avec votre projet `mug-shop`, y compris `neo.json`, `src/Shop/Cart/`, `src/Shop/Stock/` et ses tests. Terminez la [persistance](/fr/operate/persistence/) avant de promettre que les modifications acceptées survivent à un redémarrage. La configuration initiale de `SimpleEventStore` est volontairement en mémoire.

Un parcours concret consiste à utiliser un hôte Linux sur lequel la CLI Neo, Nix et Git sont installés pour le compte qui exécute l'application. Placez-y une révision testée de **votre application**, conservez son pin de framework et ses fichiers de verrouillage, et construisez sur cet hôte ou sur un hôte de build correspondant. Fournissez les valeurs d'environnement `DB_*` de staging décrites dans [persistance](/fr/operate/persistence/) avant d'exécuter ces vérifications sur une base de staging isolée :

```sh
neo --ci build
neo --ci test
```

La commande de test crée un état applicatif réel et démarre son propre serveur. Ne l'exécutez pas sur la base de production ni lorsqu'un autre processus occupe le port 8080. Ne configurez la base de production qu'après la réussite des vérifications de staging.

Depuis le répertoire de l'application, ceci démarre le serveur sans sortie interactive :

```sh
neo --ci run
```

Pour un petit déploiement hébergé, configurez votre superviseur de processus avec cette commande de lancement et le répertoire du projet comme répertoire de travail. Voici un **modèle d'unité systemd** pour une application installée dans `/opt/mug-shop`. Remplacez le chemin de Neo par la sortie de `command -v neo` pour le compte de service et assurez-vous que son `PATH` contient les exécutables Nix et Git de ce compte :

```ini
[Unit]
Description=Mug shop application
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=mug-shop
WorkingDirectory=/opt/mug-shop
EnvironmentFile=/etc/mug-shop.env
Environment=PATH=/home/mug-shop/.nix-profile/bin:/nix/var/nix/profiles/default/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=/usr/local/bin/neo --ci run
Restart=on-failure
RestartSec=5
KillMode=control-group

[Install]
WantedBy=multi-user.target
```

Le compte a besoin d'accéder au projet et aux répertoires de build générés. Créez `/etc/mug-shop.env` via le mécanisme de configuration protégé de l'hôte avec les champs ci-dessous. Enregistrez l'unité adaptée sous `/etc/systemd/system/mug-shop.service`, puis utilisez le compte administrateur de l'hôte :

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now mug-shop
sudo journalctl -u mug-shop -f
```

Ce parcours de lancement réconcilie et construit toujours via la CLI lors d'un redémarrage ; il a besoin de la chaîne d'outils et peut avoir besoin du réseau. Il ne s'agit pas d'une image runtime minimale précompilée. Gardez la révision et les dépendances fixes, pré-construisez avant d'admettre du trafic et testez l'arrêt/le redémarrage. Un packaging plus spécialisé relève du choix de déploiement ; la CLI ne produit pas de conteneur applicatif prêt à l'emploi ni d'environnement cloud.

## Fournir les ressources d'exécution

Avant de démarrer la révision, établissez :

- Les champs `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_POOL_SIZE`, `DB_SSL_MODE` et `DB_SSL_ROOT_CERT` câblés dans [la persistance](/fr/operate/persistence/), ainsi qu'une base de données accessible.
- Un volume d'upload durable si vous utilisez le magasin de blobs local.
- Les identifiants des fournisseurs et la configuration d'authentification fournis par le mécanisme de secrets de votre déploiement.
- Le port HTTP réellement transmis au transport.
- Un identifiant de révision enregistré par votre système de release avec les journaux et les résultats des smoke tests.

Inspectez le câblage autant que la déclaration de configuration. Un champ de port déclaré n'a aucun effet si l'application ne l'utilise pas pour configurer le serveur.

## Séparer démarrage, vivacité et disponibilité

Avec le câblage standard de l'application et du web :

| Requête | Signification | Réponse habituelle |
| --- | --- | --- |
| `GET /health` | Le processus HTTP répond | `200` |
| `GET /ready` | Les projections de requêtes enregistrées ont rattrapé leur retard | `200` lorsque prêt, `503` pendant la reconstruction ou en cas d'échec |

La santé ne prouve pas qu'un fournisseur de paiement fonctionne. La disponibilité ne certifie pas chaque workflow métier. Un câblage personnalisé peut modifier ou omettre ces routes ; vérifiez la révision réelle.

Pour Kubernetes, il s'agit d'un **fragment de sonde illustratif**, pas d'un manifeste de déploiement complet :

```yaml
startupProbe:
  httpGet:
    path: /health
    port: 8080
  periodSeconds: 5
  failureThreshold: 12
  timeoutSeconds: 2
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  periodSeconds: 10
  failureThreshold: 3
  timeoutSeconds: 2
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  periodSeconds: 5
  failureThreshold: 3
  timeoutSeconds: 2
```

Le budget de démarrage de l'exemple est `5 × 12 = 60` secondes. Dimensionnez-le pour une initialisation bornée du processus et de la base de données. La relecture historique des requêtes se produit après l'enregistrement de l'abonnement en direct et ne doit pas retarder l'ouverture HTTP ; la disponibilité reste à `503` jusqu'à ce que la relecture et les événements en direct qui se chevauchent soient drainés. Une sonde de démarrage empêche la politique de vivacité de régime normal de tuer à répétition l'initialisation.

## Admettre le trafic délibérément

1. Démarrez la révision sans lui envoyer de trafic utilisateur.
2. Observez `/health`, puis attendez que `/ready` renvoie `200`.
3. Exécutez des smoke tests représentatifs sur l'**identité de la nouvelle révision**.
4. Admettez le trafic et surveillez les échecs, la latence et les résultats métier.

Un ingress partagé peut encore atteindre une ancienne révision. Sa réponse réussie ne peut pas, à elle seule, prouver que la nouvelle révision fonctionne.

Pour `mug-shop`, créez un panier, ajoutez une quantité autorisée, observez les résultats des requêtes Cart et Stock, puis vérifiez que zéro est refusé. Réutilisez les formes de demande de [HTTP et frontend](/fr/build/http-and-frontend/) sur la nouvelle révision. Ne vérifiez un résultat externe que si vous avez implémenté cette intégration, avec un environnement fournisseur contrôlé. Les sondes intégrées établissent des faits plus limités. Ce guide ne fournit ni ne certifie un déploiement cloud, de paiement ou d'IA de bout en bout.

Pour une instance locale sur le port 8080 :

```sh
curl -i http://127.0.0.1:8080/health
curl -i http://127.0.0.1:8080/ready
```

## Tenir compte des limites opérationnelles actuelles

Les clients Postgres utilisent des pools bornés. Les connexions d'écoute pour `LISTEN/NOTIFY` nécessitent une connexion directe qui conserve la session ; ne les faites pas passer par PgBouncer en mode transaction. La prise en charge des endpoints mutualisés/directs et de la mise à l'échelle à zéro de Neon est suivie dans [l'issue #857](https://github.com/neohaskell/NeoHaskell/issues/857).

L'annulation SIGTERM et la vidange des checkpoints pendant une reconstruction active restent suivies dans [l'issue #662](https://github.com/neohaskell/NeoHaskell/issues/662). N'étendez pas indéfiniment le délai de grâce de terminaison pour attendre la relecture. Répétez l'interruption et le redémarrage en staging et utilisez le contrat de disponibilité pour contrôler le trafic.

Ensuite, découvrez [quoi observer](/fr/operate/observability/) et répétez [la récupération](/fr/operate/recovery/).
