// translation-source-sha256: ac4a094b3f5dff03bfc42c2e2799fabe3cd0dccb5ebcfa882f071f85114fddd6
import type { LandingContent } from '../landing';

export const landingContent = {
	headline: ['Comprenez ce que fait votre logiciel.', 'Expliquez pourquoi il l’a fait.'],
	intro:
		'Construisez autour de décisions explicites, d’un historique porteur de sens et d’un modèle dont l’équipe peut discuter. NeoHaskell vous aide à garder les règles visibles à mesure que votre application évolue.',
	primaryCta: {
		href: '/docs/',
	},
	secondaryCta: {
		href: '/start/a-shop-on-paper/',
	},
	auditability: {
		title: 'Voyez les faits à l’origine de l’état actuel.',
		body:
			'Un solde, un état de réservation ou un statut d’approbation sont des synthèses. Le framework applicatif de NeoHaskell utilise l’event sourcing : les événements de domaine acceptés constituent l’historique à partir duquel l’état est reconstitué, et une correction explicite peut ajouter un nouveau fait au lieu de réécrire silencieusement le passé. L’historique n’explique que ce que l’application a choisi d’enregistrer ; les raisons, l’autorité et les éléments probants restent des décisions de conception.',
		cta: {
			href: '/start/history-and-change/',
		},
	},
	communication: {
		title: 'Donnez à l’équipe un modèle unique à discuter.',
		body:
			'Les personnes qui connaissent le métier peuvent discuter des requêtes, des décisions, des faits acceptés et des vues utiles avant que l’implémentation ne soit enfouie dans le code. NeoHaskell associe des structures correspondantes à ces idées, tandis que le graphe de Neo IDE les relie au code source. Le graphe sert à l’inspection : la synchronisation va actuellement du code vers le modèle, et un dessin ne génère pas une application complète.',
		cta: {
			href: '/getting-started/visual-ide/',
		},
	},
	design: {
		title: 'Rendez visibles les décisions importantes avant le code.',
		body:
			'Pour chaque comportement, nommez ce qui le déclenche, la règle qui l’accepte ou le refuse, le fait qu’il vaut la peine de conserver et l’information dont quelqu’un aura besoin ensuite. Event Modeling fournit aux experts du domaine et aux équipes de réalisation une structure concrète pour cette conversation, et NeoHaskell associe des structures correspondantes à ces idées dans le programme. Le modèle met les questions en évidence ; il ne choisit pas la politique.',
		cta: {
			href: '/start/a-shop-on-paper/',
		},
	},
	safeChange: {
		title: 'Rendez la prochaine modification assez petite pour être vérifiée.',
		body:
			'Une slice suit un comportement utile, de la requête à la vue en passant par la décision et l’événement accepté. Vérifiez les cas de réussite ordinaires, les refus et les cas limites avant d’accepter la modification ; des contrats stables peuvent faciliter la revue à mesure que le système grandit, tandis que les événements partagés et l’historique existant exigent toujours une coordination réfléchie. Un agent de programmation doté d’IA peut écrire une grande partie de l’implémentation, mais il ne peut pas décider si la règle est correcte ; le compilateur et les tests apportent des éléments probants pour les cas qu’ils vérifient réellement.',
		cta: {
			href: '/build/first-cart/',
		},
	},
	closing: {
		title: 'Commencez par une règle que vous pouvez expliquer.',
		body:
			'NeoHaskell réunit un langage, un framework applicatif, Neo CLI et un IDE visuel autour de ce flux de travail. Découvrez les concepts, essayez l’exercice de modélisation sans installation, ou créez un projet et inspectez sa première slice.',
		primaryCta: {
			href: '/start/fit-and-tradeoffs/',
		},
		secondaryCta: {
			href: '/getting-started/',
		},
	},
	ui: {
		brandName: 'NeoHaskell',
		pageLanguage: 'fr',
		skipLink: 'Aller au contenu',
		homeAriaLabel: 'Accueil de NeoHaskell',
		primaryNavigationLabel: 'Navigation principale',
		navigation: {
			docs: 'Documentation',
			build: 'Construire',
			fitAndTradeoffs: 'Adéquation et compromis',
			github: 'GitHub',
		},
		languageSelector: {
			label: 'Langue',
			menuLabel: 'Choisir une langue',
			options: {
				en: 'Anglais',
				es: 'Espagnol',
				fr: 'Français',
				hy: 'Arménien',
				ja: 'Japonais',
				ru: 'Russe',
			},
		},
		cta: {
			headerCreateProject: 'Créer un projet',
			heroPrimary: 'Commencer par la documentation',
			heroSecondary: 'Essayer sans installer',
			auditability: 'En savoir plus sur l’historique et les changements',
			communication: 'Explorer l’IDE visuel',
			design: 'Modéliser une petite slice',
			safeChange: 'Construire votre première slice fonctionnelle',
			closingPrimary: 'Évaluer l’adéquation et les compromis',
			closingSecondary: 'Créer un projet',
		},
		image: {
			alt: 'Graphe de Neo IDE montrant une première fonctionnalité de panier avec une requête CreateCart, le fait enregistré CartCreated et la vue CartSummary reliés sur un canevas.',
			viewLarger: 'Voir en plus grand',
			caption: 'Une vue réelle de Neo IDE présentant une première fonctionnalité de panier : requête, fait enregistré et résumé.',
			fullResolution: 'Ouvrir l’image en pleine résolution',
			fullResolutionAriaLabel: 'Ouvrir la capture d’écran de Neo IDE en pleine résolution dans un nouvel onglet',
		},
		proof: {
			caption: 'Historique conservé à titre illustratif',
			accountOpened: 'Compte ouvert',
			accountOpenedAmount: '+100 €',
			cashWithdrawn: 'Espèces retirées',
			cashWithdrawnAmount: '-30 €',
			currentBalance: 'Solde actuel',
			currentBalanceAmount: '70 €',
			currentStateDescription: 'L’état actuel est dérivé des faits enregistrés.',
		},
		sharedModelTermsLabel: 'Termes du modèle partagé',
		sharedModelTerms: ['Request', 'Decision', 'Accepted fact', 'Useful view'],
		decisionItems: [
			{ label: 'Le déclenche', value: 'Request' },
			{ label: 'Accepte ou refuse', value: 'Règle' },
			{ label: 'À conserver', value: 'Fait' },
			{ label: 'Nécessaire ensuite', value: 'Information' },
		],
		checkListLabel: 'Cas à vérifier avant d’accepter une modification',
		checkList: ['Réussite ordinaire', 'Refus', 'Cas limites'],
		dialog: {
			title: 'Présentation de Neo IDE',
			description: 'Les commandes, les événements et les requêtes restent visibles dans un même modèle à mesure que l’application grandit.',
			close: 'Fermer',
			closeAriaLabel: 'Fermer l’image agrandie de Neo IDE',
		},
		footerNavigationLabel: 'Navigation du pied de page',
		footer: {
			docs: 'Documentation',
			build: 'Construire',
			fitAndTradeoffs: 'Adéquation et compromis',
			contribute: 'Contribuer',
			github: 'GitHub',
			discord: 'Discord',
		},
	},
} as const satisfies LandingContent;
