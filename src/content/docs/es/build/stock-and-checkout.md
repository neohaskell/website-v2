---
title: "Coordina cambios: stock y checkout"
description: Añade un segundo dominio y define dónde necesitan coordinación sus decisiones.
sidebar:
  order: 5
---
<!-- translation-source-sha256: 3365d2858cbd3e34499d408fb35db1cab4fe86484c41948e1edd6f1059e483a0 -->

Una acción aceptada puede conducir a otra decisión. Una aplicación de agenda puede
aceptar una solicitud antes de reservar una sala; un flujo de documentos puede
guardar un borrador antes de que lo acepte una persona revisora. Una aplicación
útil hace visible esa distinción.

Tu proyecto de práctica incorpora ahora **Stock**. Un carrito registra selecciones;
el stock controla las unidades disponibles y reservadas. Aquí implementaremos y
probaremos la decisión de stock, y después la conectaremos con las adiciones del
carrito en la [lección de integración](/es/connect/workflows/).

Los ejemplos siguientes muestran las declaraciones y el comportamiento
pertinentes, con cada destino identificado. Los fragmentos pequeños enseñan una
decisión cada vez. Los archivos Stock ensamblados que aparecen más adelante
incluyen los módulos completos necesarios para este punto de control. El [final
completo de los archivos de Build](/examples/mug-shop-build.tar.gz) es
complementario; puedes construir el punto de control creando estos archivos en el
mismo proyecto.

## Declara las promesas

`InitializeStock` crea un registro con una cantidad disponible no negativa.
`ReserveStock` reserva una cantidad positiva solo cuando queda suficiente. Una
reserva mueve unidades de `available` a `reserved`.

Los IDs de producto y de stock tienen funciones distintas. El producto identifica
el diseño de la taza; el ID de stock identifica el registro de disponibilidad. En
este ejercicio, inicializa tú mismo un registro de stock por producto; el comando
no impone unicidad de producto.

Desde la raíz del proyecto, crea los directorios de módulos:

```sh
mkdir -p src/Shop/Stock/Commands src/Shop/Stock/Events src/Shop/Stock/Queries
```

## Da a cada hecho un archivo enfocado

La inicialización registra el producto y la cantidad inicial. La reserva registra
una cantidad comprometida con un carrito. Juntos forman el tipo de eventos del
dominio Stock en `src/Shop/Stock/Event.hs`:

```haskell
data StockEvent
  = StockInitialized StockInitialized.Event
  | StockReserved StockReserved.Event
```

El marcador de eventos gestiona las instancias estándar:

```haskell
deriveEvent ''StockEvent
```

Cada carga vive por separado en `Events/`. `Event.hs` enumera los hechos posibles e
identifica a qué stream de stock afecta cada uno.

## Aplica el historial aceptado

La entidad contiene la disponibilidad actual. Aplicar una reserva mueve su
cantidad entre los dos recuentos:

```haskell
  StockReserved reservation ->
    stock
      { available = stock.available - reservation.quantity
      , reserved = stock.reserved + reservation.quantity
      }
```

Esa actualización pertenece a `Entity.hs`. No pregunta al almacén actual si la
reserva aceptada ayer era razonable. El comando valida la solicitud antes de que se
convierta en un hecho.

Como ocurre con Cart, `Core.hs` solo vuelve a exportar los tipos y operaciones del
dominio. Añadir un comando no lo convierte en un archivo de implementación enorme.

## Inicializa el stock, incluido el cero

En `src/Shop/Stock/Commands/InitializeStock.hs`, `InitializeStock` tiene dos
campos de entrada:

```haskell
data InitializeStock = InitializeStock
  { productId :: Uuid
  , available :: Int
  }
```

El comando genera un ID de stock y rechaza una cantidad inicial negativa. Se permite
cero: un producto puede tener un registro de stock aunque ya no quede nada
disponible. Cuando sus declaraciones de decisión, entidad y transporte están
listas, su marcador las conecta:

```haskell
deriveCommand ''InitializeStock
```

## Protege una reserva

`ReserveStock` comprueba la existencia, una cantidad positiva y la disponibilidad.
Su decisión final en `src/Shop/Stock/Commands/ReserveStock.hs` compara la solicitud
con el estado actual:

```haskell
  if request.quantity > stock.available
    then Decider.reject "Insufficient stock available!"
    else Decider.acceptExisting
      [StockReserved (StockReserved.Event {entityId = stock.stockId, quantity = request.quantity, cartId = request.cartId})]
```

Este comando usa `InternalTransport`. Está pensado para el trabajo de la
aplicación; no lo expondremos como endpoint HTTP de cliente. La lección de
integración proporcionará su disparador.

La [lección de testing](/es/build/testing/) llama directamente a esta decisión.
Puedes establecer la regla de la última unidad antes de que la invoque ninguna
automatización.

## Presenta el resultado y registra el dominio

`StockLevel` proporciona una vista del producto, la disponibilidad y la cantidad
reservada. Su política pública actual sirve para esta práctica local; reconsidera
qué debería revelar un catálogo real.

Añade estos pasos a la canalización de aplicación existente, conservando Cart y
cualquier otro registro:

```haskell
  |> Application.withService Stock.service
  |> Application.withQuery @StockLevel
```

## Decide qué prometerá el checkout

Incluso después de conectar los dominios, una adición al carrito puede aceptarse
mientras su reserva posterior sea rechazada. Un checkout necesita un resultado de
reserva observable y una respuesta al fallo parcial. Diseña las promesas siguientes
como slices adicionales:

| Promesa | Decisión que aún falta |
| --- | --- |
| Se reservó el stock | ¿Cómo se entera Cart de si la reserva tuvo éxito? |
| Se aceptó un pedido | ¿Qué precios, cantidades, divisa y detalles de entrega quedan fijados? |
| Se confirmó el pago | ¿Qué evidencia del proveedor establece el pago, incluidas respuestas tardías o duplicadas? |
| Caducó una reserva | ¿Qué hecho la libera y cómo interactúa la caducidad con el pago? |

Son políticas de la aplicación, no consecuencias de llamar Stock o Cart a un dominio.

## Ensambla el punto de control de Stock

Cuando las decisiones estén claras, crea los directorios con el comando anterior y
añade o sustituye los archivos siguientes en el mismo proyecto `mug-shop`.
Conserva los archivos de Cart y `tests/Spec.hs` que ya tienes. Este punto de control
mantiene el almacén local no persistente de la primera lección del carrito; si has
añadido autenticación u otra política de transporte, integra los pasos de servicio
y consulta de Stock en tu canalización `app` existente.

<!-- complete-file -->
```haskell title="src/Shop/Stock/Events/StockInitialized.hs"
module Shop.Stock.Events.StockInitialized (Event (..)) where

import Core

data Event = Event
  { entityId :: Uuid
  , productId :: Uuid
  , available :: Int
  }
  deriving (Eq)

deriveEvent ''Event
```

<!-- complete-file -->
```haskell title="src/Shop/Stock/Events/StockReserved.hs"
module Shop.Stock.Events.StockReserved (Event (..)) where

import Core

data Event = Event
  { entityId :: Uuid
  , quantity :: Int
  , cartId :: Uuid
  }
  deriving (Eq)

deriveEvent ''Event
```

<!-- complete-file -->
```haskell title="src/Shop/Stock/Event.hs"
module Shop.Stock.Event (StockEvent (..), getEventEntityId) where

import Core
import Shop.Stock.Events.StockInitialized qualified as StockInitialized
import Shop.Stock.Events.StockReserved qualified as StockReserved

data StockEvent
  = StockInitialized StockInitialized.Event
  | StockReserved StockReserved.Event
  deriving (Eq)

getEventEntityId :: StockEvent -> Uuid
getEventEntityId change = case change of
  StockInitialized fact -> fact.entityId
  StockReserved fact -> fact.entityId

deriveEvent ''StockEvent
```

<!-- complete-file -->
```haskell title="src/Shop/Stock/Entity.hs"
module Shop.Stock.Entity (StockEntity (..), initialState, update) where

import Core
import Shop.Stock.Event (StockEvent (..), getEventEntityId)
import Shop.Stock.Events.StockInitialized qualified as StockInitialized
import Shop.Stock.Events.StockReserved qualified as StockReserved
import Uuid qualified

data StockEntity = StockEntity
  { stockId :: Uuid
  , productId :: Uuid
  , available :: Int
  , reserved :: Int
  }

initialState :: StockEntity
initialState = StockEntity {stockId = Uuid.nil, productId = Uuid.nil, available = 0, reserved = 0}

update :: StockEvent -> StockEntity -> StockEntity
update change stock = case change of
  StockInitialized initialized ->
    StockEntity
      { stockId = initialized.entityId
      , productId = initialized.productId
      , available = initialized.available
      , reserved = 0
      }
  StockReserved reservation ->
    stock
      { available = stock.available - reservation.quantity
      , reserved = stock.reserved + reservation.quantity
      }

deriveEntity ''StockEntity ''StockEvent
```

<!-- complete-file -->
```haskell title="src/Shop/Stock/Core.hs"
module Shop.Stock.Core (
  module Shop.Stock.Entity,
  module Shop.Stock.Event,
) where

import Shop.Stock.Entity
import Shop.Stock.Event
```

<!-- complete-file -->
```haskell title="src/Shop/Stock/Commands/InitializeStock.hs"
module Shop.Stock.Commands.InitializeStock (
  InitializeStock (..),
  getEntityId,
  decide,
) where

import Core
import Shop.Stock.Events.StockInitialized qualified as StockInitialized
import Decider qualified
import Service.Auth (RequestContext)
import Service.Command.Core (TransportsOf)
import Service.Transport.Web (WebTransport)
import Shop.Stock.Core

data InitializeStock = InitializeStock
  { productId :: Uuid
  , available :: Int
  }

getEntityId :: InitializeStock -> Maybe Uuid
getEntityId _ = Nothing

decide :: InitializeStock -> Maybe StockEntity -> RequestContext -> Decision StockEvent
decide request existing _context = case existing of
  Just _ -> Decider.reject "Stock already initialized for this product!"
  Nothing -> initialize request

initialize :: InitializeStock -> Decision StockEvent
initialize request =
  if request.available < 0
    then Decider.reject "Available stock cannot be negative"
    else do
      stockId <- Decider.generateUuid
      Decider.acceptNew
        [StockInitialized (StockInitialized.Event {entityId = stockId, productId = request.productId, available = request.available})]

type instance EntityOf InitializeStock = StockEntity

type instance TransportsOf InitializeStock = '[WebTransport]

deriveCommand ''InitializeStock
```

<!-- complete-file -->
```haskell title="src/Shop/Stock/Commands/ReserveStock.hs"
module Shop.Stock.Commands.ReserveStock (
  ReserveStock (..),
  getEntityId,
  decide,
) where

import Core
import Shop.Stock.Events.StockReserved qualified as StockReserved
import Decider qualified
import Service.Auth (RequestContext)
import Service.Command.Core (TransportsOf)
import Service.Transport.Internal (InternalTransport)
import Shop.Stock.Core

-- | Command to reserve stock for a cart.
-- Keep reservation internal; the integration lesson supplies its trigger.
data ReserveStock = ReserveStock
  { stockId :: Uuid
  , quantity :: Int
  , cartId :: Uuid
  }

getEntityId :: ReserveStock -> Maybe Uuid
getEntityId cmd = Just cmd.stockId

decide :: ReserveStock -> Maybe StockEntity -> RequestContext -> Decision StockEvent
decide request existing _context = case existing of
  Nothing -> Decider.reject "Stock not found!"
  Just stock -> reservePositiveQuantity request stock

reservePositiveQuantity :: ReserveStock -> StockEntity -> Decision StockEvent
reservePositiveQuantity request stock =
  if request.quantity <= 0
    then Decider.reject "Quantity must be positive"
    else reserveAvailableStock request stock

reserveAvailableStock :: ReserveStock -> StockEntity -> Decision StockEvent
reserveAvailableStock request stock =
  if request.quantity > stock.available
    then Decider.reject "Insufficient stock available!"
    else Decider.acceptExisting
      [StockReserved (StockReserved.Event {entityId = stock.stockId, quantity = request.quantity, cartId = request.cartId})]

type instance EntityOf ReserveStock = StockEntity

type instance TransportsOf ReserveStock = '[InternalTransport]

deriveCommand ''ReserveStock
```

<!-- complete-file -->
```haskell title="src/Shop/Stock/Queries/StockLevel.hs"
module Shop.Stock.Queries.StockLevel (
  StockLevel (..),
  canAccess,
  canView,
) where

import Core
import Service.AccessControl (AccessError, UserClaims)
import Service.AccessControl qualified as AccessControl
import Shop.Stock.Core (StockEntity (..))

data StockLevel = StockLevel
  { stockLevelId :: Uuid
  , productId :: Uuid
  , available :: Int
  , reserved :: Int
  }

-- | Authorization: Anyone can access stock levels (public catalog data)
canAccess :: Maybe UserClaims -> Maybe AccessError
canAccess claims = AccessControl.publicAccess claims

-- | Authorization: Anyone can view any stock level
canView :: Maybe UserClaims -> StockLevel -> Maybe AccessError
canView claims stockLevel = AccessControl.publicView claims stockLevel

-- | Use TH to derive Query instances.
-- Wires canAccess -> canAccessImpl, canView -> canViewImpl
deriveQuery ''StockLevel [''StockEntity]

instance QueryOf StockEntity StockLevel where
  queryId stock = stock.stockId

  combine stock _maybeExisting =
    Update
      StockLevel
        { stockLevelId = stock.stockId
        , productId = stock.productId
        , available = stock.available
        , reserved = stock.reserved
        }
```

<!-- complete-file -->
```haskell title="src/Shop/Stock/Service.hs"
module Shop.Stock.Service (
  service,
) where

import Core
import Service qualified
import Shop.Stock.Commands.InitializeStock (InitializeStock)
import Shop.Stock.Commands.ReserveStock (ReserveStock)
import Shop.Stock.Core ()

service :: Service _ _
service =
  Service.new
    |> Service.command @InitializeStock
    |> Service.command @ReserveStock
```

Si has completado las lecciones de Cart y configuración, `src/App.hs` debería
contener los registros del servicio y la consulta de Stock que aparecen aquí. Crea
o sustituye solo la canalización si tu aplicación no tiene políticas adicionales;
de lo contrario, añade los dos últimos pasos conservando el almacén, transporte y
registros de Cart existentes.

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

## Crea e inspecciona el stock

Ahora ejecuta el punto de control desde la raíz del proyecto:

```sh
neo build
neo run
```

Crea un registro de stock:

```sh
curl -i http://localhost:8080/commands/initialize-stock \
  -H 'Content-Type: application/json' \
  --data '{"productId":"11111111-1111-1111-1111-111111111111","available":3}'
```

Conserva el `entityId` devuelto como ID de stock. Lee su vista:

```sh
curl --get http://localhost:8080/queries/stock-level \
  --data-urlencode 'q=.stockLevelId == "YOUR-STOCK-UUID"'
```

Cuando la proyección se actualice, espera tres unidades disponibles y cero
reservadas. Crea un carrito y envía `AddItem` con este ID de stock y cantidad dos.
El carrito debe tener una entrada. **El stock todavía tiene tres disponibles y cero
reservadas**: hemos implementado ambas decisiones, pero no las hemos conectado.

Esa observación es evidencia. Dos servicios registrados no implican que uno llame al
otro. En [conectar pasos de la aplicación](/es/connect/workflows/) añadirás la conexión y comprobarás el cambio a una unidad disponible y dos reservadas.

## Conserva una comprobación de stock repetible

Guarda el escenario HTTP siguiente como `tests/scenarios/stock-flow.hurl`. Crea su
propio registro, espera su vista y comprueba el rechazo de una cantidad inicial
negativa. Detén `neo run` antes de ejecutar `neo test`.

<details>
<summary>Archivo completo: tests/scenarios/stock-flow.hurl</summary>

<!-- complete-file -->
```hurl title="tests/scenarios/stock-flow.hurl"
POST http://localhost:8080/commands/initialize-stock
Content-Type: application/json
{"productId":"11111111-1111-1111-1111-111111111111","available":3}

HTTP 200
[Captures]
stock_id: jsonpath "$.entityId"

GET http://localhost:8080/queries/stock-level
[Options]
retry: 10
retry-interval: 200

HTTP 200
[Asserts]
jsonpath "$.items[?(@.stockLevelId == '{{stock_id}}')].available" nth 0 == 3
jsonpath "$.items[?(@.stockLevelId == '{{stock_id}}')].reserved" nth 0 == 0

POST http://localhost:8080/commands/initialize-stock
Content-Type: application/json
{"productId":"22222222-2222-2222-2222-222222222222","available":-1}

HTTP 400
[Asserts]
jsonpath "$.reason" == "Available stock cannot be negative"
```

</details>

Ejecuta `neo test` desde la raíz del proyecto. El ID de stock capturado por el
escenario mantiene la comprobación independiente de ejecuciones anteriores, y su
reintento de consulta permite que la proyección se actualice. Esta página todavía
no conecta `AddItem` con `ReserveStock`; ese disparador interno se enseña en [Connect](/es/connect/workflows/).

## Ejercicio: la última taza

Tu agente dice que una solicitud de carrito correcta demuestra que la última taza
pertenece al cliente. Identifica la evidencia que falta.

<details>
<summary>Razonamiento y comprobaciones sugeridos</summary>

La solicitud del carrito establece una selección. Comprueba la decisión de reserva y
su resultado registrado. Reserva dos de tres, rechaza cuatro de tres y acepta
exactamente tres. Las solicitudes que compiten por la última unidad necesitan una
comprobación concurrente a nivel de aplicación. Las solicitudes repetidas necesitan
una política deliberada de duplicados; el comando actual puede reservar otra vez
cuando queda stock suficiente.

</details>

Siguiente: [HTTP y frontends](/es/build/http-and-frontend/) convierte estos resultados en una interfaz honesta.
