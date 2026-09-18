---
title: "Apprendre à faire confiance à votre agent de codage"
description: "Construisez votre confiance avec un modèle partagé, des exemples explicites et des preuves que vous pouvez expliquer."
sidebar:
  order: 7
---
<!-- translation-source-sha256: 5571aa8d3085df7eb49fb3f55c7a98321867ff229b9e4b8ac90a3d721a4fe676 -->

Travailler avec un agent de codage devrait vous permettre de construire davantage que ce que vous pourriez implémenter confortablement seul. Vous apportez une idée, une compréhension des personnes qui l'utiliseront et votre jugement sur ce qui doit se passer. L'agent vous aide à transformer cette compréhension en logiciel fonctionnel.

Vous ne devriez pas avoir besoin de relire chaque ligne générée pour avancer. Vous avez besoin d'un moyen de reconnaître si le résultat signifie bien ce que vous vouliez. Le modèle partagé, les conventions, le compilateur et les tests de NeoHaskell vous offrent plusieurs façons de poser cette question. Chacun apporte des preuves ; ensemble, ils favorisent une délégation confiante.

La confiance grandit lorsque vous pouvez expliquer les engagements de l'application et la manière dont vous les avez vérifiés, puis confier avec assurance le prochain élément de travail.

## Garder la maîtrise du sens

Un agent peut combler les lacunes par des choix plausibles. C'est utile lorsqu'il faut choisir le nom d'un helper ; c'est lourd de conséquences lorsqu'il faut décider qui peut annuler une réservation ou si un paiement échoué libère un stock réservé.

Avant l'implémentation, décrivez le résultat voulu et donnez quelques exemples. Demandez à l'agent d'identifier les commandes, décisions, événements et vues concernés. Une courte explication révèle souvent un désaccord alors qu'il est encore peu coûteux de le corriger.

Pour une nouvelle règle, accordez-vous sur au moins trois cas : une demande ordinaire acceptée, une demande refusée et une valeur exactement à la limite. Lorsque vous modifiez une règle existante, demandez aussi ce qui doit arriver à l'historique déjà accepté. Ces exemples transforment « faire fonctionner » en un résultat que vous pouvez reconnaître.

## Détecter tôt un petit malentendu

Imaginez que l'application d'exercice de commerce en ligne reçoive une limite de trois unités par nouvelle demande. Une version précédente en acceptait cinq. Voici un désaccord utile à repérer avant toute modification par l'agent :

> **Jess :** Limite les nouvelles demandes à trois unités. Les anciennes demandes acceptées doivent toujours être comprises telles qu'elles se sont produites.
>
> **Agent :** Je limiterai les quantités à trois lors de la reconstruction du panier, afin que chaque panier respecte la limite.
>
> **Jess :** Cela changerait le sens de l'ancienne demande. Vérifie la limite au moment de décider d'une nouvelle demande. La reconstruction de l'ancien historique doit conserver les cinq unités que nous avons déjà acceptées.
>
> **Agent :** Je placerai la règle dans la décision de nouvelle demande et vérifierai à la fois les nouvelles demandes et la reconstruction de l'ancien événement accepté.

Le malentendu peut être corrigé parce que le modèle donne à Jess une question claire : ce code décide-t-il ce qui peut arriver ensuite, ou interprète-t-il ce qui s'est déjà passé ? Elle peut remettre cette distinction en question sans écrire elle-même l'implémentation.

La correction a besoin de preuves. Demandez des demandes de deux, trois et quatre unités, ainsi qu'un ancien événement accepté de cinq unités. Deux et trois doivent être acceptées selon cette politique proposée ; quatre doit être refusée ; les cinq unités historiques doivent rester cinq. Il s'agit d'exigences d'exercice, pas d'une limite de quantité intégrée à NeoHaskell.

## Rendre la boucle de retour visible

![Une personne définit l'intention et les exemples, un agent propose et implémente un modèle, les vérifications produisent des preuves et la personne examine le résultat avant la modification suivante.](/diagrams/trust-loop.svg)

*La confiance grandit grâce à une boucle répétable : expliquer, modéliser, implémenter, vérifier et examiner. Chaque passage donne un point de départ plus clair à la délégation suivante.*

Pour une fonctionnalité, une correction de bug ou une modification de politique :

1. Expliquez la situation et la règle en langage courant.
2. Demandez à l'agent de montrer sa compréhension et de nommer les choix non résolus.
3. Convenez d'exemples qui distinguent un résultat correct d'une erreur plausible.
4. Déléguez l'implémentation et les vérifications pertinentes.
5. Inspectez le résultat observable, y compris une variation que vous choisissez.
6. Demandez ce que couvrent les preuves et ce qui dépend encore d'une condition non testée.

Lorsqu'une vérification échoue, déterminez si le comportement ou l'attente est erroné. Modifier une attente peut être approprié lorsque vous changez délibérément une règle. Supprimer une vérification en échec sans résoudre le désaccord ne fait que supprimer une preuve.

## Savoir ce que chaque niveau établit

Les différentes vérifications répondent à des questions différentes :

| Preuve | Ce qu'elle aide à établir | Ce qu'elle ne peut pas décider à votre place |
| --- | --- | --- |
| Modèle partagé et graphe de l'IDE | Les concepts et les relations peuvent être inspectés | Si la politique choisie est la bonne |
| Compilation réussie | L'implémentation respecte les relations de types vérifiées par le compilateur | Si la règle correspond à votre intention |
| Tests réussis | Les exemples affirmés se comportent comme prévu dans l'environnement testé | Si des exemples importants manquent |
| Vérification avec un fournisseur externe | L'interaction testée fonctionne avec cette configuration | Comment se comporteront tous les échecs réels ou les demandes répétées |
| Vérifications et observation du déploiement | La révision déployée présente le comportement vérifié | Si chaque condition future fonctionnera |

Le compilateur peut rejeter des erreurs structurelles qu'il serait sinon facile de manquer. Il ne peut pas savoir si trois est la bonne limite, si l'annulation doit être autorisée ou si une règle traite les personnes équitablement. Ce sont des décisions de politique. Les tests peuvent exprimer vos réponses, mais des tests réussis ne couvrent que les cas qu'ils vérifient réellement.

Demandez les scénarios et les résultats, pas seulement que « tout est vert ». Pour une vue qui se met à jour de manière asynchrone, distinguez « la commande a été acceptée » de « la vue reflète maintenant l'événement ». Pour une intégration, distinguez « nous avons interrogé le fournisseur » de « le fournisseur a terminé le travail ». Le [chapitre sur les tests](/fr/build/testing/) développera ces mécanismes plus loin.

## Deux rôles différents pour l'IA

L'agent de codage à vos côtés modifie l'implémentation : il écrit le code source, exécute les vérifications et explique son travail. Vous examinez une modification proposée avant de vous fier à l'application qui en résulte.

L'IA intégrée à une application a un rôle différent. Elle peut suggérer une catégorie, résumer un document ou proposer une action. Lorsque vous la concevez pour agir au moyen de commandes, elle demande une modification du domaine que les règles de décision de l'application peuvent accepter ou refuser. Une réponse assurée du modèle n'est pas en soi un événement accepté.

Aucun de ces rôles ne supprime votre responsabilité de définir le comportement autorisé. Vous devez concevoir les actions disponibles, les règles d'accès et toute approbation humaine nécessaire. Un agent de codage peut implémenter ces limites ; l'IA exécutée doit fonctionner à l'intérieur des limites que vous avez réellement implémentées. Les chapitres suivants expliquent [l'assistance par IA](/fr/connect/ai/) et les [outils contraints](/fr/connect/ai-tools/).

## Faire grandir la confiance avec les preuves

Commencez par de petites modifications dont vous pouvez facilement inspecter les résultats. À mesure que vous apprenez le modèle et voyez l'agent traiter vos exemples de manière fiable, déléguez des tranches plus grandes. Accordez davantage d'attention aux endroits où une erreur aurait de plus grandes conséquences : actions externes irréversibles, changements d'accès ou modifications de l'interprétation d'un ancien historique.

La confiance peut être ciblée. Vous pouvez déléguer avec assurance une modification de requête familière tout en demandant une explication plus approfondie pour un nouveau workflow de paiement. Laissez les preuves guider le niveau de détail de votre examen.

Choisissez une règle dans votre propre application. Écrivez un exemple qui révélerait une implémentation plausible mais fausse, puis identifiez les preuves dont vous auriez besoin.

<details>
<summary>Une auto-vérification utile</summary>

Pouvez-vous énoncer le résultat attendu avant de voir l'implémentation ? Votre exemple exerce-t-il un refus, une limite ou un ancien historique ? L'agent peut-il vous montrer le résultat sans vous demander d'accepter son explication sur parole ? Si oui, vous disposez d'une base concrète pour déléguer.

</details>

Continuez avec [la configuration de votre premier projet](/fr/getting-started/). Vous utiliserez cette boucle avec de petits exemples fonctionnels avant de l'appliquer à des fonctionnalités plus complexes.
