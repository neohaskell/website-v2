---
title: Coordina trabajo entre entidades
description: Conecta eventos y comandos entre servicios manteniendo explícita cada regla.
sidebar:
  order: 1
---
<!-- translation-source-sha256: 7916e17a3e9a10332cb125157f4a090af1d94900dad98769570db76df4cba7b4 -->

Un cambio aceptado puede requerir trabajo en otra parte de una aplicación. Mantener
separadas esas responsabilidades da a cada regla un hogar claro, pero introduce un
periodo en el que un lado ha cambiado y el otro todavía no. Una integración hace
explícito ese traspaso.

Continúa en tu directorio `mug-shop` desde [stock y checkout](/es/build/stock-and-checkout/). Sus servicios Cart y Stock ya toman decisiones separadas. Ahora conéctalos: añadir dos tazas registra la elección en Cart y después pide a Stock que reserve dos unidades. Esta política reserva al añadir; reservar en checkout es una variación posterior.

Todas las rutas siguientes son relativas a la raíz del proyecto `mug-shop`. Los
ejemplos hacen crecer el mismo proyecto. Las declaraciones pequeñas explican
primero la decisión; los archivos completos que aparecen después en cada sección
son el punto de control que puedes copiar.

## Decide qué cruza la frontera

El traspaso tiene una sola función: convertir un evento `ItemAdded` aceptado en una
solicitud de stock. El valor importante es el comando que se envía al servicio
Stock:

```haskell
ReserveStock
  { stockId = added.stockId
  , quantity = added.quantity
  , cartId = cart.cartId
  }
```

`added` es la carga dentro de `ItemAdded`; `cart` proporciona el identificador del
carrito. Envuelve ese valor en `Command.Emit` para que lo entregue el runtime de
integración. Es un comando de aplicación, así que conserva la decisión de Stock y
sus reglas de rechazo en lugar de saltárselas.

## Crea la integración saliente

Desde la raíz del proyecto, crea el directorio de integración:

```sh
mkdir -p src/Shop/Cart/Integrations
```

Crea el directorio y el archivo desde la raíz del proyecto: `mkdir -p
src/Shop/Cart/Integrations`, y después crea
`src/Shop/Cart/Integrations/ReserveStockOnItemAdded.hs`. Empieza con la declaración
y la regla de abajo, y después copia el archivo completo. `CartEntity` es el estado
reconstruido para el evento; `CartEvent` es la familia de eventos ya definida por
el slice de Cart.

```haskell
data ReserveStockOnItemAdded = ReserveStockOnItemAdded

type instance EntityOf ReserveStockOnItemAdded = CartEntity

handleEvent :: CartEntity -> CartEvent -> Integration.Outbound
handleEvent cart event =
  case event of
    ItemAdded added ->
      Integration.batch
        [ Integration.outbound
            Command.Emit
              { command =
                  ReserveStock
                    { stockId = added.stockId
                    , quantity = added.quantity
                    , cartId = cart.cartId
                    }
              }
        ]
    _ -> Integration.none

deriveOutboundIntegration ''ReserveStockOnItemAdded
```

Cuando se añade un artículo, pide a Stock que reserve la cantidad solicitada. Los
demás eventos de Cart no producen ninguna acción. `Command.Emit` envía un comando a
otro servicio registrado; no realiza una llamada HTTP externa.

El marcador conecta `handleEvent` con la maquinaria saliente. La función sigue
aportando la regla de negocio; el marcador no decide cuándo reservar stock.

### Archivo de integración completo

Copia todo el contenido en la ruta indicada por el fence de abajo, incluidos los
imports necesarios para las declaraciones anteriores.

<!-- complete-file -->
```haskell title="src/Shop/Cart/Integrations/ReserveStockOnItemAdded.hs"
module Shop.Cart.Integrations.ReserveStockOnItemAdded (
  ReserveStockOnItemAdded (..),
  handleEvent,
) where

import Core
import Integration qualified
import Integration.Command qualified as Command
import Shop.Cart.Core (CartEntity (..), CartEvent (..))
import Shop.Cart.Events.ItemAdded qualified as ItemAdded
import Shop.Stock.Commands.ReserveStock (ReserveStock (..))


data ReserveStockOnItemAdded = ReserveStockOnItemAdded


type instance EntityOf ReserveStockOnItemAdded = CartEntity


handleEvent :: CartEntity -> CartEvent -> Integration.Outbound
handleEvent cart event =
  case event of
    ItemAdded added ->
      Integration.batch
        [ Integration.outbound
            Command.Emit
              { command =
                  ReserveStock
                    { stockId = added.stockId
                    , quantity = added.quantity
                    , cartId = cart.cartId
                    }
              }
        ]
    _ -> Integration.none


deriveOutboundIntegration ''ReserveStockOnItemAdded
```

## Registra el comando Stock y la integración

El manejador nuevo solo puede emitir `ReserveStock` si el servicio Stock registra
ese comando con `InternalTransport`, como ya hace el código fuente de la lección de
Stock. Conserva también los comandos públicos de Cart.

Conserva los registros de `CreateCart` y `AddItem` del servicio Cart. El registro
de integración pertenece a `App.hs`; no es otro comando de Cart.

Si tu servicio Cart todavía coincide con el punto de control de Build, el archivo
completo siguiente es el resultado. Si ya añadiste el capítulo del temporizador,
conserva su import y registro adicionales de `CreateCartInternal`.

<!-- complete-file -->
```haskell title="src/Shop/Cart/Service.hs"
module Shop.Cart.Service (service) where

import Core
import Service qualified
import Shop.Cart.Commands.AddItem (AddItem)
import Shop.Cart.Commands.CreateCart (CreateCart)

service :: Service _ _
service = Service.new
  |> Service.command @CreateCart
  |> Service.command @AddItem
```

No añadas `CreateCartInternal` solo para este flujo; se introduce en [la lección del temporizador](/es/connect/timers/).

## Añade la integración a `App.hs`

En `src/App.hs`, añade este import junto a los demás imports de `Shop.Cart`:

```haskell
import Shop.Cart.Integrations.ReserveStockOnItemAdded (ReserveStockOnItemAdded)
```

Añade el registro después de los servicios y consultas existentes, conservándolos
todos:

```haskell
  |> Application.withOutbound @ReserveStockOnItemAdded
```

Si tu archivo todavía coincide con el punto de control de Build, sustituirlo por el
resultado completo siguiente es la ruta más corta. Si ya has añadido cargas,
temporizadores, autenticación u otras integraciones, conserva esos imports y
registros y añade estas dos líneas en los lugares correspondientes.

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
import Shop.Config (ShopConfig (..))
import Shop.Cart.Integrations.ReserveStockOnItemAdded (ReserveStockOnItemAdded)
import Shop.Cart.Queries.CartSummary (CartSummary)
import Shop.Cart.Service qualified as Cart
import Shop.Stock.Queries.StockLevel (StockLevel)
import Shop.Stock.Service qualified as Stock

app :: Application
app = Application.new
  |> Application.withConfig @ShopConfig
  |> Application.withEventStore (\(config :: ShopConfig) -> SimpleEventStore
    { basePath = Path.fromText ".neo/events" |> Maybe.getOrDie
    , persistent = config.persistEvents
    })
  |> Application.withTransport WebTransport.server
  |> Application.withService Cart.service
  |> Application.withQuery @CartSummary
  |> Application.withService Stock.service
  |> Application.withQuery @StockLevel
  |> Application.withOutbound @ReserveStockOnItemAdded
```

La integración tipada reconstruye el estado de Cart a partir de su historial
registrado. Su registro necesita un valor inicial predeterminado para `CartEntity`;
el marcador de entidad ya lo proporciona a partir de `initialState`:

```haskell
deriveEntity ''CartEntity ''CartEvent
```

Conserva esa declaración en `src/Shop/Cart/Entity.hs` después de `initialState`,
`update` y `getEventEntityId`. El marcador proporciona la maquinaria de entidad; no
añadas una segunda instancia manual de `Default`.

## Ejecuta el comportamiento conectado

Desde la raíz del proyecto, detén cualquier servidor existente antes de cambiar
archivos y después ejecuta:

```sh
neo build
neo run
```

Usa otro terminal para las solicitudes de [stock y checkout](/es/build/stock-and-checkout/). Crea stock nuevo con tres unidades disponibles y un carrito nuevo; después añade dos unidades usando los identificadores devueltos. Consulta la vista de stock hasta que informe de una disponible y dos reservadas. Una respuesta correcta de Cart no significa que la consulta de Stock ya se haya actualizado.

Lee también el resumen de Cart. Su `itemCount` es uno porque cuenta entradas,
aunque la adición solicitara dos unidades. Stock sigue las cantidades de unidades.
Estas vistas responden a preguntas distintas sobre el mismo flujo.

## Añade el test de integración repetible

Crea `tests/stock-reservation.hurl` desde la raíz del proyecto. Detén `neo run`
antes de `neo test`; la CLI inicia el servidor de tests. El archivo completo de
abajo captura identificadores nuevos, comprueba ambas vistas, rechaza cero sin
cambiar esas vistas y después reserva la última unidad restante.

```hurl
POST http://localhost:8080/commands/initialize-stock
Content-Type: application/json
{"productId":"11111111-1111-1111-1111-111111111111","available":3}
HTTP/1.1 200
[Captures]
stock_id: jsonpath "$.entityId"

POST http://localhost:8080/commands/create-cart
Content-Type: application/json
[]
HTTP/1.1 200
[Captures]
cart_id: jsonpath "$.entityId"

POST http://localhost:8080/commands/add-item
Content-Type: application/json
{"cartId":"{{cart_id}}","stockId":"{{stock_id}}","quantity":2}
HTTP/1.1 200

GET http://localhost:8080/queries/cart-summary
[Options]
retry: 10
retry-interval: 200
HTTP/1.1 200
[Asserts]
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].itemCount" nth 0 == 1
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].isEmpty" nth 0 == false

GET http://localhost:8080/queries/stock-level
[Options]
retry: 10
retry-interval: 200
HTTP/1.1 200
[Asserts]
jsonpath "$.items[?(@.stockLevelId == '{{stock_id}}')].available" nth 0 == 1
jsonpath "$.items[?(@.stockLevelId == '{{stock_id}}')].reserved" nth 0 == 2

POST http://localhost:8080/commands/add-item
Content-Type: application/json
{"cartId":"{{cart_id}}","stockId":"{{stock_id}}","quantity":0}
HTTP/1.1 400

GET http://localhost:8080/queries/cart-summary
HTTP/1.1 200
[Asserts]
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].itemCount" nth 0 == 1

GET http://localhost:8080/queries/stock-level
HTTP/1.1 200
[Asserts]
jsonpath "$.items[?(@.stockLevelId == '{{stock_id}}')].available" nth 0 == 1
jsonpath "$.items[?(@.stockLevelId == '{{stock_id}}')].reserved" nth 0 == 2

POST http://localhost:8080/commands/add-item
Content-Type: application/json
{"cartId":"{{cart_id}}","stockId":"{{stock_id}}","quantity":1}
HTTP/1.1 200

GET http://localhost:8080/queries/cart-summary
[Options]
retry: 10
retry-interval: 200
HTTP/1.1 200
[Asserts]
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].itemCount" nth 0 == 2

GET http://localhost:8080/queries/stock-level
[Options]
retry: 10
retry-interval: 200
HTTP/1.1 200
[Asserts]
jsonpath "$.items[?(@.stockLevelId == '{{stock_id}}')].available" nth 0 == 0
jsonpath "$.items[?(@.stockLevelId == '{{stock_id}}')].reserved" nth 0 == 3
```

Ejecuta `neo test` desde `mug-shop`. Los reintentos de consulta esperan la
integración y las proyecciones asíncronas; no vuelven a enviar una adición
aceptada. Conserva también los tests más pequeños de Cart y Stock: este escenario
prueba el comportamiento conectado, mientras los tests pequeños muestran qué regla
local falló.

## El caso que el camino feliz no resuelve

> **Jess:** «Si no hay stock disponible, deshaz automáticamente la adición».
>
> **Agente:** «El comando de stock rechaza la reserva, así que el carrito no cambia».
>
> **Jess:** «El evento del carrito ya se aceptó. Muéstrame el camino de vuelta que actualiza el carrito».

Un rechazo en Stock no puede borrar un evento de Cart ya registrado. El manejador
anterior proporciona una dirección de comunicación. Un flujo completo necesita un
camino de resultado explícito, como registrar el fallo de reserva y cambiar lo que
permite el checkout. Implementar ese camino de vuelta es una ampliación útil para el
proyecto de práctica.

Este es un problema de **gestor de procesos**: coordinar pasos entre entidades,
seguir el progreso y gestionar trabajo incompleto. Representa explícitamente el
trabajo pendiente y su recuperación. En este ejemplo, el checkout no puede
considerarse completo solo porque Cart aceptó un artículo.

## Ejercicio: decide cuándo se reserva el stock

Cambia la política del proyecto de práctica de «al añadir» a «al solicitar el
checkout». Escribe la secuencia de eventos antes de cambiar el código. Añadir al
carrito ya no debe reservar stock. El checkout debe solicitar una reserva una sola
vez para una operación de negocio estable. Comprueba stock suficiente, stock
insuficiente, solicitudes duplicadas y cancelación mientras la reserva está
pendiente. Define qué ve el cliente en cada caso.

Continúa con [llamadas a proveedores](/es/connect/http-and-payments/) cuando el paso siguiente salga de tu aplicación.

<details>
<summary>Notas sobre el código fuente del framework</summary>

- [testbed/src/Testbed/Cart/Integrations/ReserveStockOnItemAdded.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/Testbed/Cart/Integrations/ReserveStockOnItemAdded.hs)
- [core/service/Service/OutboundIntegration/TH.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/OutboundIntegration/TH.hs)
- [core/service/Integration/Command.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Integration/Command.hs)
- [testbed/src/App.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/App.hs)
- [testbed/tests/scenarios/stock-reservation.hurl](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/tests/scenarios/stock-reservation.hurl)

</details>
