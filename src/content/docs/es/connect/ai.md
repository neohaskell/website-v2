---
title: Añade asistencia de IA a la aplicación
description: Haz que las sugerencias generadas sean útiles, acotadas y revisables.
sidebar:
  order: 7
---
<!-- translation-source-sha256: f2d45b6e68597c4201ea1d07c613eabc1aa78f902690d3af8674a1d17ca58fae -->

Usar un agente para escribir código y añadir una funcionalidad de IA a ese código
son relaciones distintas. Una funcionalidad de aplicación puede resumir notas,
redactar texto o ayudar a interpretar un documento. Necesita sus propias entradas,
permisos, límites de gasto, estados de fallo y reglas de aceptación.

Una primera funcionalidad útil propone texto para revisión. En el proyecto de
práctica de comercio electrónico, Jess generará un borrador de descripción de
producto a partir de hechos proporcionados. Puede inspeccionar y aprobar el
borrador mientras el resto de la aplicación sigue siendo utilizable si el proveedor
no está disponible.

## Mantén la funcionalidad dentro de tu aplicación

Trabaja desde `mug-shop` y completa la [configuración de integraciones](/es/connect/#prepare-your-project). Coloca el helper de solicitudes en `src/Shop/Integrations/ProductDraft.hs`. Añade los comandos y eventos para solicitar, registrar y aceptar un borrador en el área de la aplicación que sea dueña de la información de producto. Cart y Stock no proporcionan ya esa funcionalidad.

Da a los comandos de resultado del proveedor `InternalTransport`; la solicitud de
borrador orientada a la persona usuaria y la aprobación siguen siendo comandos
públicos separados. Conecta su servicio, consulta y manejador saliente en
`src/App.hs`, siguiendo [comandos](/es/build/commands-and-events/) y [registro de manejadores](/es/connect/workflows/). El constructor de abajo proporciona la llamada al proveedor; tu flujo de trabajo aporta sus entradas y callbacks.

## Modela un borrador antes de solicitarlo

Un flujo de borrador registra una solicitud, llama al proveedor y registra texto
generado o un fallo. La aceptación es un comando separado. En el ejemplo, conserva
el identificador del producto y la identidad de la solicitud para que una respuesta
tardía no sobrescriba un borrador más nuevo.

El callback del proveedor te indica que una respuesta se decodificó correctamente.
No establece la exactitud factual, la adecuación para publicación ni el
cumplimiento de las reglas de la aplicación.

## Construye una solicitud de OpenRouter

Este **constructor parcial** solicita un borrador breve. `modelName` procede de la
configuración del proveedor elegido; `productFacts` contiene solo entradas
aprobadas. `recordDraftResponse` debe inspeccionar la respuesta y producir el mismo
tipo de comando que `recordDraftFailure`.

```haskell
Integration.outbound OpenRouter.Request
  { messages =
      [ OpenRouter.system
          "Draft a short product description using only the supplied facts."
      , OpenRouter.user productFacts
      ]
  , model = modelName
  , config = OpenRouter.defaultConfig
      { OpenRouter.maxTokens = Just 300
      , OpenRouter.timeoutSeconds = 30
      }
  , onSuccess = recordDraftResponse
  , onError = recordDraftFailure
  }
```

El adaptador obtiene su token bearer de `OPENROUTER_API_KEY`. Elige y verifica de
forma independiente un modelo disponible actualmente; los identificadores de
modelo de ejemplos antiguos no prometen disponibilidad actual.

La respuesta contiene `choices` y un `usage` opcional. Gestiona un array `choices`
vacío. Una elección incluye su mensaje y el motivo de finalización: el truncado o
el filtrado pueden hacer que el texto no sea adecuado aunque la solicitud HTTP haya
tenido éxito. El contenido del mensaje puede ser texto plano o varias partes de
contenido.

Esta integración hace una solicitud sin streaming. Es adecuada para un flujo de
borrador en segundo plano; por sí sola no implementa una interfaz de chat en
streaming, almacenamiento de conversaciones ni un sistema de recuperación.

## Usa Azure AI cuando corresponda

Las solicitudes de Azure tienen un endpoint validado explícitamente y una clave de
API redactada. El helper vive en `Integration.AzureAI`. Haz primero:

```haskell
AzureAI.azureEndpoint endpointText
```

Esto devuelve `Result Text AzureEndpoint`; trata un endpoint no válido como un
problema de configuración. `azureEndpointAllowing` permite sufijos de host
confiables adicionales para tu despliegue. Mantén esos sufijos bajo control
operativo.

Un **fragmento de expresión**, después de validar y con un binding de configuración
implícito real, es:

```haskell
AzureAI.chatCompletion
  validatedEndpoint
  [AzureAI.system "Use only supplied product facts.", AzureAI.user productFacts]
  deploymentName
  recordDraftResponse
  recordDraftFailure
```

El helper lee `?config.azureAiApiKey :: Redacted Text`. Para un cableado explícito
de credenciales, construye `AzureAI.Request` con `apiKey` y una configuración cuyo
`endpoint` sea el valor validado. No uses la configuración predeterminada sin más
como configuración completa de endpoint. El código fuente fija un valor
predeterminado de versión de API; verifica la compatibilidad con tu despliegue.

## Ejecuta un borrador mediante el flujo de trabajo

Ejecuta `neo build` después de añadir el servicio y el manejador de borradores a
`mug-shop`. Usa `neo test` para fixtures de respuestas fijas; esas comprobaciones
no deberían necesitar un modelo en vivo. Inicia `neo run` con la credencial del
proveedor, solicita un borrador e inspecciona su consulta. Confirma que el texto
generado permanezca sin aprobar hasta que tenga éxito tu comando de aceptación
separado.

## Dale a Jess evidencia más allá de un párrafo bonito

> **Agente:** «El modelo devolvió una descripción, así que la publico».
>
> **Jess:** «Muéstrame el comando que aprueba la publicación. El texto generado debe seguir siendo un borrador hasta que yo lo acepte».

Prueba el manejo de respuestas con fixtures fijos antes de probar un modelo en
vivo. Comprueba elecciones ausentes, afirmaciones no deseadas, truncado, rechazo
del proveedor y una respuesta que llegue después de que cambien los hechos del
producto. Construye un pequeño conjunto de evaluación de hechos de producto y
salidas inaceptables. Las llamadas en vivo verifican conectividad y adecuación para
tu carga de trabajo, mientras que los tests unitarios verifican tus reglas
deterministas.

La [advertencia sobre reintentos HTTP](/es/connect/http-and-payments/#understand-the-current-retry-boundary) compartida también se aplica a las llamadas al proveedor. Un tiempo de espera no demuestra que no haya ocurrido trabajo facturable. Establece una política de gasto de la aplicación y alinea los tiempos de espera de las solicitudes del proveedor con el [presupuesto del dispatcher](/es/connect/documents/#budget-the-entire-operation).

**Ejercicio:** añade una acción de regeneración al proyecto de práctica. Decide si
una respuesta antigua en curso puede sustituirla y prueba las respuestas que llegan
en orden inverso.

Continúa con [herramientas de IA](/es/connect/ai-tools/) solo cuando estés listo para que el modelo proponga acciones estructuradas.

<details>
<summary>Notas sobre el código fuente del framework</summary>

- [integrations/Integration/OpenRouter/Request.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/OpenRouter/Request.hs)
- [integrations/Integration/OpenRouter/Internal.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/OpenRouter/Internal.hs)
- [integrations/Integration/OpenRouter/Response.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/OpenRouter/Response.hs)
- [integrations/Integration/AzureAI/Request.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/AzureAI/Request.hs)
- [integrations/test/Integration/AzureAI/RequestSpec.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/test/Integration/AzureAI/RequestSpec.hs)

</details>
