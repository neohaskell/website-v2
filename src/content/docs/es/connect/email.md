---
title: Envía correo electrónico
description: Registra la aceptación del proveedor y gestiona de forma visible los fallos de notificación.
sidebar:
  order: 4
---
<!-- translation-source-sha256: 674d034499dc89d8cee7ca9de783120958d78666c98ee3fb6adfdf247ef01e54 -->

El correo electrónico proporciona a las personas un resultado que pueden
inspeccionar fuera de la aplicación: una notificación, una invitación o una
confirmación. También introduce una distinción importante: que un proveedor
acepte un mensaje no demuestra que la persona destinataria lo haya recibido o
leído.

NeoHaskell incluye tipos de solicitud de Brevo y Azure Communication Services
(ACS). Usaremos una confirmación de pedido del proyecto de práctica para aprender
el patrón de solicitudes y callbacks. Las credenciales del proveedor, la
configuración de un remitente verificado y la entrega real son tareas de
configuración separadas; empieza con un destinatario de prueba que controles tú.

## Añade correo a mug-shop

Usa tu proyecto existente y completa la [configuración de integraciones](/es/connect/#prepare-your-project). Coloca el helper que construye las solicitudes en `src/Shop/Integrations/Email.hs`. Quien lo llama es un manejador saliente en la parte de la aplicación que posee la solicitud de notificación. Registra ese manejador en `src/App.hs` siguiendo el patrón de [flujos de trabajo](/es/connect/workflows/).

Una confirmación de pedido requiere el pedido y el flujo de notificación que
diseñes abajo; no existe simplemente porque Cart y Stock compilen. Empieza con una
solicitud de notificación controlada antes de hacerla parte del checkout.

## Define primero el resultado

Usa un comando de aplicación declarado con `InternalTransport` que pueda
representar la aceptación y el fallo del proveedor. Debe llevar el identificador de
notificación y cualquier identificador necesario para conectarlo con la acción de
origen. Su rama correcta registra el ID de mensaje/operación del proveedor; su rama
de fallo registra una explicación segura que la aplicación pueda mostrar.

Activa el correo a partir de un evento confirmado. En el ejemplo, un fallo de
notificación no debe hacer desaparecer el pedido aceptado. Para reenviar de forma
segura, modela el intento de notificación y decide cómo se gestionan los envíos
duplicados.

## Configura una solicitud de Brevo

Este **constructor parcial** describe un mensaje de texto plano. `emailKey` es un
valor de credencial `Redacted Text`; `recordAccepted` y `recordFailed` devuelven el
mismo tipo de comando. Las direcciones son ejemplos ficticios.

```haskell
Brevo.Request
  { sender = Brevo.sender "orders@example.com"
  , to = [Brevo.recipient customerEmail]
  , subject = "Your mug order"
  , body = Brevo.TextBody "We have received your order."
  , cc = []
  , bcc = []
  , replyTo = Nothing
  , tags = []
  , apiKey = emailKey
  , onSuccess = recordAccepted
  , onError = recordFailed
  }
  |> BrevoInternal.toHttpRequest
  |> Integration.outbound
```

Para un manejador de eventos sin parámetro de configuración, un patrón de runtime
compatible es establecer `emailKey` en `Redacted.wrap "${SHOP_BREVO_API_KEY}"`.
Esto guarda un marcador en la solicitud; la capa de autenticación HTTP compartida
lo amplía desde el entorno del servidor al ejecutar. Define esa variable de entorno
mediante la configuración de secretos del despliegue. No pongas la clave real en el
evento ni en el archivo fuente.

La conversión explícita es necesaria para el código actual: la fachada de Brevo
expone su constructor de solicitudes, pero no proporciona una instancia directa de
`ToAction (Brevo.Request command)`. `Integration.Brevo.Internal` está expuesto por
el paquete; mantener esta conversión en un único helper de aplicación hace que sea
fácil sustituir ese detalle de implementación más adelante.

Usa `HtmlBody`, `TextBody` o `Template`; el tipo de cuerpo permite una alternativa
cada vez. Una plantilla lleva `templateId` y un `Map Text Text` de parámetros.
`Sender` y `Recipient` son tipos distintos, lo que ayuda a evitar invertirlos por
accidente.

El constructor más corto `Brevo.send` lee `?config.brevoApiKey`. Úsalo solo donde
ese valor implícito de configuración esté realmente vinculado. Registrar la
configuración de la aplicación no añade por sí solo un parámetro implícito a la
firma pura y tipada del manejador. La solicitud explícita de arriba hace visible el
cableado de credenciales.

## Lee la respuesta con precisión

El adaptador de Brevo reconoce HTTP 201 y decodifica `messageId`. Los datos de
respuesta no válidos siguen el callback de error. Mapea los estados de
autenticación, crédito de cuenta, límite de velocidad, cliente y servidor a texto
de error.

ACS usa `Acs.Request`, con `endpoint`, `sender`, `to`, `subject`, `body`,
`accessToken` y los dos callbacks. Su fachada pública incluye la instancia de
ejecución, por lo que puede pasarse directamente a `Integration.outbound`. La
respuesta aceptada de ACS expone `operationId`; es una operación de envío asíncrona,
no una confirmación de entrega. El token es `Redacted Text`. Proporciona por
separado su estrategia de adquisición y renovación.

Conserva los endpoints de ACS en configuración confiable. Su adaptador impone
HTTPS; esa comprobación por sí sola no es una lista de hosts permitidos específica
del negocio.

Ambos adaptadores usan la maquinaria HTTP compartida. Lee la [limitación actual de reintentos](/es/connect/http-and-payments/#understand-the-current-retry-boundary) antes de suponer que cada envío se intentará una sola vez.

## Ejecuta la notificación mediante tu aplicación

Usa `neo build` para comprobar el helper y el registro del manejador en `mug-shop`.
Ejecuta `neo test` para los fixtures de solicitudes y respuestas, y después inicia
`neo run` con la credencial de correo de desarrollo en su entorno. Solicita una
notificación a tu destinatario de prueba e inspecciona la consulta de resultado
antes de comprobar el buzón. Estas observaciones establecen partes distintas del
recorrido de entrega.

## Comprueba en qué puede confiar Jess

Primero prueba el mapeo de solicitudes y respuestas sin enviar correo, cubriendo las
alternativas de cuerpo que uses y las respuestas aceptadas malformadas. Después
envía un mensaje en un entorno de proveedor controlado e inspecciona tanto el
resultado de la aplicación como el buzón destinatario.

**Ejercicio:** el proveedor acepta el correo, pero falla el registro de la
aceptación en tu aplicación. Explica qué debería hacer un botón «reenviar».

<details>
<summary>Razonamiento sugerido</summary>

Trata el resultado local como no resuelto. Conserva la identidad estable de la
notificación y la evidencia del proveedor cuando esté disponible, define cómo la
investigarías y decide si el riesgo de un correo duplicado es aceptable. Prueba
eventos de activación duplicados y resultados tardíos, además de los recorridos
normales de aceptación y fallo.

</details>

Siguiente: aprende cómo [los adjuntos de archivos](/es/connect/files/) conectan bytes almacenados con acciones de la aplicación.

<details>
<summary>Notas sobre el código fuente del framework</summary>

- [integrations/Integration/Brevo.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Brevo.hs)
- [integrations/Integration/Brevo/Request.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Brevo/Request.hs)
- [integrations/Integration/Brevo/Response.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Brevo/Response.hs)
- [integrations/Integration/Brevo/Internal.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Brevo/Internal.hs)
- [integrations/test/Integration/Brevo/InternalSpec.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/test/Integration/Brevo/InternalSpec.hs)
- [integrations/Integration/Acs/Request.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Acs/Request.hs)
- [integrations/Integration/Acs/Response.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Acs/Response.hs)
- [integrations/Integration/Acs/Internal.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Acs/Internal.hs)
- [core/core/Redacted.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/core/Redacted.hs)
- [integrations/Integration/Http/Internal.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Http/Internal.hs)
- [integrations/nhintegrations.cabal](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/nhintegrations.cabal)

</details>
