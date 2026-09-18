---
title: Construye una integración reutilizable
description: Encapsula el trabajo externo detrás de una solicitud pequeña y un resultado explícito.
sidebar:
  order: 10
---
<!-- translation-source-sha256: e3e707031b44439183bc1787e923b91de97405c7627b025459c1cd831f7efa20 -->

Cuando una aplicación necesita una API externa o una herramienta local que
NeoHaskell no envuelve, puedes empaquetar ese trabajo como una integración
reutilizable. Quien llama describe una solicitud en un registro pequeño; los
detalles del protocolo, las credenciales y el análisis de respuestas permanecen en
una única implementación.

Esta es una rama más profunda del recorrido. Asumes la responsabilidad del
comportamiento de red o de subprocesos, además de las reglas de la aplicación.
Empieza por [HTTP genérico](/es/connect/http-and-payments/) si ya encaja con el
proveedor.

## Da un lugar al adaptador en mug-shop

Sigue trabajando desde tu proyecto `mug-shop`. Empieza con un módulo como
`src/Shop/Integrations/Parcel.hs`; divídelo en módulos de solicitud, respuesta e
internos cuando esas responsabilidades necesiten hogares separados. Los imports
del resultado seguirán siendo `Shop.Integrations.Parcel` y sus hijos. Mantén las
dependencias específicas del proveedor en el `neo.json` de tu proyecto, siguiendo
la [configuración de integraciones](/es/connect/#prepare-your-project).

Una estructura útil separa:

- Un módulo fachada que importan quienes llaman.
- Un tipo de solicitud con entrada, configuración y callbacks de resultado.
- Un tipo de respuesta con el resultado útil del proveedor.
- Un módulo interno que implementa o compone la ejecución.

Para un proveedor imaginario de etiquetas de paquetes, la solicitud de la
aplicación podría incluir una referencia de envío y detalles del paquete. Es un
ejemplo de diseño, no una API de envíos proporcionada. Decide qué estado exacto
del proveedor establece la creación de la etiqueta y qué hacer si se pierde una
respuesta.

Mantén ambos callbacks devolviendo un único tipo de comando declarado con
`InternalTransport`. Deja que quien llama capture su propio identificador de flujo
en esos callbacks. Evita acoplar la integración reutilizable a una entidad
concreta de la aplicación.

## Entiende el contrato de ejecución

`Integration.ToAction` convierte una solicitud en una `Action`. Su método esencial
es:

```haskell
class ToAction config where
  toAction :: config -> Action
```

Una acción recibe `ActionContext` y devuelve un
`Task IntegrationError (Maybe CommandPayload)`. El trabajo correcto puede usar
`Integration.emitCommand`; el trabajo sin comando de seguimiento puede usar
`Integration.noCommand`.

Ya usaste `Integration.Command.Emit` en la [coordinación Cart–Stock](/es/connect/workflows/). No realiza ninguna operación externa: emite el comando configurado. Tu adaptador de paquetes añade trabajo de protocolo antes de elegir su comando de resultado.

Para proveedores HTTP, compón `Integration.Http.Request` en lugar de duplicar la
maquinaria de solicitudes. `toHttpRequest` de OpenRouter es un ejemplo concreto:
construye el endpoint, el cuerpo, las cabeceras, la autenticación, los callbacks y
el tiempo de espera, y después delega la ejecución. Conserva el [comportamiento de
reintentos actual](/es/connect/http-and-payments/#understand-the-current-retry-boundary) en los tests de compatibilidad del proveedor.

## Elige errores que ayuden a recuperarse

El vocabulario de errores del runtime incluye `NetworkError`,
`AuthenticationError`, `ValidationError`, `RateLimited`, `PermanentFailure` y
`UnexpectedError`.

Decide qué fallos se convierten en un comando de resultado y cuáles hacen fallar la
preparación antes de que pueda ejecutarse ninguna solicitud. Explica ese límite en
la documentación de tu integración. Quien espera un callback necesita una forma
operativa de detectar los fallos que evitan ese callback.

No devuelvas cuerpos arbitrarios del proveedor como cadenas de error. Pueden
contener datos de clientes o credenciales. Conserva una explicación segura y un
identificador de correlación cuando el proveedor ofrezca uno.

## Separa recursos de larga duración del estado duradero

Si una integración necesita un recurso costoso por entidad,
`Integration.Lifecycle.OutboundConfig state` ofrece:

```haskell
initialize :: StreamId -> Task Text state
processEvent :: state -> Event Json.Value -> Task Text (Array Integration.CommandPayload)
cleanup :: state -> Task Text Unit
```

Estas son **firmas de campos**, extraídas del tipo de ciclo de vida. Los workers
inicializan recursos, procesan eventos y limpian al detenerse o ser reciclados. Un
evento posterior puede crear un worker nuevo, por lo que este estado no es historial
de flujo duradero.

Un worker puede contener un `ConcurrentVar`, un manejador de conexión u otro recurso
temporal. Sus valores pueden reiniciarse cuando se recrea el worker. Conserva el
trabajo pendiente en el estado duradero de la aplicación, no solo en esa variable.
En `mug-shop`, «la compra de la etiqueta sigue pendiente» es uno de esos estados.

Después de implementar `shipmentLifecycle`, haz que él y `CartEntity` estén
disponibles en `src/App.hs`. Este **fragmento de registro** lo conecta con los
eventos de Cart:

```haskell
    |> Application.withOutboundLifecycle @() @CartEntity (\_ -> shipmentLifecycle)
```

`shipmentLifecycle` debe ser tu valor `OutboundConfig state` con las tres funciones
anteriores; no es una implementación de paquetes proporcionada. Usa esta capa solo
cuando su ciclo de vida de recursos sea útil. La mayoría de las solicitudes de
proveedor pueden permanecer sin estado.

## Recibe trabajo externo

`Integration.inbound` envuelve un `InboundConfig` cuya función `run` recibe un
callback de emisión. El worker traduce la información entrante a comandos. El
inicio de la aplicación lanza los workers entrantes registrados.

Una integración de webhook todavía necesita un listener real, autenticación o
verificación de firma del proveedor, límites de entrada y una estrategia de
acuse. La abstracción no es un servidor webhook generado automáticamente. Del mismo
modo, un consumidor de cola necesita una política deliberada de acuse, reentrega y
progreso duradero.

## Demuestra el adaptador antes de publicarlo

Usa `Integration.getActions` para inspeccionar las acciones seleccionadas por un
manejador y `Integration.runAction` con un `ActionContext` controlado para ejercitar
la ejecución. Las funciones puras que construyen solicitudes son especialmente
útiles para probar los mapeos de protocolo sin enviar tráfico.

Coloca los tests del adaptador junto a los demás en tu directorio `tests/`. Ejecuta
`neo build` después de añadir el módulo y después `neo test` para sus mapeos de
solicitudes y casos de error. Comprueba una entrada válida, un rechazo del
proveedor, datos de éxito malformados, credenciales ausentes, timeout, invocación
duplicada y una respuesta perdida después del éxito remoto. Cuenta las solicitudes
contra un servidor controlado. Por último, ejecuta `neo run` con credenciales de
sandbox y verifica el contrato del proveedor mediante los comandos y la consulta de
resultados de tu aplicación.

**Ejercicio:** empaqueta una consulta de estado de envío contra un proveedor de
prueba controlado para el proyecto de práctica. Pide a otra persona que lo
configure usando solo la API pública de solicitudes. Si necesita entender el
análisis HTTP interno para elegir opciones normales, revisa conjuntamente la API y
la documentación.

Vuelve a [ejecutar la aplicación](/es/operate/deployment/) para consultar las
dependencias de runtime, la configuración y la planificación de recuperación.

<details>
<summary>Notas sobre el código fuente del framework</summary>

- [core/service/Integration.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Integration.hs)
- [core/service/Integration/Command.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Integration/Command.hs)
- [core/service/Integration/Lifecycle.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Integration/Lifecycle.hs)
- [integrations/Integration/OpenRouter/Internal.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/OpenRouter/Internal.hs)
- [testbed/src/Testbed/Cart/Integrations/EventCounter.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/Testbed/Cart/Integrations/EventCounter.hs)
- [testbed/src/App.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/App.hs)
- [core/service/Service/Application/Integrations.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Application/Integrations.hs)

</details>
