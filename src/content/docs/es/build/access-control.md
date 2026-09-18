---
title: Control de acceso
description: Decide quién puede actuar, qué registros puede ver y cómo verificar esos límites.
sidebar:
  order: 8
---
<!-- translation-source-sha256: e3b1320bfc67c0e36c85bdbdfdef805140d4e633600619dd900940207a5facdf -->

Personas distintas necesitan accesos distintos a una aplicación. Alguien puede
tener permiso para ver un registro pero no para cambiarlo, o gestionar sus propios
registros sin ver los de nadie más. Estas son políticas de la aplicación antes de
convertirse en ajustes de autenticación.

NeoHaskell proporciona mecanismos de identidad y permisos, pero tu aplicación
debe conectarlos y declarar sus políticas. Practicaremos con clientes que deben ver
sus propios carritos y un comerciante con permisos más amplios. Tu proyecto actual
`mug-shop` permite deliberadamente la práctica anónima local. Este capítulo muestra
cómo endurecer esas políticas cuando introduzcas un servicio de identidad real.

## Separa identidad y permisos

La **autenticación** establece quién llama. La **autorización** decide qué puede
hacer o ver esa persona.

El transporte web puede validar credenciales JWT cuando la aplicación conecta
`Application.withAuth`. Los comandos reciben la identidad resultante en
`RequestContext.user`. Un `ownerId` proporcionado por el cliente no equivale a una
identidad de usuario validada.

Añade este **paso de la canalización de la aplicación** en `src/App.hs` para
activar la autenticación JWT de la aplicación usando la URL de un servidor de
autenticación. El nombre de host de ejemplo es un marcador, no un proveedor
funcional:

```haskell
Application.withAuth @() (\_ -> "https://auth.example.com")
```

Conserva este registro cuando los capítulos siguientes amplíen `App.hs`. Usa tu
servicio de identidad real y prueba su descubrimiento, issuer, audience y
configuración de tokens. `withAuthOverrides` admite cambios de configuración. La
configuración de identidad específica del despliegue pertenece a la documentación
operativa de tu aplicación.

## Protege tanto el comando como el registro

Los comandos pueden definir una función de nivel superior `canAccess` antes de su
marcador `deriveCommand`. El marcador la conecta con la comprobación de permisos
previa a la ejecución. Sin una función explícita, la clase del comando requiere
autenticación de forma predeterminada.

El permiso para usar un comando todavía puede depender del registro concreto que
afecta. En el proyecto de práctica, un cliente autenticado no debería editar el
carrito de otro cliente. En la función de decisión, compara el sujeto validado con
el propietario registrado del carrito antes de aceptar un cambio. El `AddItem` que
escribiste en `src/Shop/Cart/Commands/AddItem.hs` actualmente ignora su contexto de
solicitud.

Hay un límite de despliegue importante: **sin `Application.withAuth`, el transporte
web actual crea un contexto de comando de confianza y omite la puerta de permisos
del comando**. Declarar `canAccess` por sí solo no protege una aplicación cuya
autenticación no está conectada. Las comprobaciones de dominio dentro de `decide`
siguen siendo responsabilidad de tu código.

## Comprueba el propietario antes de aceptar un cambio

En `src/Shop/Cart/Commands/AddItem.hs`, sustituye `decide` y añade `addForOwner`
debajo. Conserva el helper de cantidad `addToCart` existente y las declaraciones
de tipos:

```haskell
decide :: AddItem -> Maybe CartEntity -> RequestContext -> Decision CartEvent
decide request existing context = case context.user of
  Nothing -> Decider.reject "Sign in before changing a cart"
  Just user -> addForOwner request existing user

addForOwner :: AddItem -> Maybe CartEntity -> UserClaims -> Decision CartEvent
addForOwner request existing user = case existing of
  Nothing -> Decider.reject "Cart not found!"
  Just cart ->
    if cart.ownerId == user.sub
      then addToCart request cart
      else Decider.reject "This cart belongs to another user"
```

Esta es una **variante autenticada** que debes introducir junto con la
configuración del servicio de identidad. Cambia el contrato anónimo anterior: los
tests HTTP anónimos originales fallarán hasta que proporciones credenciales de test
válidas y crees carritos con esa identidad. Conserva un punto de control de
desarrollo antes del cambio y añade tests de propietario, otro usuario y usuario
inexistente, en lugar de debilitar la nueva regla en silencio.

`CreateCart` ya registra `context.user.sub` para quien ha iniciado sesión. Los
carritos creados anónimamente en ejercicios anteriores no pertenecen
automáticamente a un usuario que inicie sesión después. Usa carritos autenticados
nuevos al comprobar esta variante; transferir un carrito de invitado a una cuenta
necesita su propio diseño explícito.

## Protege la vista por separado

Las consultas requieren dos políticas. `canAccess` decide si quien llama puede usar
el tipo de consulta; `canView` decide si una fila concreta es visible.

Esta **sustitución de las políticas de CartSummary** usa la API de helpers real.
Supone que `CartSummary` conserva su campo `ownerId :: Text`; `AccessControl`
proporciona el helper de propiedad:

```haskell
canAccess :: Maybe UserClaims -> Maybe AccessError
canAccess = AccessControl.authenticatedAccess

canView :: Maybe UserClaims -> CartSummary -> Maybe AccessError
canView = AccessControl.ownerOnly (.ownerId)
```

Colócalas antes de `deriveQuery`. `ownerOnly` compara el propietario de la fila con
el claim `sub` validado. El endpoint filtra las filas que fallan `canView`; calcula
los totales de paginación después de autorizar y filtrar. Un usuario que puede
acceder a la consulta pero no posee carritos coincidentes recibe un conjunto vacío,
no la información de otro cliente.

Tu CartSummary inicial usa `publicAccess` y `publicView`. Pueden ser adecuados para
un catálogo de productos, pero decide deliberadamente antes de aplicarlos a datos
de clientes. Otros helpers son `requirePermission`, `requireAnyPermission`,
`requireAllPermissions` y `tenantOnly`.

## Diseña explícitamente los carritos de invitados

`CreateCart` registra el sujeto autenticado cuando está disponible; de lo contrario
genera un identificador de propietario anónimo. Ese identificador generado no se
convierte automáticamente en una sesión de navegador segura ni concede propiedad a
un usuario que inicie sesión después.

Si añades checkout de invitado al proyecto de práctica, decide cómo demuestra un
invitado que tiene acceso a su carrito y cómo cambia la propiedad después del inicio
de sesión. La misma pregunta de diseño aparece siempre que un trabajo anónimo debe
pertenecer después a una persona autenticada. Modela y prueba esa transición. No la
resuelvas aceptando un identificador de propietario arbitrario en el cuerpo de la
solicitud.

## Ensambla la variante autenticada

Cuando hayas elegido un servicio de identidad, sustituye los archivos de comandos
y consultas siguientes por estas versiones completas. Ensamblan las comprobaciones
de propietario explicadas arriba. Esta es una rama opcional del proyecto de
práctica anónima: sus tests deben proporcionar identidades autenticadas. Conserva
tu punto de control anterior si todavía no vas a configurar la autenticación.

<!-- complete-file -->
```haskell title="src/Shop/Cart/Commands/AddItem.hs"
module Shop.Cart.Commands.AddItem (AddItem (..), getEntityId, decide) where

import Core
import Shop.Cart.Events.ItemAdded qualified as ItemAdded
import Decider qualified
import Service.Auth (RequestContext (..), UserClaims (..))
import Service.Command.Core (TransportsOf)
import Service.Transport.Web (WebTransport)
import Shop.Cart.Core (CartEntity (..), CartEvent (..))

data AddItem = AddItem {cartId :: Uuid, stockId :: Uuid, quantity :: Int}

getEntityId :: AddItem -> Maybe Uuid
getEntityId request = Just request.cartId

decide :: AddItem -> Maybe CartEntity -> RequestContext -> Decision CartEvent
decide request existing context = case context.user of
  Nothing -> Decider.reject "Sign in before changing a cart"
  Just user -> addForOwner request existing user

addForOwner :: AddItem -> Maybe CartEntity -> UserClaims -> Decision CartEvent
addForOwner request existing user = case existing of
  Nothing -> Decider.reject "Cart not found!"
  Just cart ->
    if cart.ownerId == user.sub
      then addToCart request cart
      else Decider.reject "This cart belongs to another user"

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
canAccess = AccessControl.authenticatedAccess

canView :: Maybe UserClaims -> CartSummary -> Maybe AccessError
canView = AccessControl.ownerOnly (.ownerId)

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

Por último, sustituye `src/App.hs` por el cableado de autenticación ensamblado
siguiente y sustituye `https://auth.example.com` por la URL de tu servicio de
identidad. Ese nombre de host es un marcador. Si ya has ampliado tu aplicación,
conserva esas adiciones e inserta `withAuth` después del registro del transporte.

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
  |> Application.withAuth @() (\_ -> "https://auth.example.com")
  |> Application.withService Cart.service
  |> Application.withQuery @CartSummary
  |> Application.withService Stock.service
  |> Application.withQuery @StockLevel
```

Después de configurar el proveedor real, ejecuta `neo build`. Actualiza los tests
de decisiones con contextos de solicitud autenticados y los tests HTTP con
credenciales válidas antes de ejecutar `neo test`; las expectativas anónimas de
éxito anteriores ya no se aplican. Comprueba el propietario, otra persona, las
credenciales ausentes y los tokens no válidos. Estos archivos completos ensamblan
la política de la aplicación; la configuración del proveedor y la verificación con
credenciales siguen siendo parte de adoptar esta rama opcional.

## Ejercicio: el carrito de otro cliente

Crea un plan de tests para el proyecto de práctica usando dos clientes y un
comerciante. ¿Qué debería poder leer y cambiar cada uno? Incluye una solicitud sin
credenciales y otra con un token no válido.

<details>
<summary>Razonamiento y comprobaciones sugeridos</summary>

El propietario debe poder leer su carrito y realizar cambios permitidos. El otro
cliente no debería ver su fila ni modificarla correctamente. El acceso del
comerciante depende de tu política explícita de permisos, no solo de haber iniciado
sesión. Las credenciales ausentes deben hacer fallar una consulta autenticada; el
token no válido debe ser rechazado por el transporte. Ejercita la configuración web
autenticada real además de los tests unitarios: un test unitario no puede detectar
que en producción se olvidó conectar la autenticación.

</details>

Siguiente: [configuración](/es/build/configuration/) hace explícitas estas decisiones de despliegue.

Fuentes públicas: [helpers de acceso](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/AccessControl.hs), [contexto de solicitud](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Auth.hs), [valores predeterminados de comandos](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Command/Core.hs), [endpoint de consultas](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Query/Endpoint.hs) y [despacho de autenticación web](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Transport/Web.hs).

Conectar la cuenta externa de un usuario es un asunto distinto de iniciar sesión en
tu aplicación. Consulta [cuentas de proveedores y consentimiento](/es/connect/provider-accounts/) para ese flujo.
