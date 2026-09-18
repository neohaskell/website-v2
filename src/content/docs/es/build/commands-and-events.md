---
title: "Comandos y eventos"
description: Añade una acción de negocio manteniendo separados las solicitudes, los hechos aceptados y el estado.
sidebar:
  order: 2
---
<!-- translation-source-sha256: 104b60cec22bebd56f918af33bd935d5443f2466be9360c4352e624d560d94df -->

Una aplicación debe distinguir lo que alguien solicitó de lo que aceptó. Esa
distinción te da un lugar donde expresar reglas, explicar rechazos y cuestionar la
implementación de un agente.

Un **comando** nombra una intención. Un **evento** nombra un hecho aceptado. En tu
proyecto `mug-shop`, `AddItem` solicita una selección y una cantidad; `ItemAdded`
registra una adición que Cart aceptó. El [modelo de eventos](/es/start/event-modeling/) da a esos nombres un significado compartido.

Esta página continúa el Cart funcional de [tu primer slice funcional](/es/build/first-cart/). La primera página creó todos los archivos fuente necesarios para ejecutar ese slice. Aquí añadimos una acción creando o sustituyendo archivos concretos en el mismo proyecto. Los fragmentos centrados explican primero las decisiones; los archivos ensamblados que aparecen después contienen las cabeceras de módulo e imports reales.

## Elige la regla antes que los archivos

Desde la raíz del proyecto `mug-shop`, detén `neo run` mientras editas. Los
directorios `src/Shop/Cart/Commands`, `src/Shop/Cart/Events` y
`src/Shop/Cart/Queries` ya existen desde el primer slice. Si llegas directamente a
esta página, créalos con:

```sh
mkdir -p src/Shop/Cart/Commands src/Shop/Cart/Events src/Shop/Cart/Queries
```

Exigiremos un Cart existente y una cantidad positiva. Cada adición aceptada se
convierte en una entrada, incluso cuando se selecciona de nuevo el mismo stock.
La disponibilidad y la propiedad son políticas separadas que se tratan en [stock](/es/build/stock-and-checkout/) y [control de acceso](/es/build/access-control/). Esta acción registra una selección; no afirma que se haya reservado stock.

## 1. Da al hecho nuevo su propio lugar

Crea `src/Shop/Cart/Events/ItemAdded.hs`. Su carga conserva los identificadores y la
cantidad necesarios para explicar la adición aceptada:

```haskell
data Event = Event
  { entityId :: Uuid
  , stockId :: Uuid
  , quantity :: Int
  }
```

`entityId` mantiene el hecho en el stream de Cart. `stockId` identifica el registro
de stock seleccionado y `quantity` registra la entrada que pasó la regla del
comando. Deriva la compatibilidad estándar del evento de la carga con el helper
canónico:

```haskell
deriveEvent ''Event
```

Este es un archivo nuevo, por lo que su contenido completo aparece en el punto de
control ensamblado de abajo.

## 2. Amplía el vocabulario de eventos de Cart

El `src/Shop/Cart/Event.hs` del primer slice ya define `CartEvent` con
`CartCreated`. Sustituye esa declaración de eventos por la lista ampliada:

```haskell
data CartEvent
  = CartCreated CartCreated.Event
  | ItemAdded ItemAdded.Event
```

Edita la función `getEventEntityId` existente en el mismo archivo añadiendo el
caso nuevo:

```haskell
getEventEntityId change = case change of
  CartCreated fact -> fact.entityId
  ItemAdded fact -> fact.entityId
```

Conserva `deriveEvent ''CartEvent` después de estas declaraciones.
`ItemAdded.Event` es la carga; `ItemAdded` es su constructor en la lista de hechos
aceptados del dominio. El marcador proporciona la compatibilidad rutinaria de los
eventos, mientras que los nombres y campos siguen siendo tu modelo de negocio.

## 3. Conserva la selección en el estado de Cart

Crea `src/Shop/Cart/Item.hs` para el valor almacenado en cada entrada de Cart:

```haskell
data CartItem = CartItem {stockId :: Uuid, quantity :: Int}
```

El tipo de valor completo también proporciona las instancias JSON que necesita.
Ahora sustituye `src/Shop/Cart/Entity.hs` por la versión que añade un array
`items`. Su nueva rama de actualización añade una entrada:

```haskell
  ItemAdded added ->
    cart {items = cart.items |> Array.push (CartItem {stockId = added.stockId, quantity = added.quantity})}
```

La función de actualización aplica un hecho aceptado; no valida una solicitud ni
contacta con un proveedor. El comando de abajo solo admite cantidades positivas.
Cualquier otro productor de `ItemAdded` debe conservar ese invariante, porque la
reproducción trata el evento como un hecho aceptado.

La rama existente de `CartCreated` también debe inicializar `items` a
`Array.empty`. Conserva esa inicialización al sustituir el archivo.

## 4. Implementa la decisión

Crea `src/Shop/Cart/Commands/AddItem.hs`. La solicitud indica al ejecutor del
comando qué stream de Cart cargar:

```haskell
getEntityId :: AddItem -> Maybe Uuid
getEntityId request = Just request.cartId
```

La decisión rechaza un Cart inexistente y después comprueba la cantidad. Observa
que el evento conserva la entrada aceptada:

```haskell
decide request existing _context = case existing of
  Nothing -> Decider.reject "Cart not found!"
  Just cart -> addToCart request cart

addToCart request cart =
  if request.quantity <= 0
    then Decider.reject "Quantity must be positive"
    else Decider.acceptExisting
      [ItemAdded (ItemAdded.Event {entityId = cart.cartId, stockId = request.stockId, quantity = request.quantity})]
```

El `cartId` del comando se convierte en el `entityId` del evento; `stockId` es el
identificador del stock seleccionado, no un nombre de producto. Su declaración de
transporte expone la solicitud mediante el transporte web. El marcador del comando
genera el cableado rutinario a partir de las declaraciones de decisión, entidad y
transporte anteriores:

```haskell
type instance EntityOf AddItem = CartEntity
type instance TransportsOf AddItem = '[WebTransport]

deriveCommand ''AddItem
```

## 5. Registra la acción y actualiza la respuesta

Sustituye `src/Shop/Cart/Service.hs` por un registro que contenga ambos comandos.
La línea nueva va junto al registro existente de `CreateCart`:

```haskell
service = Service.new
  |> Service.command @CreateCart
  |> Service.command @AddItem
```

Sustituye `src/Shop/Cart/Queries/CartSummary.hs` para que su proyección cuente
las entradas actuales:

```haskell
  combine cart _previous = do
    let count = cart.items |> Array.length
    Update CartSummary
      { cartSummaryId = cart.cartId
      , ownerId = cart.ownerId
      , itemCount = count
      , isEmpty = count == 0
      }
```

Conserva `src/Shop/Cart/Core.hs` y `src/App.hs` del primer slice. La aplicación ya
registra el servicio y la consulta de Cart; cambiar el servicio y la proyección
hace que el comando nuevo sea accesible y visible. La [lección de consultas](/es/build/queries/) explica con más profundidad este modelo de lectura y su actualización asíncrona.

## Crea los archivos completos de adiciones de Cart

Los bloques siguientes son los archivos ensamblados para este punto de control.
Cada título es la ruta exacta relativa a la raíz del proyecto `mug-shop`. Crea los
archivos nuevos y sustituye los archivos indicados arriba.

### `src/Shop/Cart/Events/ItemAdded.hs` — crear

<!-- complete-file -->
```haskell title="src/Shop/Cart/Events/ItemAdded.hs"
module Shop.Cart.Events.ItemAdded (Event (..)) where

import Core

data Event = Event
  { entityId :: Uuid
  , stockId :: Uuid
  , quantity :: Int
  }
  deriving (Eq)

deriveEvent ''Event
```

### `src/Shop/Cart/Event.hs` — sustituir

<!-- complete-file -->
```haskell title="src/Shop/Cart/Event.hs"
module Shop.Cart.Event (CartEvent (..), getEventEntityId) where

import Core
import Shop.Cart.Events.CartCreated qualified as CartCreated
import Shop.Cart.Events.ItemAdded qualified as ItemAdded

data CartEvent
  = CartCreated CartCreated.Event
  | ItemAdded ItemAdded.Event
  deriving (Eq)

getEventEntityId :: CartEvent -> Uuid
getEventEntityId change = case change of
  CartCreated fact -> fact.entityId
  ItemAdded fact -> fact.entityId

deriveEvent ''CartEvent
```

### `src/Shop/Cart/Item.hs` — crear

<!-- complete-file -->
```haskell title="src/Shop/Cart/Item.hs"
module Shop.Cart.Item (CartItem (..)) where

import Core
import Json qualified

data CartItem = CartItem {stockId :: Uuid, quantity :: Int}
  deriving (Generic)

instance Json.FromJSON CartItem
instance Json.ToJSON CartItem
```

### `src/Shop/Cart/Entity.hs` — sustituir

<!-- complete-file -->
```haskell title="src/Shop/Cart/Entity.hs"
module Shop.Cart.Entity (CartEntity (..), initialState, update) where

import Core
import Shop.Cart.Event (CartEvent (..), getEventEntityId)
import Shop.Cart.Events.CartCreated qualified as CartCreated
import Uuid qualified
import Array qualified
import Shop.Cart.Item (CartItem (..))
import Shop.Cart.Events.ItemAdded qualified as ItemAdded

data CartEntity = CartEntity
  { cartId :: Uuid
  , ownerId :: Text
  , items :: Array CartItem
  }

initialState :: CartEntity
initialState = CartEntity {cartId = Uuid.nil, ownerId = "", items = Array.empty}

update :: CartEvent -> CartEntity -> CartEntity
update change cart = case change of
  CartCreated created ->
    CartEntity {cartId = created.entityId, ownerId = created.ownerId, items = Array.empty}
  ItemAdded added ->
    cart {items = cart.items |> Array.push (CartItem {stockId = added.stockId, quantity = added.quantity})}

deriveEntity ''CartEntity ''CartEvent
```

### `src/Shop/Cart/Commands/AddItem.hs` — crear

<!-- complete-file -->
```haskell title="src/Shop/Cart/Commands/AddItem.hs"
module Shop.Cart.Commands.AddItem (AddItem (..), getEntityId, decide) where

import Core
import Shop.Cart.Events.ItemAdded qualified as ItemAdded
import Decider qualified
import Service.Auth (RequestContext)
import Service.Command.Core (TransportsOf)
import Service.Transport.Web (WebTransport)
import Shop.Cart.Core (CartEntity (..), CartEvent (..))

data AddItem = AddItem {cartId :: Uuid, stockId :: Uuid, quantity :: Int}

getEntityId :: AddItem -> Maybe Uuid
getEntityId request = Just request.cartId

decide :: AddItem -> Maybe CartEntity -> RequestContext -> Decision CartEvent
decide request existing _context = case existing of
  Nothing -> Decider.reject "Cart not found!"
  Just cart -> addToCart request cart

addToCart :: AddItem -> CartEntity -> Decision CartEvent
addToCart request cart =
  if request.quantity <= 0
    then Decider.reject "Quantity must be positive"
    else Decider.acceptExisting
      [ItemAdded (ItemAdded.Event {entityId = cart.cartId, stockId = request.stockId, quantity = request.quantity})]

type instance EntityOf AddItem = CartEntity
type instance TransportsOf AddItem = '[WebTransport]

deriveCommand ''AddItem
```

### `src/Shop/Cart/Queries/CartSummary.hs` — sustituir

<!-- complete-file -->
```haskell title="src/Shop/Cart/Queries/CartSummary.hs"
module Shop.Cart.Queries.CartSummary (CartSummary (..), canAccess, canView) where

import Array qualified
import Core
import Service.AccessControl (AccessError, UserClaims)
import Service.AccessControl qualified as AccessControl
import Shop.Cart.Core (CartEntity (..))

data CartSummary = CartSummary
  { cartSummaryId :: Uuid
  , ownerId :: Text
  , itemCount :: Int
  , isEmpty :: Bool
  }

canAccess :: Maybe UserClaims -> Maybe AccessError
canAccess = AccessControl.publicAccess

canView :: Maybe UserClaims -> CartSummary -> Maybe AccessError
canView = AccessControl.publicView

deriveQuery ''CartSummary [''CartEntity]

instance QueryOf CartEntity CartSummary where
  queryId cart = cart.cartId
  combine cart _previous = do
    let count = cart.items |> Array.length
    Update CartSummary
      { cartSummaryId = cart.cartId
      , ownerId = cart.ownerId
      , itemCount = count
      , isEmpty = count == 0
      }
```

### `src/Shop/Cart/Service.hs` — sustituir

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

El `src/App.hs` del primer slice, `src/Shop/Cart/Core.hs`, `CreateCart.hs` y
`Events/CartCreated.hs` permanecen en su sitio. El [archivo de adiciones de carrito](/examples/mug-shop-cart.tar.gz) es un punto de comparación conveniente; esta página contiene los archivos necesarios para la adición implementada.

## Comprueba el comportamiento nuevo

Desde la raíz del proyecto `mug-shop`:

```sh
neo build
neo run
```

Crea un Cart con la solicitud de [tu primer slice funcional](/es/build/first-cart/) y después sustituye `YOUR-CART-UUID` abajo. El UUID fijo de stock es una selección ilustrativa hasta que la lección de Stock cree su registro real.

```sh
curl -i http://localhost:8080/commands/add-item \
  -H 'Content-Type: application/json' \
  --data '{"cartId":"YOUR-CART-UUID","stockId":"11111111-1111-1111-1111-111111111111","quantity":2}'
```

Espera la aceptación y después un resumen con una entrada e `isEmpty: false`. Una
entrada contiene dos unidades. Envía cantidad cero: espera HTTP 400 con
`reason: "Quantity must be positive"`, mientras el recuento aceptado sigue siendo
uno.

La declaración de transporte, el registro del servicio y el registro de la
aplicación exponen juntos `/commands/add-item`. Un tipo situado en un archivo aún
no es una funcionalidad accesible. El modelo de lectura puede tardar un momento en
actualizarse; vuelve a consultar en lugar de enviar la adición dos veces.

## Ejercicio: un límite por Cart

Elige un límite de seis tazas **por Cart**. Tu agente rechaza las solicitudes por
encima de seis y dice que el trabajo está completo. ¿Qué caso ha pasado por alto?

<details>
<summary>Razonamiento y evidencia sugeridos</summary>

Dos adiciones de cuatro superan esa comprobación, pero suman ocho. Especifica si el
límite cubre un producto o todos los productos y compara las cantidades existentes
más la solicitud. Comprueba una adición normal, exactamente seis, más de seis y
otra adición después de llegar a seis. Una operación rechazada no debe producir un
`ItemAdded` correcto. Es una ampliación que diseñas tú, no una regla que ya esté en
estos archivos.

</details>

Siguiente: [entidades y estado](/es/build/entities-and-state/) explica cómo los hechos aceptados informan la siguiente decisión.
