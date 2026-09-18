// translation-source-sha256: ac4a094b3f5dff03bfc42c2e2799fabe3cd0dccb5ebcfa882f071f85114fddd6
import type { LandingContent } from '../landing';

export const landingContent = {
	headline: ['Entiende qué hace tu software.', 'Explica por qué lo hizo.'],
	intro:
		'Construye en torno a decisiones explícitas, un historial significativo y un modelo que las personas puedan discutir. NeoHaskell te ayuda a mantener las reglas visibles mientras cambia tu aplicación.',
	primaryCta: {
		href: '/docs/',
	},
	secondaryCta: {
		href: '/start/a-shop-on-paper/',
	},
	auditability: {
		title: 'Ve los hechos detrás del estado actual.',
		body:
			'Un saldo, el estado de una reserva o el estado de una aprobación son resúmenes. El framework de aplicaciones de NeoHaskell utiliza event sourcing: los eventos de dominio aceptados forman el historial a partir del cual se reconstruye el estado, y una corrección explícita puede añadir un hecho nuevo en lugar de reescribir el pasado silenciosamente. El historial solo explica lo que la aplicación decidió registrar; las razones, la autoridad y la evidencia siguen siendo decisiones de diseño.',
		cta: {
			href: '/start/history-and-change/',
		},
	},
	communication: {
		title: 'Dale al equipo un único modelo para discutir.',
		body:
			'Las personas que comprenden el trabajo pueden discutir solicitudes, decisiones, hechos aceptados y vistas útiles antes de que la implementación quede enterrada en el código. NeoHaskell proporciona estructuras correspondientes para esas ideas, mientras el grafo del Neo IDE las conecta con el código fuente. El grafo sirve para inspección: por ahora, la sincronización va del código al modelo, y un dibujo no genera una aplicación completa.',
		cta: {
			href: '/getting-started/visual-ide/',
		},
	},
	design: {
		title: 'Haz visibles las decisiones importantes antes del código.',
		body:
			'Para cada comportamiento, nombra qué lo inicia, la regla que lo acepta o lo rechaza, el hecho que merece conservarse y la información que alguien necesitará después. El modelado de eventos ofrece a los expertos del dominio y a los desarrolladores una estructura concreta para esa conversación, y NeoHaskell proporciona estructuras correspondientes para esas ideas en el programa. El modelo plantea preguntas; no elige la política.',
		cta: {
			href: '/start/a-shop-on-paper/',
		},
	},
	safeChange: {
		title: 'Haz que el próximo cambio sea lo bastante pequeño para comprobarlo.',
		body:
			'Una slice sigue un comportamiento útil desde la solicitud, pasando por la decisión, el evento aceptado y la vista. Comprueba los casos habituales de éxito, los rechazos y los casos límite antes de aceptar el cambio; los contratos estables pueden facilitar la revisión a medida que crece el sistema, mientras que los eventos compartidos y el historial anterior siguen requiriendo una coordinación deliberada. Un agente de programación con IA puede escribir gran parte de la implementación, pero no puede decidir si la regla es correcta; el compilador y las pruebas aportan evidencia sobre los casos que realmente comprueban.',
		cta: {
			href: '/build/first-cart/',
		},
	},
	closing: {
		title: 'Empieza con una regla que puedas explicar.',
		body:
			'NeoHaskell reúne un lenguaje, un framework de aplicaciones, Neo CLI y un IDE visual en torno a este flujo de trabajo. Lee las ideas, prueba el ejercicio de modelado sin instalar nada o crea un proyecto e inspecciona su primera slice.',
		primaryCta: {
			href: '/start/fit-and-tradeoffs/',
		},
		secondaryCta: {
			href: '/getting-started/',
		},
	},
	ui: {
		brandName: 'NeoHaskell',
		pageLanguage: 'es',
		skipLink: 'Saltar al contenido',
		homeAriaLabel: 'Página de inicio de NeoHaskell',
		primaryNavigationLabel: 'Navegación principal',
		navigation: {
			docs: 'Documentación',
			build: 'Construir',
			fitAndTradeoffs: 'Encaje y compromisos',
			github: 'GitHub',
		},
		languageSelector: {
			label: 'Idioma',
			menuLabel: 'Elegir un idioma',
			options: {
				en: 'Inglés',
				es: 'Español',
				fr: 'Francés',
				hy: 'Armenio',
				ja: 'Japonés',
				ru: 'Ruso',
			},
		},
		cta: {
			headerCreateProject: 'Crea un proyecto',
			heroPrimary: 'Empieza con la documentación',
			heroSecondary: 'Pruébalo sin instalar nada',
			auditability: 'Lee sobre el historial y los cambios',
			communication: 'Explora el IDE visual',
			design: 'Modela una pequeña slice',
			safeChange: 'Construye tu primera slice funcional',
			closingPrimary: 'Evalúa el encaje y los compromisos',
			closingSecondary: 'Crea un proyecto',
		},
		image: {
			alt: 'Grafo del Neo IDE que muestra una primera funcionalidad de carrito con una solicitud CreateCart, un hecho registrado CartCreated y una vista CartSummary conectados en un lienzo.',
			viewLarger: 'Ver más grande',
			caption: 'Una vista real del Neo IDE de una primera funcionalidad de carrito: solicitud, hecho registrado y resumen.',
			fullResolution: 'Abrir la imagen en resolución completa',
			fullResolutionAriaLabel: 'Abrir la captura del Neo IDE en resolución completa en una pestaña nueva',
		},
		proof: {
			caption: 'Historial conservado de ejemplo',
			accountOpened: 'Cuenta abierta',
			cashWithdrawn: 'Efectivo retirado',
			currentBalance: 'Saldo actual',
			currentStateDescription: 'El estado actual se deriva de los hechos registrados.',
		},
		sharedModelTermsLabel: 'Términos del modelo compartido',
		sharedModelTerms: ['Request', 'Decision', 'Accepted fact', 'Useful view'],
		decisionItems: [
			{ label: 'Lo inicia', value: 'Request' },
			{ label: 'Acepta o rechaza', value: 'Regla' },
			{ label: 'Merece conservarse', value: 'Hecho' },
			{ label: 'Necesaria después', value: 'Información' },
		],
		checkListLabel: 'Casos que comprobar antes de aceptar un cambio',
		checkList: ['Éxito habitual', 'Rechazo', 'Casos límite'],
		dialog: {
			title: 'Vista general del Neo IDE',
			description: 'Los comandos, eventos y consultas permanecen visibles como un único modelo mientras crece la aplicación.',
			close: 'Cerrar',
			closeAriaLabel: 'Cerrar la imagen ampliada del Neo IDE',
		},
		footerNavigationLabel: 'Navegación del pie de página',
		footer: {
			docs: 'Documentación',
			build: 'Construir',
			fitAndTradeoffs: 'Encaje y compromisos',
			contribute: 'Contribuir',
			github: 'GitHub',
			discord: 'Discord',
		},
	},
} as const satisfies LandingContent;
