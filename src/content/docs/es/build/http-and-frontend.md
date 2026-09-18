---
title: HTTP y frontends
description: Conecta una interfaz con comandos y consultas, y comunica el estado de cada solicitud.
sidebar:
  order: 6
---
<!-- translation-source-sha256: 79f3faf0995deda2ea89dd830481ff910c8c7013965e158eaef5f051d10cffc7 -->

Una interfaz de usuario convierte las elecciones en solicitudes y muestra sus
resultados. Necesita distinguir la aceptación, el trabajo que sigue en curso y el
fallo, para que las personas sepan qué ocurrió y qué pueden hacer después.

El transporte web de NeoHaskell expone comandos y consultas mediante HTTP. Puedes
construir la interfaz con un framework frontend adecuado para tu equipo. El
transporte actual sirve la API de la aplicación y su documentación; no proporciona
una API general de alojamiento de frontends estáticos.

Nuestro ejemplo desarrollado es una tienda para el proyecto de práctica de
comercio electrónico. Una adición al carrito, una reserva pendiente y un pedido
confirmado nos dan ejemplos concretos de los estados distintos que debe comunicar
una interfaz.

Los ejemplos continúan en el mismo proyecto `mug-shop`. La API es la parte que
implementa esta lección; un frontend de navegador es un cliente opcional que
puedes añadir junto al proyecto Neo.

## Empieza por el contrato real

Con [tu aplicación en ejecución](/es/build/first-cart/) mediante `neo run`, abre
`http://localhost:8080/docs` para inspeccionar la documentación de la API generada.
El mismo esquema está disponible en `/openapi.json` y `/openapi.yaml`.

| Propósito | Ruta de ejemplo | Significado del éxito |
| --- | --- | --- |
| Enviar una solicitud de negocio | `POST /commands/add-item` | El comando Cart fue aceptado. |
| Leer una vista | `GET /queries/cart-summary` | Se devolvió una página de filas de vista disponibles y autorizadas. |
| Inspeccionar la interfaz | `GET /openapi.json` | Se devolvió el esquema de API generado por la aplicación. |

El registro dirige la interfaz: el comando declara su transporte, el servicio
registra el comando y la aplicación registra ese servicio y sus consultas. Las
rutas HTTP usan nombres kebab-case. No deduzcas una ruta a partir de una etiqueta
de pantalla como «checkout» si no existe ningún comando correspondiente.

## Ensambla el cableado de la aplicación HTTP

Si tu proyecto todavía usa el almacén local no persistente, crea o sustituye
`src/App.hs` por este cableado completo. Expone los comandos de Cart y Stock y sus
vistas de consulta mediante el transporte web. Si tu `App.hs` ya tiene
configuración, autenticación u otra política de transporte, conserva esos pasos y
añade solo los registros de servicios y consultas que falten.

<!-- complete-file -->
```haskell title="src/App.hs"
module App (app) where

import Core
import Maybe qualified
import Path qualified
import Service.Application (Application)
import Service.Application qualified as Application
import Service.EventStore.Simple (SimpleEventStore (..))
import Service.Transport.Web qualified as WebTransport
import Shop.Cart.Queries.CartSummary (CartSummary)
import Shop.Cart.Service qualified as Cart
import Shop.Stock.Queries.StockLevel (StockLevel)
import Shop.Stock.Service qualified as Stock

app :: Application
app = Application.new
  |> Application.withEventStore @() (\_ -> SimpleEventStore
    { basePath = Path.fromText ".neo/events" |> Maybe.getOrDie
    , persistent = False
    })
  |> Application.withTransport WebTransport.server
  |> Application.withService Cart.service
  |> Application.withQuery @CartSummary
  |> Application.withService Stock.service
  |> Application.withQuery @StockLevel
```

Desde la raíz del proyecto, ejecuta `neo build` y después `neo run`. Abre `/docs` y
`/openapi.json` para confirmar que los comandos y consultas registrados están en
el contrato generado antes de conectar un navegador.

## Conecta una acción

Esta **función JavaScript parcial para el navegador** envía la solicitud `AddItem`
de tu aplicación. Llámala con los IDs reales de [stock y checkout](/es/build/stock-and-checkout/). Supone que el frontend de práctica usa un proxy del mismo origen para `/commands`; el desarrollo entre orígenes necesita una configuración CORS explícita del servidor.

```javascript
async function addMugs(cartId, stockId, quantity) {
  const response = await fetch('/commands/add-item', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cartId, stockId, quantity }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.reason ?? result.error ?? 'Could not add mugs');
  }
  return result.entityId;
}
```

Esta es una función parcial de navegador adaptada, no un archivo frontend completo.
Colócala en el módulo que use tu frontend (por ejemplo, crea
`frontend/cart.js` si tu proyecto todavía no tiene código de navegador) y llámala
desde el manejador de eventos de un formulario AddItem. El proyecto Neo no genera
ese directorio frontend ni configura un proxy para él. Una aplicación autenticada
también debe proporcionar su credencial según la configuración de autenticación.
Esta función local de práctica no implementa una sesión completa de cliente.

La interfaz debe desactivar los envíos duplicados accidentales mientras la solicitud
esté en curso, mostrar un rechazo útil y actualizar la consulta relevante después
de aceptar. Una respuesta de red perdida necesita cuidado especial: el servidor
puede haber aceptado ya la solicitud. Decide cómo detecta la aplicación los
duplicados antes de reenviar automáticamente escrituras.

## Gestiona los resultados por separado

El transporte web asigna las respuestas de comandos aceptados a HTTP 200. Los
rechazos de negocio se asignan actualmente a 400, con un `reason`; los fallos de
comandos también se asignan a 400, con un `error`. Inspecciona el cuerpo de la
respuesta además del estado, en lugar de tratar cada 400 como JSON no válido.

Los fallos de autenticación y permisos usan 401 o 403. Una ruta no registrada
produce 404. Los modelos de lectura pueden retrasarse temporalmente respecto a una
escritura aceptada, así que «aceptado, actualizando» es un estado útil de la
interfaz. Un reintento acotado de la lectura es distinto de reproducir la escritura.

## Coloca el acceso del navegador en el cableado de la aplicación

La API tiene una `CorsConfig` con orígenes, métodos y cabeceras permitidos, además
de una edad opcional de caché para el preflight. Esta **expresión parcial de
cableado de aplicación** ilustra una política de frontend local; requiere los
imports existentes de `Application` y `WebTransport`:

```haskell
Application.withCors @() (\_ -> WebTransport.CorsConfig
  { allowedOrigins = ["http://localhost:4321"]
  , allowedMethods = ["GET", "POST", "OPTIONS"]
  , allowedHeaders = ["Content-Type", "Authorization"]
  , maxAge = Just 600
  })
```

Aplícala en la canalización de tu aplicación y usa el origen real de tu frontend.
CORS gobierna el acceso del navegador; no concede permisos de negocio. Protege la
información privada con [control de acceso](/es/build/access-control/).

Crea o sustituye `tests/scenarios/create-cart.hurl` por esta comprobación completa
de la API. Da al contrato del navegador un límite repetible en el servidor antes
de añadir un frontend. Detén `neo run` antes de ejecutar `neo test`.

<!-- complete-file -->
```hurl title="tests/scenarios/create-cart.hurl"
POST http://localhost:8080/commands/create-cart
Content-Type: application/json
[]

HTTP 200
[Captures]
cart_id: jsonpath "$.entityId"

GET http://localhost:8080/queries/cart-summary
[Options]
retry: 10
retry-interval: 200

HTTP 200
[Asserts]
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].itemCount" nth 0 == 0
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].isEmpty" nth 0 == true
```

Ejecuta `neo test` desde la raíz del proyecto. La comprobación Hurl demuestra la
respuesta de la API y la actualización eventual de la consulta; no demuestra que
estén configurados el diseño del navegador, el proxy o el proveedor de
autenticación.

## Ejercicio: un resumen retrasado

El servidor aceptó una adición, pero el resumen siguiente sigue pareciendo vacío.
Diseña las tres acciones siguientes de la pantalla sin enviar otra adición.

<details>
<summary>Razonamiento y comprobaciones sugeridos</summary>

Muestra la aceptación con una actualización pendiente, vuelve a intentar la lectura
dentro de un intervalo acotado y ofrece un estado claro de actualización o
recuperación si sigue obsoleto. Comprueba una actualización normal, una cantidad
cero rechazada y una proyección retrasada. Simula por separado un error de red
después del envío: «no hemos podido confirmar el resultado» es más exacto que
afirmar que la adición falló. Verifica que hacer doble clic no añada dos veces en
silencio.

</details>

Siguiente: [comprobar el comportamiento](/es/build/testing/).

Fuentes públicas: [transporte web](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Transport/Web.hs), [respuestas de comandos](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Response.hs) y [cableado de la aplicación](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Application.hs).
