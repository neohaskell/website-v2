---
title: "Palabras que encontrarás"
description: "Significados en lenguaje sencillo de los conceptos de NeoHaskell, con enlaces a ejemplos prácticos."
sidebar:
  order: 2
---
<!-- translation-source-sha256: ef2f1ca1d5d5325ef36283f7ec245a635a7d7bb7867216d08e4c4430d9a409bc -->

Usa esta página cuando un término se interponga entre tú y el comportamiento de
la aplicación que intentas comprender. Las definiciones se aplican a cualquier
dominio. Los ejemplos del proyecto recurrente de práctica de comercio electrónico
vuelven concretos algunos conceptos; los enlaces llevan a explicaciones más
profundas.

| Término | Significado y ejemplo | Más información |
| --- | --- | --- |
| Comando | Una solicitud como añadir dos tazas a un carrito; puede rechazarse | [Comandos y eventos](/es/build/commands-and-events/) |
| Evento | Un hecho aceptado como que se ha añadido un artículo | [Comandos y eventos](/es/build/commands-and-events/) |
| Entidad | Un objeto de negocio cuyo estado informa las decisiones, como un carrito concreto | [Entidades y estado](/es/build/entities-and-state/) |
| Stream de eventos | El historial ordenado que pertenece a una entidad | [Persistencia](/es/operate/persistence/) |
| Event sourcing | Conservar hechos aceptados y reconstruir el estado a partir de ellos | [Modelado de eventos](/es/start/event-modeling/) |
| Modelado de eventos | Describir cómo se conectan las solicitudes, los hechos, las vistas y las acciones externas | [Modelado de eventos](/es/start/event-modeling/) |
| Decider | La lógica que acepta o rechaza una solicitud usando el estado actual | [Comandos y eventos](/es/build/commands-and-events/) |
| Consulta / modelo de lectura / proyección | Información preparada para lectura, como el resumen de un carrito | [Consultas](/es/build/queries/) |
| CQRS | Separar las solicitudes que cambian el sistema de las lecturas de información preparada | [Consultas](/es/build/queries/) |
| Consistencia eventual | Una vista de lectura puede retrasarse brevemente respecto a un cambio aceptado | [Consultas](/es/build/queries/) |
| Reproducción | Volver a aplicar eventos almacenados para reconstruir el estado o las vistas | [Recuperación](/es/operate/recovery/) |
| Instantánea | Un estado almacenado en caché que reduce cuánto historial hay que volver a leer | [Rendimiento](/es/operate/performance/) |
| Integración | Una conexión explícita con otra parte de la aplicación o con un servicio externo | [Integraciones](/es/connect/) |
| Saliente | Trabajo activado por los eventos aceptados de la aplicación, como preparar un correo | [Ciclo de vida de las integraciones](/es/connect/) |
| Entrante | Un activador que envía trabajo a la aplicación, como un temporizador | [Temporizadores](/es/connect/timers/) |
| Idempotencia | Repetir una solicitud produce el mismo efecto de negocio previsto que ejecutarla una vez | [HTTP y pagos](/es/connect/http-and-payments/) |
| Identificador de correlación | Un valor que conecta una solicitud con respuestas posteriores de proveedores o hechos de negocio | [Flujos de trabajo](/es/connect/workflows/) |
| Concurrencia optimista | Detectar que el estado cambió mientras se tomaba una decisión y gestionar el conflicto | [Stock y checkout](/es/build/stock-and-checkout/) |
| Autenticación | Establecer quién hizo una solicitud | [Control de acceso](/es/build/access-control/) |
| Autorización | Decidir qué puede hacer o ver esa persona | [Control de acceso](/es/build/access-control/) |
| Esquema | Una descripción de la forma esperada de los datos | [HTTP y frontend](/es/build/http-and-frontend/) |
| Transporte | La forma en que las solicitudes y respuestas cruzan la frontera de la aplicación, como HTTP | [HTTP y frontend](/es/build/http-and-frontend/) |
| Liveness | Si el proceso HTTP en ejecución responde | [Despliegue](/es/operate/deployment/) |
| Readiness | Si las proyecciones de consulta registradas están al día para que esta revisión pueda servir tráfico | [Despliegue](/es/operate/deployment/) |
| Invariante de negocio | Una regla que debe seguir siendo cierta, como rechazar una cantidad negativa | [Testing](/es/build/testing/) |

## Tres distinciones que conviene conservar

**Una solicitud no es un hecho.** En el ejemplo de comercio electrónico, «Cobrar al
cliente» es una solicitud. Un pago confirmado es evidencia de algo que ocurrió. Un
tiempo de espera deja incertidumbre; no demuestra que no se haya realizado ningún
cargo.

**El estado no es una vista para cada lector.** El estado de una entidad sirve para
tomar decisiones. Distintos lectores pueden necesitar vistas y reglas de acceso
distintas. En el ejemplo de comercio electrónico, el resumen de un cliente y el
informe de un comerciante cumplen propósitos diferentes.

**Una comprobación correcta tiene un alcance.** La compilación, la validación del
modelo, los tests y las comprobaciones en el sandbox del proveedor responden a
preguntas distintas. El [capítulo sobre confianza](/es/start/trusting-your-agent/) explica cómo combinarlas al aceptar el trabajo de tu agente.
