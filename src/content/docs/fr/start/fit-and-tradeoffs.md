---
title: "NeoHaskell convient-il à votre équipe ?"
description: "Évaluez la valeur d'adoption, les coûts et les responsabilités à travers un workflow représentatif."
sidebar:
  order: 4
---
<!-- translation-source-sha256: 5bb75ac6c014d9c9413cab28122fc00902e59e0da2b45add4f355c2ae567cb30 -->

Un framework mérite sa place en aidant votre équipe à traiter le travail qui compte. Pour certaines applications, cela signifie expliquer comment une décision a été prise. Pour d'autres, cela signifie modifier les règles sans perdre le sens des enregistrements existants ou coordonner des actions avec des services qui peuvent échouer indépendamment.

NeoHaskell mérite d'être évalué lorsque ces préoccupations structurent votre application. Son approche relie les demandes métier, les décisions explicites, les faits acceptés et les vues utilisées par les personnes. Elle offre ainsi aux humains et aux agents de codage une structure commune pour construire et discuter des comportements. La question de l'adoption est de savoir si cette structure résout assez de vos problèmes pour justifier son apprentissage et son exploitation.

Commencez par un workflow représentatif et décidez quelles preuves vous rendraient suffisamment confiant pour continuer.

## Rechercher la valeur depuis plusieurs perspectives

**Pour la personne qui construit l'application**, des commandes, événements et requêtes nommés fournissent des emplacements pour répartir les responsabilités. Vous pouvez demander à un agent d'implémenter un comportement délimité, examiner ses décisions et tester ses résultats. C'est utile lorsque vous comprenez mieux le processus que chaque ligne de code. Vous devez néanmoins comprendre suffisamment le domaine pour reconnaître une règle fausse et demander des preuves pertinentes.

**Pour les spécialistes du produit et du domaine**, un modèle d'événements facilite la discussion des étapes manquantes avant que l'implémentation ne les fixe accidentellement. « Une demande a été acceptée » et « le travail est terminé » peuvent apparaître comme des faits différents. Vous pouvez demander ce qui se passe entre les deux, qui a l'autorité et ce que quelqu'un voit lorsque le progrès s'arrête. Le modèle devient un support de conversation, plutôt qu'une spécification que seul son auteur peut interpréter.

**Pour une personne chargée de l'évaluation**, des limites explicites offrent quelque chose de concret à inspecter. Choisissez une règle, suivez-la dans son implémentation et ses tests, puis demandez une modification. Évaluez si l'équipe peut en expliquer les conséquences et maintenir le résultat. L'adaptabilité est un résultat à démontrer dans votre contexte, pas une promesse de productivité à accepter sans preuve.

**Pour les opérateurs**, séparer l'historique accepté des vues construites à partir de celui-ci aide à formuler les questions de récupération. Qu'est-ce qui a été accepté de manière durable ? Quelles vues sont encore en rattrapage ? Que s'est-il passé en dehors de cette application ? Ces distinctions peuvent aider au diagnostic, mais l'exploitation du système exige toujours un stockage, des sauvegardes, une surveillance et des procédures de récupération répétées.

## Adapter l'approche au domaine

Le modèle applicatif basé sur les événements de NeoHaskell mérite une attention particulière lorsque les choses ont des cycles de vie significatifs :

- Une adhésion est demandée, approuvée, renouvelée, suspendue ou terminée.
- Une réservation est demandée, confirmée, modifiée ou annulée.
- Une demande de subvention est soumise, évaluée, approuvée et suivie.
- Une commande est préparée, acceptée, exécutée ou corrigée.

Dans chaque cas, le dernier état ne répond qu'à une partie de la question. Les personnes peuvent aussi avoir besoin de savoir ce qui s'est passé auparavant ou de construire plusieurs vues d'une même activité. Un historique explicite peut répondre à ces besoins lorsque vous modélisez les faits pertinents.

Un site de contenu statique, un script jetable ou un petit outil de recherche peut tirer peu de bénéfices de cette structure. Un produit spécialisé peut avoir davantage besoin de packages métier matures que d'une nouvelle façon de modéliser les changements. Une personne qui cherche une plateforme de commerce prête à l'emploi doit par exemple évaluer le travail nécessaire pour fournir les paiements, l'expédition, la fiscalité et les autres comportements requis. Le projet d'exercice de commerce en ligne enseigne les concepts du framework ; il ne fournit pas un produit commercial complet.

Utilisez le [guide des capacités](/fr/reference/capabilities/) pour distinguer les briques disponibles du travail propre à l'application. Évaluez directement chaque fournisseur requis et chaque environnement de déploiement.

## Considérer l'historique comme un engagement de conception

Préserver les faits acceptés permet de distinguer une action antérieure d'une correction ultérieure. Cela peut aider à expliquer les litiges, reconstruire l'état et créer de nouvelles vues. Cela engage aussi les futures versions de l'application à comprendre l'historique conservé.

Un compilateur peut détecter des modifications incompatibles dans le code. Les données historiques ont besoin de leurs propres vérifications de compatibilité. Un champ renommé, une interprétation modifiée d'un montant ou une nouvelle exigence pour les anciens enregistrements peut nécessiter une migration ou des règles d'interprétation délibérées. Incluez ce travail dans le coût d'une modification.

L'historique ne contient aussi que ce que vous avez choisi d'enregistrer. Le fait qu'une demande a été refusée n'explique pas la raison si vous ne la conservez pas. Enregistrer une raison n'établit pas qu'elle était juste ou exacte. Distinguez une observation, le jugement d'une personne et une recommandation automatisée lorsque cette distinction comptera pour une vérification ultérieure.

## Décider qui peut agir, questionner et corriger

Les décisions explicites rendent visibles les questions de gouvernance. Qui peut modifier une règle ? Qui peut demander une exception ? Quelles actions un système automatisé peut-il effectuer, et lesquelles nécessitent l'approbation d'une personne ? Comment quelqu'un peut-il contester un résultat ?

Répondez à ces questions comme à des décisions applicatives. Les contrôles de permission, les preuves justificatives, les étapes de révision et les commandes de correction doivent être conçus et testés. L'historique des événements ne conserve pas automatiquement la personne responsable, la version de la règle ou les preuves examinées.

Choisissez avec le même soin ce qu'il faut conserver. Copier des demandes entières dans l'historique peut préserver des informations personnelles inutiles. Décidez quel contexte est nécessaire, où placer les détails sensibles, qui peut les lire et comment les exigences de conservation et de suppression influencent la conception. Ces décisions doivent être prises au début d'un pilote, tant que la modification du modèle reste gérable.

## Prévoir les coûts d'apprentissage et d'exploitation

Votre équipe apprendra un langage, une chaîne d'outils et une façon de modéliser le comportement applicatif. Essayez la [configuration prise en charge](/fr/getting-started/) sur les machines utilisées par l'équipe et prévoyez du temps pour comprendre le premier build et ses messages d'erreur. Évaluez si quelqu'un d'autre que l'auteur initial pourra maintenir le résultat.

Les requêtes se mettent à jour séparément des commandes acceptées ; un écran peut donc afficher brièvement une vue plus ancienne. Les actions externes introduisent des échecs partiels et des réessais. Une exploitation durable nécessite des choix de base de données et de déploiement, une gestion des secrets et des tests de restauration. Ce sont des responsabilités concrètes à explorer dans [l'exploitation d'une application](/fr/operate/), plutôt que des détails à repousser jusqu'au lancement.

Tenez également compte de l'écosystème dont vous dépendez : couverture des intégrations, travail de mise à niveau, ressources de dépannage et personnes capables d'aider lorsqu'un problème traverse les limites du framework et de l'application. Utilisez le pilote pour estimer ces responsabilités.

## Mener un pilote qui peut vous faire changer d'avis

Choisissez un workflow avec une vraie règle, un refus possible et un résultat visible. Pour un outil de réservation, réservez une place uniquement tant que la capacité le permet. Pour le projet d'exercice, ajoutez une quantité positive à un panier existant. Écrivez les résultats attendus en cas de réussite, de rejet et de limite avant l'implémentation.

Recueillez ensuite des preuves qui répondent à vos questions d'adoption :

1. Demandez à une autre personne d'expliquer le comportement à partir du modèle et d'en trouver les vérifications.
2. Introduisez volontairement une règle fausse et vérifiez si les contrôles la détectent.
3. Demandez une petite variation et examinez quels contrats et quels tests doivent changer.
4. Lisez un historique représentatif plus ancien avec l'application modifiée.
5. Si la durabilité compte, redémarrez et répétez une restauration avec les stockages choisis.
6. Si les intégrations comptent, provoquez l'échec d'un fournisseur et expliquez l'état obtenu.

Notez les incompréhensions et les capacités manquantes avec autant de soin que les réussites. Comparez le résultat avec une alternative familière sur le même workflow et avec les mêmes attentes. Vous pourrez continuer, réduire l'usage prévu ou décider qu'une autre approche convient mieux.

Une décision utile nomme les preuves, les responsabilités non résolues et la prochaine expérience. Poursuivez avec [le projet d'exercice sur papier](/fr/start/a-shop-on-paper/) lorsque vous serez prêt à essayer l'approche.
