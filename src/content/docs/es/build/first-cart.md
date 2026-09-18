---
title: "Tu primer slice funcional"
description: Dale a tu propio proyecto una solicitud, un hecho registrado y una respuesta útil.
sidebar:
  order: 1
---
<!-- translation-source-sha256: ee9faef1c553e39b9740cb67730af2c3f85b251152a601d0d4ff137b366cae87 -->

El slice más pequeño de aplicación que resulta útil conecta la solicitud de una
persona con algo que puede observar. Aquí construirás ese slice en **tu propio
proyecto `mug-shop`**: aceptar «crear un carrito», recordar que ocurrió y mostrar
un resumen de carrito vacío.

El carrito es nuestro ejemplo de práctica. La misma forma puede iniciar una
reserva o una revisión de documento. Tú decides qué significa la acción;
NeoHaskell conecta la solicitud, el historial, el estado y la vista.

Ensamblaremos el slice una responsabilidad cada vez. Cada sección explica la idea
antes de mostrar una pieza enfocada. Después, cuando todas las decisiones estén
claras, la página te proporciona cada archivo fuente de la aplicación en su
destino real. Puedes crear el proyecto a mano sin descargar un archivo ni adivinar
qué definiciones e imports faltan.

## Empieza en tu propio proyecto

Completa primero [comenzando](/es/getting-started/). Esa página ya creó `mug-shop`
con `neo new mug-shop`. Abre un terminal en ese proyecto existente:

```sh
cd mug-shop
```

Todas las rutas de esta página son relativas al directorio `mug-shop`. Conserva su
`neo.json`, su lanzador y su configuración de build generada. `neo` proporciona la
configuración del compilador del proyecto; los archivos de aplicación no necesitan
pragmas de lenguaje.

El proyecto generado contiene un ejemplo Counter. Elimina o mueve esos archivos de
aplicación proporcionados antes de crear los archivos de Cart:

```sh
rm -r src/Starter tests/Decider/Counter
rm tests/Property/CounterReplaySpec.hs
rm tests/scenarios/counter-flow.hurl tests/integration/smoke.hurl
mkdir -p src/Shop/Cart/Commands src/Shop/Cart/Events src/Shop/Cart/Queries
```

Conserva `tests/Spec.hs`; la [lección de testing](/es/build/testing/) añade los
archivos de tests de Cart. Los archivos fuente de abajo son el primer slice
completo. Sustituyen `src/App.hs` y crean los archivos bajo `src/Shop/Cart/`.
`neo build` descubre esos archivos fuente; no tienes que mantener una lista de
módulos separada.

El módulo del framework llamado `Core` y la pequeña fachada de dominio llamada
`Shop.Cart.Core` tienen funciones distintas. Los archivos que usan tipos del
framework importan `Core`. `Shop.Cart.Core` vuelve a exportar los tipos de entidad
y evento de Cart para que los comandos y consultas de Cart puedan compartir un
import orientado al dominio.

## 1. Nombra el hecho que quieres recordar

Empieza por el hecho aceptado, porque es la respuesta duradera a «¿qué ocurrió?».
El hecho es **que se creó un carrito**. Necesita el identificador del carrito y un
identificador de propietario. Crea `src/Shop/Cart/Events/CartCreated.hs` y empieza
con esta declaración enfocada:

```haskell
data Event = Event
  { entityId :: Uuid
  , ownerId :: Text
  }
```

Los campos son la información que da significado al hecho cuando se lea después.
El marcador indica a NeoHaskell que proporcione la compatibilidad rutinaria del
evento:

```haskell
deriveEvent ''Event
```

La declaración dice qué significa el evento; el marcador proporciona las instancias
mecánicas y el cableado de eventos. El archivo completo aparece más abajo, después
de haber situado el evento en el modelo de Cart.

## 2. Da al evento Cart un lugar y una ruta

Crea `src/Shop/Cart/Event.hs`. El tipo de evento de dominio enumera los hechos que
pueden cambiar un carrito. En este primer hito tiene un constructor:

```haskell
data CartEvent
  = CartCreated CartCreated.Event
```

`CartCreated.Event` es la carga del archivo anterior. `CartCreated` es el
constructor del vocabulario de eventos de Cart. El helper de enrutamiento devuelve
el identificador del stream del hecho:

```haskell
getEventEntityId :: CartEvent -> Uuid
getEventEntityId change = case change of
  CartCreated fact -> fact.entityId
```

Conserva `getEventEntityId` en el módulo de eventos. El archivo de entidad lo
importa antes de su marcador `deriveEntity`, para que la reproducción pueda
asociar cada hecho con el Cart que cambia. El marcador `deriveEvent` debe ir
después de estas declaraciones.

## 3. Convierte el hecho en estado actual

Una entidad es el estado empresarial actual reconstruido a partir de sus eventos
aceptados. Crea `src/Shop/Cart/Entity.hs`. Para el primer slice, un Cart solo
necesita un identificador y un propietario:

```haskell
data CartEntity = CartEntity
  { cartId :: Uuid
  , ownerId :: Text
  }
```

La reconstrucción empieza con un identificador nil y un propietario vacío, y después
aplica el hecho de creación:

```haskell
initialState :: CartEntity
initialState = CartEntity {cartId = Uuid.nil, ownerId = ""}

update :: CartEvent -> CartEntity -> CartEntity
update change _cart = case change of
  CartCreated created ->
    CartEntity {cartId = created.entityId, ownerId = created.ownerId}
```

El valor nil inicial es un punto de partida para la reproducción. No demuestra que
exista un Cart real; un `CartCreated` aceptado establece esa identidad. Coloca
`initialState` y `update` antes de `deriveEntity ''CartEntity ''CartEvent`. Tú
proporcionas este comportamiento de negocio; `deriveEntity` lo conecta con la
reproducción, JSON, el estado predeterminado y el enrutamiento de eventos del
framework.

## 4. Acepta la solicitud de la persona

`CreateCart` es un comando: una solicitud que hace alguien. No tiene campos de
entrada porque esta aplicación genera la identidad del Cart. Crea
`src/Shop/Cart/Commands/CreateCart.hs`.

La decisión rechaza primero un stream que ya tiene estado y luego delega la creación:

```haskell
decide :: CreateCart -> Maybe CartEntity -> RequestContext -> Decision CartEvent
decide _ existing context = case existing of
  Just _ -> Decider.reject "Cart already exists!"
  Nothing -> createCart context
```

El helper genera un UUID de Cart y registra `CartCreated`. Cuando no hay una
identidad con sesión iniciada, este ejercicio local genera un identificador de
propietario anónimo. Esa etiqueta en el historial no establece una sesión de
navegador ni demuestra que una persona futura sea propietaria del Cart; [control de
acceso](/es/build/access-control/) hace explícita esa política después.

El comando también declara qué entidad y transporte usa. Su marcador procede del
import `Core` orientado al framework:

```haskell
type instance EntityOf CreateCart = CartEntity
type instance TransportsOf CreateCart = '[WebTransport]

deriveCommand ''CreateCart
```

El archivo de comando completo incluye la generación del UUID y ambas ramas de
decisión.

## 5. Responde a la pregunta de la pantalla

Una pantalla necesita una respuesta útil, no todo el historial interno de eventos.
Define un `CartSummary` en `src/Shop/Cart/Queries/CartSummary.hs` con la pregunta
que plantea la primera pantalla:

```haskell
data CartSummary = CartSummary
  { cartSummaryId :: Uuid
  , ownerId :: Text
  , itemCount :: Int
  , isEmpty :: Bool
  }
```

En este hito todos los Cart están vacíos, así que la primera proyección de la
consulta establece intencionadamente `count` en cero:

```haskell
    let count = 0
    Update CartSummary
      { cartSummaryId = cart.cartId
      , ownerId = cart.ownerId
      , itemCount = count
      , isEmpty = count == 0
      }
```

Este es un modelo de lectura. No decide si se puede crear un Cart. Su política de
acceso público es deliberada para esta práctica local; los datos privados de una
aplicación necesitan otra política y otros tests. El marcador de consulta conecta
la vista con la entidad que lee:

```haskell
deriveQuery ''CartSummary [''CartEntity]
```

El archivo de consulta completo mantiene el marcador antes de su instancia
`QueryOf`, porque la instancia usa la compatibilidad `Query` que genera el marcador.

## 6. Haz accesibles las piezas

El servicio es el registro de comandos de Cart. Crea `src/Shop/Cart/Service.hs` y
registra `CreateCart`:

```haskell
service :: Service _ _
service = Service.new
  |> Service.command @CreateCart
```

Sustituye el `src/App.hs` generado para que la aplicación seleccione su almacén de
eventos, transporte web, servicio Cart y consulta Cart:

```haskell
app :: Application
app = Application.new
  |> Application.withEventStore @() (\_ -> SimpleEventStore
    { basePath = Path.fromText ".neo/events" |> Maybe.getOrDie
    , persistent = False
    })
  |> Application.withTransport WebTransport.server
  |> Application.withService Cart.service
  |> Application.withQuery @CartSummary
```

El `App.hs` completo de abajo proporciona la configuración de `eventStore`. Usa
`persistent = False`, por lo que reiniciar borra el historial de este ejercicio.
[Configuración](/es/build/configuration/) y [persistencia](/es/operate/persistence/) convierten después el almacenamiento en una elección explícita.

## Crea los archivos completos del primer slice

Los bloques siguientes son archivos ensamblados, no fragmentos didácticos. Cada
título es la ruta que debes crear o sustituir desde la raíz del proyecto `mug-shop`.
Copia cada bloque tal como está escrito.

Los archivos de eventos completos incluyen `deriving (Eq)` porque los ejemplos de
decisión comparan los valores de las cargas registradas. Esa compatibilidad de
igualdad es independiente del marcador de eventos; `deriveEvent` sigue siendo el
helper canónico para las instancias de eventos generadas por el framework.

### `src/App.hs` — sustituir la aplicación generada

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

app :: Application
app = Application.new
  |> Application.withEventStore @() (\_ -> SimpleEventStore
    { basePath = Path.fromText ".neo/events" |> Maybe.getOrDie
    , persistent = False
    })
  |> Application.withTransport WebTransport.server
  |> Application.withService Cart.service
  |> Application.withQuery @CartSummary
```

### `src/Shop/Cart/Events/CartCreated.hs` — crear

<!-- complete-file -->
```haskell title="src/Shop/Cart/Events/CartCreated.hs"
module Shop.Cart.Events.CartCreated (Event (..)) where

import Core

data Event = Event
  { entityId :: Uuid
  , ownerId :: Text
  }
  deriving (Eq)

deriveEvent ''Event
```

### `src/Shop/Cart/Event.hs` — crear

<!-- complete-file -->
```haskell title="src/Shop/Cart/Event.hs"
module Shop.Cart.Event (CartEvent (..), getEventEntityId) where

import Core
import Shop.Cart.Events.CartCreated qualified as CartCreated

data CartEvent
  = CartCreated CartCreated.Event
  deriving (Eq)

getEventEntityId :: CartEvent -> Uuid
getEventEntityId change = case change of
  CartCreated fact -> fact.entityId

deriveEvent ''CartEvent
```

### `src/Shop/Cart/Entity.hs` — crear

<!-- complete-file -->
```haskell title="src/Shop/Cart/Entity.hs"
module Shop.Cart.Entity (CartEntity (..), initialState, update) where

import Core
import Shop.Cart.Event (CartEvent (..), getEventEntityId)
import Shop.Cart.Events.CartCreated qualified as CartCreated
import Uuid qualified

data CartEntity = CartEntity
  { cartId :: Uuid
  , ownerId :: Text
  }

initialState :: CartEntity
initialState = CartEntity {cartId = Uuid.nil, ownerId = ""}

update :: CartEvent -> CartEntity -> CartEntity
update change _cart = case change of
  CartCreated created ->
    CartEntity {cartId = created.entityId, ownerId = created.ownerId}

deriveEntity ''CartEntity ''CartEvent
```

### `src/Shop/Cart/Core.hs` — crear la fachada de dominio

<!-- complete-file -->
```haskell title="src/Shop/Cart/Core.hs"
module Shop.Cart.Core (
  module Shop.Cart.Entity,
  module Shop.Cart.Event,
) where

import Shop.Cart.Entity
import Shop.Cart.Event
```

### `src/Shop/Cart/Commands/CreateCart.hs` — crear

<!-- complete-file -->
```haskell title="src/Shop/Cart/Commands/CreateCart.hs"
module Shop.Cart.Commands.CreateCart (CreateCart (..), getEntityId, decide) where

import Core
import Shop.Cart.Events.CartCreated qualified as CartCreated
import Decider qualified
import Service.Auth (RequestContext (..), UserClaims (..))
import Service.Command.Core (TransportsOf)
import Service.Transport.Web (WebTransport)
import Shop.Cart.Core (CartEntity (..), CartEvent (..))
import Uuid qualified

data CreateCart = CreateCart

getEntityId :: CreateCart -> Maybe Uuid
getEntityId _ = Nothing

decide :: CreateCart -> Maybe CartEntity -> RequestContext -> Decision CartEvent
decide _ existing context = case existing of
  Just _ -> Decider.reject "Cart already exists!"
  Nothing -> createCart context

createCart :: RequestContext -> Decision CartEvent
createCart context = do
  cartId <- Decider.generateUuid
  case context.user of
    Just user ->
      Decider.acceptNew [CartCreated (CartCreated.Event {entityId = cartId, ownerId = user.sub})]
    Nothing -> do
      anonymousId <- Decider.generateUuid
      Decider.acceptNew [CartCreated (CartCreated.Event {entityId = cartId, ownerId = Uuid.toText anonymousId})]

type instance EntityOf CreateCart = CartEntity
type instance TransportsOf CreateCart = '[WebTransport]

deriveCommand ''CreateCart
```

### `src/Shop/Cart/Queries/CartSummary.hs` — crear

<!-- complete-file -->
```haskell title="src/Shop/Cart/Queries/CartSummary.hs"
module Shop.Cart.Queries.CartSummary (CartSummary (..), canAccess, canView) where

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
    let count = 0
    Update CartSummary
      { cartSummaryId = cart.cartId
      , ownerId = cart.ownerId
      , itemCount = count
      , isEmpty = count == 0
      }
```

### `src/Shop/Cart/Service.hs` — crear

<!-- complete-file -->
```haskell title="src/Shop/Cart/Service.hs"
module Shop.Cart.Service (service) where

import Core
import Service qualified
import Shop.Cart.Commands.CreateCart (CreateCart)

service :: Service _ _
service = Service.new
  |> Service.command @CreateCart
```

El [archivo del primer Cart](/examples/mug-shop-first-cart.tar.gz) sigue siendo un
punto de comparación conveniente, pero no es necesario para obtener estos archivos.
Los tests de ese archivo se introducen como evidencia escrita en la [lección de testing](/es/build/testing/).

## Constrúyelo y envía una solicitud

Desde la raíz del proyecto `mug-shop`:

```sh
neo build
neo run
```

En otro terminal, solicita un Cart:

```sh
curl -i http://localhost:8080/commands/create-cart \
  -H 'Content-Type: application/json' \
  --data '[]'
```

Espera HTTP 200 y un objeto JSON que contenga `entityId`. Conserva ese UUID. El
cuerpo `[]` es la codificación de este comando sin campos.

Lee la vista:

```sh
curl http://localhost:8080/queries/cart-summary
```

Busca la fila cuyo `cartSummaryId` coincida con tu `entityId`. Debe tener
`itemCount: 0` e `isEmpty: true`. La respuesta es una página que contiene `items`,
`total`, `hasMore` y `effectiveLimit`.

El modelo de lectura se actualiza de forma asíncrona. Repite brevemente la lectura
si tu fila todavía no ha aparecido. Volver a enviar el comando de creación crearía
otro Cart, no actualizaría el original.

## Conserva evidencia que puedas volver a ejecutar

La [lección de testing](/es/build/testing/) añade una especificación unitaria para el evento `CartCreated` aceptado y el rechazo de un Cart existente, además de un escenario HTTP que espera el resumen vacío. Hasta entonces, la compilación, la respuesta del servidor y la respuesta de la consulta anteriores son el primer punto de control ejecutable. El archivo opcional contiene esos fuentes de test públicos para compararlos.

Has creado un Cart, no un pedido aceptado. En el modelo no aparece ninguna promesa
de precio, pago o cumplimiento. Pide a tu agente que señale el hecho que respalda
cada afirmación propuesta.

## Prueba una variación

Crea dos Cart e identifica ambos resúmenes. Después envía JSON malformado, como un
cuerpo que contenga solo `{`. ¿Qué debería permanecer sin cambios después de esa
solicitud rechazada?

<details>
<summary>Razonamiento y comprobaciones sugeridos</summary>

Dos solicitudes correctas deben devolver IDs distintos y obtener resúmenes vacíos
separados. El JSON malformado debe producir un error de cliente sin una respuesta
de creación aceptada. Un Cart vacío es una entidad creada válida, distinta de un
Cart inexistente. Reiniciar esta aplicación no persistente inicia un ejercicio nuevo.

</details>

Siguiente: [explora tu Cart en el IDE visual](/es/getting-started/visual-ide/), ejecutando `neo ide` desde este mismo proyecto. Después [añade un comando nuevo](/es/build/commands-and-events/).
