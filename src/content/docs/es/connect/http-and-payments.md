---
title: Llama a APIs HTTP externas
description: Conecta APIs externas sin confundir una solicitud con una operación completada.
sidebar:
  order: 2
---
<!-- translation-source-sha256: c57edfc06dcb49ed47a18d2adbe3eff8741f6a3f550f554e6bbcef0aa77e05ca -->

Tu aplicación envía una solicitud a otro servicio, pero la conexión se cierra antes
de que llegue la respuesta. ¿El servicio rechazó el trabajo o la respuesta
desapareció después de que el trabajo terminara? Una integración HTTP debe gestionar
esa incertidumbre además del éxito y el fallo habituales.

NeoHaskell proporciona la maquinaria de solicitudes; tu aplicación interpreta la
respuesta del proveedor y decide qué operaciones se pueden repetir de forma segura.
Empezaremos con una consulta de estado y después usaremos un pago simulado en el
proyecto de comercio electrónico para practicar un traspaso de consecuencias
mayores.

Requisitos previos: [ciclo de vida de integraciones](/es/connect/) y [configuración](/es/build/configuration/).

## Coloca la llamada al proveedor en tu proyecto

Continúa desde tu directorio `mug-shop` y completa la [configuración de integraciones](/es/connect/#prepare-your-project). Conserva el helper de protocolo en `src/Shop/Integrations/ProviderStatus.hs`. El manejador del lado de Cart que decide cuándo llamarlo pertenece a `src/Shop/Cart/Integrations/`, siguiendo el [módulo de manejador completo](/es/connect/workflows/#create-the-outbound-integration).

Antes de añadir la solicitud, define el comando que registra un resultado de estado
y regístralo en el servicio correspondiente con `InternalTransport`. Dale
resultados correctos, rechazados y no resueltos con un identificador de operación
estable. El constructor siguiente es la parte de solicitud de esa funcionalidad;
los callbacks vinculan el resultado con el comando de tu aplicación.

## Aprende la forma de la solicitud con una lectura

Empieza con una operación que lea el estado del proveedor. En este **constructor
parcial de integración**, `statusUrl`, `recordReply` y `recordFailure` son valores
proporcionados por tu aplicación. Ambos callbacks devuelven un único tipo de
comando registrado.

```haskell
-- Inside the event handler's Integration.batch:
Integration.outbound Http.Request
  { method = Http.GET
  , url = statusUrl
  , headers = []
  , body = Http.noBody
  , onSuccess = recordReply
  , onError = Just recordFailure
  , auth = Http.Bearer "${SHOP_PROVIDER_TOKEN}"
  , retry = Http.defaultRetry
  , timeoutSeconds = 15
  }
```

Los valores de URL y cabeceras admiten sustitución de entorno. La autenticación
admite `NoAuth`, `Bearer`, `Basic` y `ApiKey` con cabecera con nombre. Las variables
de entorno ausentes generan un error de autenticación de integración durante la
preparación; no necesariamente llegan a `onError`.

`Http.Response` contiene `statusCode`, un `body` JSON y `headers` de respuesta.
**Inspecciona el estado en tu callback.** El callback llamado `onSuccess` es la vía
de respuesta; no declara que el proveedor haya aprobado la operación de negocio.

Para los cuerpos de las solicitudes, usa `Http.json`, `Http.form`, `Http.raw` o
`Http.noBody`. El adaptador actual admite JSON para POST, PUT y PATCH; los cuerpos
form y raw están implementados para POST. GET y DELETE no usan el cuerpo
proporcionado. Las respuestas se decodifican mediante el cliente JSON, por lo que
un proveedor que devuelva contenido vacío o no JSON necesita tests de compatibilidad
explícitos o un adaptador personalizado.

## Pasa de HTTP al significado de un pago

Usa un proveedor de prueba para modelar un pago en el proyecto de práctica:

1. Registra un intento de pago de la aplicación con un identificador estable y el importe/divisa del pedido.
2. Construye la solicitud del proveedor a partir del estado confiable de la aplicación.
3. Usa el mecanismo de idempotencia documentado por el proveedor si lo admite. Esto requiere trabajo específico del proveedor.
4. Decodifica y valida la respuesta, conservando su identificador de operación.
5. Registra resultados confirmados, rechazados o no resueltos mediante comandos.
6. Concilia los intentos no resueltos preguntando al proveedor por su estado real.

Son pasos de diseño, no un adaptador de pagos proporcionado. Elige y verifica por
separado una API actual del proveedor. Que un cliente vuelva a una página de éxito
no es por sí solo evidencia de confirmación del pago.

Para los callbacks del proveedor, valida la autenticidad antes de traducir los
datos entrantes a un comando. La abstracción genérica de workers entrantes no
proporciona un verificador de firmas del proveedor de pagos ni una ruta webhook.

## Entiende el límite actual de reintentos

El registro `Retry` del código fuente documenta `maxAttempts` como incluyendo el
primer intento. El ejecutor actual compara `attempt <= maxAttempts` antes de
reintentar, lo que puede permitir un intento adicional. Por tanto, su preset
`noRetry` no debe tratarse como garantía de que una solicitud fallida se envíe una
sola vez.

El ejecutor también reintenta los errores de solicitud por separado de su lista de
códigos de estado. No deduzcas que solo los estados enumerados pueden provocar otra
solicitud. Estas limitaciones de implementación importan para cargos, llamadas de
IA facturables y compras de etiquetas; prueba el número real de solicitudes con un
endpoint controlado antes de aprobar esas operaciones.

Los timeouts tampoco demuestran que el lado remoto no hiciera nada. Conserva un
resultado no resuelto hasta tener evidencia.

## Ejecuta una comprobación de estado controlada

Ejecuta `neo build` desde `mug-shop` después de añadir el helper y el comando de
callback. Ejercita el mapeo de estados en tu suite de `tests/` con `neo test`,
incluida una respuesta de error JSON válida. Inicia tu aplicación con `neo run`,
dispara la solicitud mediante su comando e inspecciona la consulta de estado
resultante. Usa un endpoint controlado antes de conectar credenciales de pago.

## Ejercicio: una respuesta de pago perdida

Describe el estado de la aplicación de práctica después de un timeout, qué muestra
su pantalla y cómo resolverías la incertidumbre. Después considera qué partes se
aplican también a crear una entrada de calendario o enviar un documento a procesar.

<details>
<summary>Comprobaciones sugeridas</summary>

Usa un proveedor de prueba que acepte una operación y después cierre la conexión.
Comprueba que una solicitud repetida no pueda cobrar dos veces según el contrato de
proveedor elegido. Comprueba un rechazo, JSON malformado, un estado de error JSON
válido, un ID de operación desconocido y un resultado de conciliación posterior.
Registra por separado la verificación en el sandbox del proveedor real y los tests
unitarios del mapeo de respuestas.

</details>

Para una integración de proveedor más pequeña, continúa con [correo electrónico](/es/connect/email/).

<details>
<summary>Notas sobre el código fuente del framework</summary>

- [integrations/Integration/Http/Request.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Http/Request.hs)
- [integrations/Integration/Http/Response.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Http/Response.hs)
- [integrations/Integration/Http/Internal.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Http/Internal.hs)
- [integrations/Integration/Http/Retry.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Http/Retry.hs)
- [integrations/test/Integration/Http/InternalSpec.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/test/Integration/Http/InternalSpec.hs)
- [core/service/Integration.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Integration.hs)

</details>
