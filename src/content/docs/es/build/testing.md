---
title: "Comprueba el comportamiento"
description: Escribe comprobaciones para las decisiones, el estado reconstruido y el comportamiento HTTP de tu propio proyecto.
sidebar:
  order: 7
---
<!-- translation-source-sha256: 69e400893ac5fa78dc7f5610ae62af95ffec32b6f77f5a956175b82183e26e13 -->

«El código compila» y «esta solicitud respeta la regla prevista» son afirmaciones
distintas. La confianza crece cuando compruebas cada promesa en el lugar donde
podría fallar. Un test rápido de decisión explica un rechazo; un test HTTP comprueba
que la aplicación en ejecución expone realmente el comportamiento prometido.

Tú eres dueño de los resultados previstos. Tu agente puede ayudar a implementar
comprobaciones, ejecutarlas y explicar un fallo. Conserva ejemplos que puedas
reconocer: dos unidades aceptadas, cero rechazadas y una unidad aceptada en el
límite.

Todos los archivos de abajo pertenecen al proyecto `mug-shop` que has estado
construyendo. Conserva su `tests/Spec.hs` generado; la CLI descubre los tests y los
ejecuta con `neo test`.

Los ejemplos siguientes muestran las declaraciones y el comportamiento
pertinentes, con cada destino identificado. Los fragmentos enfocados hacen visible
el límite que se prueba. Los módulos de test completos que aparecen más adelante
incluyen sus imports y helpers, para que puedas crearlos directamente en el mismo
proyecto. El [final completo de los archivos de Build](/examples/mug-shop-build.tar.gz) es complementario.

## Ajusta la comprobación a la promesa

| Pregunta | Límite útil |
| --- | --- |
| ¿Se rechaza la cantidad cero? | La decisión del comando. |
| ¿La reproducción conserva adiciones separadas? | La actualización de la entidad. |
| ¿Devuelve una solicitud la respuesta y la vista prometidas? | La aplicación HTTP en ejecución. |
| ¿Añadir algo al carrito reserva stock? | La integración y ambos dominios; se añade en [Connect](/es/connect/workflows/). |
| ¿Acepta el proveedor la solicitud real? | Su sandbox o una comprobación controlada en vivo. |

Una respuesta falsa del proveedor proporciona un test local determinista. No puede
demostrar que tu cuenta, tus credenciales o tu solicitud real sean aceptadas.

## Prueba una decisión directamente

En `tests/Decider/Cart/AddItemSpec.hs`, un test comprueba el hecho aceptado
completo. Su cuerpo usa UUID fijos y distintos para el carrito y el stock:

```haskell
    let cart = CartEntity {cartId = cartIdFixture, ownerId = "owner", items = Array.empty}
    let request = AddItem {cartId = cartIdFixture, stockId = stockIdFixture, quantity = 2}
    result <- runDecision (decide request (Just cart) Auth.emptyContext)
    result |> shouldBe (AcceptCommand ExistingStream
      [ItemAdded (ItemAdded.Event {entityId = cartIdFixture, stockId = stockIdFixture, quantity = 2})])
```

Los archivos completos de eventos incluyen compatibilidad de igualdad para estas
afirmaciones de carga completa. Es independiente del serializado y las instancias
de representación que genera el marcador de eventos; las lecciones conceptuales
omiten este detalle de testing.

El helper ejecuta una `Decision` con un contexto que puede generar IDs. No hay base
de datos ni servidor. El resultado aceptado se comprueba por su tipo de inserción y
la carga completa del evento, de modo que un stock o una cantidad incorrectos sean
observables.

Los dos UUID fijos son deliberadamente distintos, por lo que intercambiar los IDs
del carrito y el stock es observable. Estos tests ejercitan las reglas de decisión,
no la generación de UUID ni la búsqueda de streams. Proporcionar un estado
 directamente prueba deliberadamente la decisión de forma aislada. El ejecutor de
la aplicación establece si una entidad existe realmente.

## Comprueba la reconstrucción

En `tests/Decider/Cart/ReplaySpec.hs`, pasa hechos aceptados por la misma función
de actualización que usa la aplicación:

```haskell
    let created = CartCreated (CartCreated.Event {entityId = Uuid.nil, ownerId = "owner"})
    let added = ItemAdded (ItemAdded.Event {entityId = Uuid.nil, stockId = Uuid.nil, quantity = 2})
    let cart = initialState |> update created |> update added |> update added
    cart.items |> Array.length |> shouldBe 2
```

Esta comprobación aplica dos adiciones separadas. Protege el significado elegido
para una entrada. También podrías comprobar las cantidades almacenadas en cada
entrada; un cambio posterior que combine productos repetidos necesita una política
nueva y explícita, además de la evidencia correspondiente.

## Prueba un comando interno

No necesitas exponer `ReserveStock` mediante HTTP para probar su regla. En
`tests/Decider/Stock/ReserveStockSpec.hs`, empieza con una unidad y solicita dos:

```haskell
    let stock = StockEntity {stockId = Uuid.nil, productId = Uuid.nil, available = 1, reserved = 0}
    result <- runDecision (decide (request 2) (Just stock) Auth.emptyContext)
    result |> shouldBe (RejectCommand "Insufficient stock available!")
```

Aceptar la última unidad y rechazar demasiadas son comprobaciones distintas. Estos
tests secuenciales no establecen cómo compiten dos solicitudes simultáneas por la
misma última unidad. Añade un escenario de concurrencia a nivel de aplicación antes
de hacer una promesa más fuerte.

## Ensambla el punto de control de testing

Crea estos directorios si no existen:

```sh
mkdir -p tests/Decider/Cart tests/Decider/Stock tests/scenarios
```

Los módulos completos siguientes se pueden añadir al proyecto como archivos nuevos.
Conserva el `tests/Spec.hs` generado; descubre estos módulos. Si ya existe un
módulo, sustitúyelo por el archivo correspondiente para que sus imports y el
contexto de helpers sigan siendo coherentes con las aserciones.

<!-- complete-file -->
```haskell title="tests/Decider/Cart/CreateCartSpec.hs"
module Decider.Cart.CreateCartSpec (spec) where

import Core
import Shop.Cart.Events.CartCreated qualified as CartCreated
import Decider qualified
import Service.Auth qualified as Auth
import Service.Command.Core (DecisionContext (..))
import Shop.Cart.Commands.CreateCart (CreateCart (..), decide)
import Shop.Cart.Core (CartEvent (..), initialState)
import Task qualified
import Test
import Uuid qualified

runDecision :: Decision fact -> Task Text (CommandResult fact)
runDecision decision =
  Decider.runDecision (DecisionContext {genUuid = Task.yield Uuid.nil}) decision

spec :: Spec Unit
spec = describe "CreateCart" do
  it "records the generated cart and anonymous owner" \_ -> do
    result <- runDecision (decide CreateCart Nothing Auth.emptyContext)
    result |> shouldBe (AcceptCommand StreamCreation
      [CartCreated (CartCreated.Event {entityId = Uuid.nil, ownerId = Uuid.toText Uuid.nil})])

  it "rejects an existing cart" \_ -> do
    result <- runDecision (decide CreateCart (Just initialState) Auth.emptyContext)
    result |> shouldBe (RejectCommand "Cart already exists!")
```

<!-- complete-file -->
```haskell title="tests/Decider/Cart/AddItemSpec.hs"
module Decider.Cart.AddItemSpec (spec) where

import Core
import Array qualified
import Shop.Cart.Events.ItemAdded qualified as ItemAdded
import Decider qualified
import Maybe qualified
import Service.Auth qualified as Auth
import Service.Command.Core (DecisionContext (..))
import Shop.Cart.Commands.AddItem (AddItem (..), decide)
import Shop.Cart.Core (CartEntity (..), CartEvent (..))
import Test
import Uuid qualified

runDecision :: Decision fact -> Task Text (CommandResult fact)
runDecision decision =
  Decider.runDecision (DecisionContext {genUuid = Uuid.generate}) decision

cartIdFixture :: Uuid
cartIdFixture = Uuid.fromText "11111111-1111-1111-1111-111111111111" |> Maybe.getOrDie

stockIdFixture :: Uuid
stockIdFixture = Uuid.fromText "22222222-2222-2222-2222-222222222222" |> Maybe.getOrDie

spec :: Spec Unit
spec = describe "AddItem" do
  it "records the requested stock and quantity" \_ -> do
    let cart = CartEntity {cartId = cartIdFixture, ownerId = "owner", items = Array.empty}
    let request = AddItem {cartId = cartIdFixture, stockId = stockIdFixture, quantity = 2}
    result <- runDecision (decide request (Just cart) Auth.emptyContext)
    result |> shouldBe (AcceptCommand ExistingStream
      [ItemAdded (ItemAdded.Event {entityId = cartIdFixture, stockId = stockIdFixture, quantity = 2})])

  it "rejects a missing cart" \_ -> do
    let request = AddItem {cartId = cartIdFixture, stockId = stockIdFixture, quantity = 1}
    result <- runDecision (decide request Nothing Auth.emptyContext)
    result |> shouldBe (RejectCommand "Cart not found!")

  it "rejects zero" \_ -> do
    let request = AddItem {cartId = cartIdFixture, stockId = stockIdFixture, quantity = 0}
    result <- runDecision (decide request (Just (CartEntity {cartId = cartIdFixture, ownerId = "owner", items = Array.empty})) Auth.emptyContext)
    result |> shouldBe (RejectCommand "Quantity must be positive")

  it "accepts the smallest positive quantity" \_ -> do
    let request = AddItem {cartId = cartIdFixture, stockId = stockIdFixture, quantity = 1}
    result <- runDecision (decide request (Just (CartEntity {cartId = cartIdFixture, ownerId = "owner", items = Array.empty})) Auth.emptyContext)
    result |> shouldBe (AcceptCommand ExistingStream
      [ItemAdded (ItemAdded.Event {entityId = cartIdFixture, stockId = stockIdFixture, quantity = 1})])
```

<!-- complete-file -->
```haskell title="tests/Decider/Cart/ReplaySpec.hs"
module Decider.Cart.ReplaySpec (spec) where

import Array qualified
import Core
import Shop.Cart.Events.ItemAdded qualified as ItemAdded
import Shop.Cart.Events.CartCreated qualified as CartCreated
import Shop.Cart.Core (CartEntity (..), CartEvent (..), initialState, update)
import Test
import Uuid qualified

spec :: Spec Unit
spec = describe "Cart replay" do
  it "starts empty after creation" \_ -> do
    let created = CartCreated (CartCreated.Event {entityId = Uuid.nil, ownerId = "owner"})
    let cart = initialState |> update created
    cart.items |> Array.length |> shouldBe 0
    cart.ownerId |> shouldBe "owner"

  it "retains separate entries for successive additions" \_ -> do
    let created = CartCreated (CartCreated.Event {entityId = Uuid.nil, ownerId = "owner"})
    let added = ItemAdded (ItemAdded.Event {entityId = Uuid.nil, stockId = Uuid.nil, quantity = 2})
    let cart = initialState |> update created |> update added |> update added
    cart.items |> Array.length |> shouldBe 2
```

<!-- complete-file -->
```haskell title="tests/Decider/Stock/ReserveStockSpec.hs"
module Decider.Stock.ReserveStockSpec (spec) where

import Core
import Shop.Stock.Events.StockReserved qualified as StockReserved
import Decider qualified
import Service.Auth qualified as Auth
import Service.Command.Core (DecisionContext (..))
import Shop.Stock.Commands.ReserveStock (ReserveStock (..), decide)
import Shop.Stock.Core (StockEntity (..), StockEvent (..), initialState)
import Test
import Uuid qualified

runDecision :: Decision fact -> Task Text (CommandResult fact)
runDecision decision =
  Decider.runDecision (DecisionContext {genUuid = Uuid.generate}) decision

request :: Int -> ReserveStock
request quantity = ReserveStock {stockId = Uuid.nil, cartId = Uuid.nil, quantity = quantity}

spec :: Spec Unit
spec = describe "ReserveStock" do
  it "accepts the last available unit" \_ -> do
    let stock = StockEntity {stockId = Uuid.nil, productId = Uuid.nil, available = 1, reserved = 0}
    result <- runDecision (decide (request 1) (Just stock) Auth.emptyContext)
    result |> shouldBe (AcceptCommand ExistingStream
      [StockReserved (StockReserved.Event {entityId = Uuid.nil, quantity = 1, cartId = Uuid.nil})])

  it "rejects more units than remain" \_ -> do
    let stock = StockEntity {stockId = Uuid.nil, productId = Uuid.nil, available = 1, reserved = 0}
    result <- runDecision (decide (request 2) (Just stock) Auth.emptyContext)
    result |> shouldBe (RejectCommand "Insufficient stock available!")

  it "rejects zero quantity" \_ -> do
    result <- runDecision (decide (request 0) (Just initialState) Auth.emptyContext)
    result |> shouldBe (RejectCommand "Quantity must be positive")

  it "rejects missing stock" \_ -> do
    result <- runDecision (decide (request 1) Nothing Auth.emptyContext)
    result |> shouldBe (RejectCommand "Stock not found!")
```

Ejecuta `neo build` y después `neo test`. Estos módulos establecen los límites de
decisión y reproducción pura; el archivo Hurl anterior establece el límite del
transporte y la proyección en ejecución. Si más adelante añades reglas de
propiedad o solicitudes duplicadas, agrega tests para esas decisiones en lugar de
cambiar un resultado esperado existente para adaptarlo a una implementación nueva.

La comprobación HTTP del primer slice es un archivo pequeño separado. Crea o
sustituye `tests/scenarios/create-cart.hurl` por este contenido cuando quieras
verificar por sí solos la ruta de creación y su resumen vacío:

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

## Ejercita la aplicación en ejecución

Crea o sustituye `tests/scenarios/cart-flow.hurl` por este escenario completo
cuando los módulos anteriores estén en su sitio:

<details>
<summary>Archivo completo: tests/scenarios/cart-flow.hurl</summary>

<!-- complete-file -->
```hurl title="tests/scenarios/cart-flow.hurl"
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

POST http://localhost:8080/commands/add-item
Content-Type: application/json
{"cartId":"{{cart_id}}","stockId":"11111111-1111-1111-1111-111111111111","quantity":2}

HTTP 200

POST http://localhost:8080/commands/add-item
Content-Type: application/json
{"cartId":"{{cart_id}}","stockId":"11111111-1111-1111-1111-111111111111","quantity":0}

HTTP 400
[Asserts]
jsonpath "$.reason" == "Quantity must be positive"

GET http://localhost:8080/queries/cart-summary
[Options]
retry: 10
retry-interval: 200

HTTP 200
[Asserts]
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].itemCount" nth 0 == 1
jsonpath "$.items[?(@.cartSummaryId == '{{cart_id}}')].isEmpty" nth 0 == false
```

</details>

Este test crea su propio carrito, así que no depende de los IDs de ayer.
Comprueba que la solicitud de cero rechazada deja la vista en una entrada
aceptada. Los reintentos pertenecen a la lectura: reintentar una adición aceptada
podría añadirla de nuevo.

Detén cualquier servidor `neo run` y ejecuta desde la raíz del proyecto:

```sh
neo test
```

La CLI ejecuta tus tests Haskell e inicia la aplicación para los escenarios Hurl.
Un test de decisión correcto con un escenario HTTP fallido suele apuntar al
registro, la serialización, la configuración o la integración, no a la regla por
sí sola. Inspecciona el límite que falla antes de cambiar la lógica de negocio.

## Conserva una regresión que explique el error

Supón que tu agente implementa un límite de seis unidades **por carrito**
comprobando cada solicitud contra seis. Añade cuatro y después solicita cuatro más.
La segunda solicitud debe rechazarse según esa política. Ejecuta la comprobación
fallida antes de corregir la implementación y consérvala después.

No cambies un resultado esperado solo para que pase el test. Si cambia la política,
describe explícitamente ese cambio y actualiza después la evidencia para que coincida
con el nuevo acuerdo.

## Ejercicio: una respuesta perdida

El cliente agota el tiempo de espera después de solicitar dos tazas. Tu agente
propone reenviar automáticamente el comando. ¿Qué test revelaría el riesgo?

<details>
<summary>Razonamiento y comprobaciones sugeridos</summary>

Haz que el servidor acepte la primera solicitud mientras se pierde la respuesta.
Envía de nuevo la misma solicitud e inspecciona el historial y el estado. El comando
actual puede aceptar una segunda adición. Decide qué identificador u otra política
debe distinguir un reintento de una solicitud intencionada diferente. Prueba el
primer envío, un reintento y una solicitud intencionadamente distinta. Desactivar un
botón es un comportamiento de interfaz útil, pero no establece una gestión de
duplicados en el servidor.

</details>

Siguiente: [control de acceso](/es/build/access-control/) aplica el mismo enfoque basado en evidencia a los permisos.
