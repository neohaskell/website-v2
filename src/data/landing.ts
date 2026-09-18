export const landingRouteLocales = ['en', 'es', 'fr', 'hy', 'ja', 'ru'] as const;
export const localizedLandingRouteLocales = ['es', 'fr', 'hy', 'ja', 'ru'] as const;

export type LandingLocale = (typeof landingRouteLocales)[number];
export type LocalizedLandingLocale = (typeof localizedLandingRouteLocales)[number];

type LandingLink = {
	href: string;
};

type LandingDecisionItem = {
	label: string;
	value: string;
};

export type LandingUi = {
	brandName: string;
	pageLanguage: string;
	skipLink: string;
	homeAriaLabel: string;
	primaryNavigationLabel: string;
	navigation: {
		docs: string;
		build: string;
		fitAndTradeoffs: string;
		github: string;
	};
	languageSelector: {
		label: string;
		menuLabel: string;
		options: Readonly<Record<LandingLocale, string>>;
	};
	cta: {
		headerCreateProject: string;
		heroPrimary: string;
		heroSecondary: string;
		auditability: string;
		communication: string;
		design: string;
		safeChange: string;
		closingPrimary: string;
		closingSecondary: string;
	};
	image: {
		alt: string;
		viewLarger: string;
		caption: string;
		fullResolution: string;
		fullResolutionAriaLabel: string;
	};
	proof: {
		caption: string;
		accountOpened: string;
		accountOpenedAmount?: string;
		cashWithdrawn: string;
		cashWithdrawnAmount?: string;
		currentBalance: string;
		currentBalanceAmount?: string;
		currentStateDescription: string;
	};
	sharedModelTermsLabel: string;
	sharedModelTerms: readonly string[];
	decisionItems: readonly LandingDecisionItem[];
	checkListLabel: string;
	checkList: readonly string[];
	dialog: {
		title: string;
		description: string;
		close: string;
		closeAriaLabel: string;
	};
	footerNavigationLabel: string;
	footer: {
		docs: string;
		build: string;
		fitAndTradeoffs: string;
		contribute: string;
		github: string;
		discord: string;
	};
};

export type LandingContent = {
	headline: readonly [string, string];
	intro: string;
	primaryCta: LandingLink;
	secondaryCta: LandingLink;
	auditability: {
		title: string;
		body: string;
		cta: LandingLink;
	};
	communication: {
		title: string;
		body: string;
		cta: LandingLink;
	};
	design: {
		title: string;
		body: string;
		cta: LandingLink;
	};
	safeChange: {
		title: string;
		body: string;
		cta: LandingLink;
	};
	closing: {
		title: string;
		body: string;
		primaryCta: LandingLink;
		secondaryCta: LandingLink;
	};
	ui: LandingUi;
};

type LandingLocaleModule = {
	default?: LandingContent;
	landingContent?: LandingContent;
};

const landingLocaleModules = import.meta.glob<LandingLocaleModule>('./landing-locales/*.ts', {
	eager: true,
});

export const landingContent = {
	headline: ['Know what your software does.', 'Explain why it did it.'],
	intro:
		'Build around explicit decisions, meaningful history, and a model people can discuss. NeoHaskell helps you keep the rules visible as your application changes.',
	primaryCta: {
		href: '/docs/',
	},
	secondaryCta: {
		href: '/start/a-shop-on-paper/',
	},
	auditability: {
		title: 'See the facts behind the current state.',
		body:
			'A balance, booking status, or approval state is a summary. NeoHaskell’s application framework uses event sourcing: accepted domain events form the history from which state is reconstructed, and an explicit correction can add a new fact instead of silently rewriting the past. History explains only what the application chose to record; reasons, authority, and evidence remain design decisions.',
		cta: {
			href: '/start/history-and-change/',
		},
	},
	communication: {
		title: 'Give the team one model to discuss.',
		body:
			'People who understand the work can discuss requests, decisions, accepted facts, and useful views before implementation is buried in code. NeoHaskell gives those ideas corresponding structures, while the Neo IDE graph connects them to source. The graph is for inspection: synchronization currently runs from code into the model, and a drawing does not generate a complete application.',
		cta: {
			href: '/getting-started/visual-ide/',
		},
	},
	design: {
		title: 'Make the important decisions visible before code.',
		body:
			'For each behaviour, name what starts it, the rule that accepts or refuses it, the fact worth retaining, and the information someone needs next. Event Modeling gives domain experts and builders a concrete structure for that conversation, and NeoHaskell gives those ideas corresponding structures in the program. The model exposes questions; it does not choose the policy.',
		cta: {
			href: '/start/a-shop-on-paper/',
		},
	},
	safeChange: {
		title: 'Make the next change small enough to check.',
		body:
			'A slice follows one useful behaviour from request through decision, accepted event, and view. Check ordinary success, refusal, and boundary cases before you accept the change; stable contracts can make growth easier to review, while shared events and older history still require deliberate coordination. An AI coding agent can write much of the implementation, but it cannot decide whether the rule is right; the compiler and tests provide evidence for the cases they actually check.',
		cta: {
			href: '/build/first-cart/',
		},
	},
	closing: {
		title: 'Start with one rule you can explain.',
		body:
			'NeoHaskell brings a language, application framework, Neo CLI, and visual IDE together around this workflow. Read the ideas, try the no-install modeling exercise, or create a project and inspect its first slice.',
		primaryCta: {
			href: '/start/fit-and-tradeoffs/',
		},
		secondaryCta: {
			href: '/getting-started/',
		},
	},
	ui: {
		brandName: 'NeoHaskell',
		pageLanguage: 'en',
		skipLink: 'Skip to content',
		homeAriaLabel: 'NeoHaskell home',
		primaryNavigationLabel: 'Primary navigation',
		navigation: {
			docs: 'Docs',
			build: 'Build',
			fitAndTradeoffs: 'Fit & tradeoffs',
			github: 'GitHub',
		},
		languageSelector: {
			label: 'Language',
			menuLabel: 'Choose a language',
			options: {
				en: 'English',
				es: 'Español',
				fr: 'Français',
				hy: 'Հայերեն',
				ja: '日本語',
				ru: 'Русский',
			},
		},
		cta: {
			headerCreateProject: 'Create a project',
			heroPrimary: 'Start with the docs',
			heroSecondary: 'Try it without installing',
			auditability: 'Read about history and change',
			communication: 'Explore the visual IDE',
			design: 'Model a small slice',
			safeChange: 'Build your first working slice',
			closingPrimary: 'Assess fit and tradeoffs',
			closingSecondary: 'Create a project',
		},
		image: {
			alt: 'Neo IDE graph showing a first cart feature with a CreateCart request, CartCreated recorded fact, and CartSummary view connected on a canvas.',
			viewLarger: 'View larger',
			caption: 'A real Neo IDE view of a first cart feature: request, recorded fact, and summary.',
			fullResolution: 'Open full-resolution image',
			fullResolutionAriaLabel: 'Open the full-resolution Neo IDE screenshot in a new tab',
		},
		proof: {
			caption: 'Illustrative retained history',
			accountOpened: 'Account opened',
			accountOpenedAmount: '+€100',
			cashWithdrawn: 'Cash withdrawn',
			cashWithdrawnAmount: '-€30',
			currentBalance: 'Current balance',
			currentBalanceAmount: '€70',
			currentStateDescription: 'Current state is derived from recorded facts.',
		},
		sharedModelTermsLabel: 'Shared model terms',
		sharedModelTerms: ['Request', 'Decision', 'Accepted fact', 'Useful view'],
		decisionItems: [
			{ label: 'Starts it', value: 'Request' },
			{ label: 'Accepts or refuses', value: 'Rule' },
			{ label: 'Worth retaining', value: 'Fact' },
			{ label: 'Needed next', value: 'Information' },
		],
		checkListLabel: 'Cases to check before accepting a change',
		checkList: ['Ordinary success', 'Refusal', 'Boundary cases'],
		dialog: {
			title: 'Neo IDE overview',
			description: 'Commands, Events, and Queries stay visible as one model while the application grows.',
			close: 'Close',
			closeAriaLabel: 'Close enlarged Neo IDE image',
		},
		footerNavigationLabel: 'Footer navigation',
		footer: {
			docs: 'Docs',
			build: 'Build',
			fitAndTradeoffs: 'Fit & tradeoffs',
			contribute: 'Contribute',
			github: 'GitHub',
			discord: 'Discord',
		},
	},
} as const satisfies LandingContent;

export function getLandingContent(locale: LocalizedLandingLocale): LandingContent {
	const localeModule = Object.entries(landingLocaleModules).find(([path]) =>
		path.endsWith(`/landing-locales/${locale}.ts`),
	)?.[1];

	return localeModule?.landingContent ?? localeModule?.default ?? landingContent;
}
