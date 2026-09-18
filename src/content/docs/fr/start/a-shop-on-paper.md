---
title: "Essayer la modélisation sans code"
description: "Utilisez un petit exercice de commerce en ligne pour décrire une règle et repérer un malentendu de votre agent."
sidebar:
  order: 5
---
<!-- translation-source-sha256: ca3ed61c3312e85dfc0ec77ff6f400910bf9cfb5bfe3657b359063f2bf81232b -->

Commencez une application d'exercice avec un seul produit : une tasse. Un client demande deux tasses. Le commerçant reçoit la demande et décide comment y répondre. Il n'y a pas encore de fournisseur de paiement, de réservation de stock ni d'intégration d'expédition. Le commerce en ligne offre un exemple familier ; la compétence que vous exercez consiste à transformer une règle en comportement vérifiable dans n'importe quelle application.

Pour ce premier croquis, choisissez une règle simple : **une demande peut contenir entre une et cinq tasses**. Il s'agit d'une politique fictive pour l'exercice, pas d'une règle intégrée à NeoHaskell.

## Dessiner trois moments

| Avant la demande | Ce que demande le client | Ce que nous savons ensuite |
| --- | --- | --- |
| Aucune commande n'existe | Passer une commande de deux tasses | Une commande de deux tasses a été passée |

La demande peut être refusée. Le fait enregistré décrit quelque chose d'accepté. C'est pourquoi « Passer une commande » et « Commande passée » ont des rôles différents, même si les mots se ressemblent.

La liste de commandes d'un commerçant répond ensuite à une autre question : « Que dois-je préparer ? » Cette liste est une vue des faits acceptés. Elle ne doit pas transformer une demande refusée en nouvelle commande.

## Travailler avec votre agent

> **Jess :** Les clients peuvent commander une à cinq tasses. Montre-moi la règle et les exemples avant de l'implémenter.
>
> **Agent :** J'accepterai toute quantité positive. Deux tasses réussissent ; zéro échoue.
>
> **Jess :** Le maximum manque. Que se passe-t-il pour cinq tasses et six tasses ?
>
> **Agent :** Cinq doit réussir. Six doit être refusé, et aucune commande ne doit être enregistrée.

Jess n'a pas eu besoin de relire une fonction pour repérer le malentendu. Elle comprenait la règle métier et a demandé des preuves à sa limite. Plus tard, un test rendra cette même vérification répétable.

## Décider ce qui compte comme réussite

| Demande | Résultat attendu |
| --- | --- |
| Deux tasses | Une commande acceptée contenant deux tasses |
| Zéro tasse | Un refus, sans nouvelle commande |
| Cinq tasses | Une commande acceptée à la limite maximale |
| Six tasses | Un refus, sans nouvelle commande |

Demandez aussi ce que voit le client après un refus. Une explication utile l'aide à corriger la demande. Un échec silencieux le laisse deviner si une commande existe.

## Votre première variation

Modifiez la règle de l'exercice pour accepter jusqu'à douze tasses. Dites à votre agent ce qui change et ce qui doit rester vrai. Choisissez les exemples que vous inspecteriez avant d'accepter son travail.

<details>
<summary>Raisonnement suggéré</summary>

Douze doit réussir et treize doit échouer. Zéro doit toujours échouer. Deux doit toujours réussir. Les commandes déjà acceptées doivent conserver leurs quantités d'origine ; une nouvelle politique ne doit pas réécrire ce que les clients ont déjà commandé.

</details>

Vous avez déjà exercé la modélisation, les tests aux limites et la correction d'un agent. Essayez de nommer une limite dans votre propre application : qui la fixe, quelles demandes affecte-t-elle et comment montreriez-vous que la limite est respectée ?
Ensuite, [donnez un nom à ces idées](/fr/start/event-modeling/). Lorsque vous commencerez à coder, l'[exemple de panier public](/fr/build/first-cart/) fournit des briques exécutables ; la politique de commande ci-dessus reste un exercice de conception explicite.
