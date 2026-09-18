---
title: Encuentra la capacidad que necesitas
description: Relaciona un requisito de aplicación con el concepto, la documentación y el límite de implementación adecuados.
sidebar:
  order: 0
---
<!-- translation-source-sha256: a2e9e49f2dcbc6c452fccd1c6453a08068495aac69104a55064b744148f2ea17 -->

No necesitas aprender todos los módulos antes de usar NeoHaskell. Empieza por la
tarea que tu programa debe realizar, encuentra el concepto pertinente y
profundiza cuando la tarea actual lo exija. Este mapa también ayuda a distinguir
los bloques de construcción del framework de las funcionalidades de aplicación
que un equipo debe implementar.

Continúa en la aplicación creada con `neo new`. En el proyecto guiado, el código
de Cart y Stock vive bajo `src/Shop/`. Los enlaces siguientes enseñan a usar cada
capacidad allí; los enlaces de implementación pública aportan evidencia de apoyo.

## Modela y expón el comportamiento de la aplicación

| Necesidad | Capacidad | Dónde continuar |
| --- | --- | --- |
| Decidir si se permite un cambio solicitado | Comandos y `Decider` | [Construir una aplicación](/es/build/) |
| Conservar hechos aceptados | Eventos y almacenes de eventos | [Persistencia](/es/operate/persistence/) |
| Reconstruir el estado actual de una entidad | Entidades e interfaces de caché de instantáneas | [Construir una aplicación](/es/build/) |
| Preparar vistas para lectores distintos | Consultas, almacenes de objetos de consulta y paginación | [Construir una aplicación](/es/build/) |
| Servir comandos y consultas | Transporte HTTP, JSON, esquema/OpenAPI | [Construir una aplicación](/es/build/) |
| Cablear la aplicación | `Application` y definiciones de servicios | [Comenzando](/es/getting-started/) |
| Restringir acciones y lecturas | Autenticación, políticas de comandos y controles de acceso de consultas | [Seguridad](/es/operate/security/) |

Los comandos, eventos y consultas tienen marcadores de derivación que generan el
cableado del framework. Las entidades proporcionan explícitamente su estado
inicial y su comportamiento de actualización. Aprende primero el papel conceptual
antes de explorar cómo funciona esa generación.

## Conecta una aplicación con otros sistemas

| Necesidad | Capacidad | Frontera |
| --- | --- | --- |
| Reaccionar a un hecho aceptado | Runtime de integración saliente | Define el seguimiento de negocio y el resultado del fallo |
| Recibir activadores externos o trabajo programado | Integraciones entrantes | Traduce la entrada a un comando explícito |
| Llamar a un proveedor | Cliente HTTP y tipos de solicitud/respuesta de integración | Los contratos específicos del proveedor aún requieren implementación y tests |
| Conectar la cuenta de proveedor de un usuario | Consentimiento OAuth2, callbacks y almacenamiento de secretos | [Cuentas de proveedores](/es/connect/provider-accounts/) |
| Enviar correo electrónico | Integraciones de Brevo y Azure Communication Services | Requiere configuración del proveedor y verificación de entrega |
| Añadir funcionalidades de modelos de lenguaje | Integraciones de OpenRouter, AzureAI y agentes/herramientas | Define las acciones permitidas y cómo se comprueban los resultados |
| Procesar documentos | Cargas de archivos, PDF, OCR e integraciones de proveedores relacionadas | Conserva los bytes, protege el acceso y gestiona fallos de extracción |
| Procesar audio | Integraciones de audio/transcripción | Trata la salida externa como una entrada falible |

Sigue [integraciones](/es/connect/) para estos temas. El proyecto de práctica de
comercio electrónico muestra cómo se combinan, pero las capacidades se aplican a
cualquier dominio. Un cliente HTTP genérico aún necesita un contrato de proveedor:
por ejemplo, no es un adaptador listo para pagos o envíos. Las reglas y flujos
específicos del dominio siguen siendo trabajo de la aplicación salvo que una
implementación concreta los proporcione.

## Usa el vocabulario del lenguaje cuando lo necesites

La biblioteca principal incluye `Text`, `Array`, `Map`, `Maybe`, `Result`, `Task`,
identificadores, fechas, logging y primitivas relacionadas. Los traits describen
operaciones reutilizables entre tipos. Los módulos de JSON/esquema conectan los
datos tipados con representaciones externas.

Los módulos de sistema proporcionan archivos, rutas, directorios, acceso al
entorno, tiempo y subprocesos. Los módulos de concurrencia proporcionan tareas,
canales, bloqueos y variables compartidas. Son mecanismos para una necesidad
concreta; introducir concurrencia no hace automáticamente atómica una operación
de negocio entre servicios.

Los módulos adyacentes al lenguaje incluyen aritmética decimal, análisis y
herramientas NeoQL. Su existencia no promete un modelo completo de dinero o
impuestos ni un lenguaje de informes de negocio sin restricciones. Elige la
operación, la representación y las pruebas de límites compatibles con el requisito
real de tu aplicación.

Consulta [fundamentos del lenguaje](/es/build/language-essentials/) y el [glosario](/es/reference/glossary/) cuando aparezca vocabulario desconocido.

## Construye, inspecciona, verifica y opera

| Necesidad | Capacidad | Documentación |
| --- | --- | --- |
| Crear y trabajar en un proyecto | CLI de Neo | [Referencia de la CLI](/es/reference/cli/) |
| Entender visualmente el modelo | IDE de Neo incluido | [IDE visual](/es/getting-started/visual-ide/) |
| Establecer evidencia de comportamiento | DSL de tests, escenarios de aplicación y tests de aceptación Hurl | [Testing](/es/build/testing/) |
| Conectar almacenes persistentes | Infraestructura de Postgres | [Persistencia](/es/operate/persistence/) |
| Ejecutar y cambiar la aplicación | Sondas, logging, reproducción y prácticas de compatibilidad | [Ejecutar y evolucionar](/es/operate/) |
| Mejorar el framework | Aplicación de referencia pública, herramientas del repositorio y decisiones arquitectónicas | [Contribuir](/es/operate/contributing/) |

Para detalles a nivel de código fuente, el [mapa de capacidades](https://github.com/neohaskell/NeoHaskell/blob/main/codemap/capabilities.yaml) del repositorio identifica la responsabilidad de implementación y los tests. Una capacidad listada te indica dónde investigar; un ejemplo concreto y un test establecen el comportamiento en el que puedes confiar.

Para recetas concretas, consulta las [guías prácticas](/es/guides/).
