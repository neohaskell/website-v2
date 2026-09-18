---
title: Entidades y estado
description: Entiende cómo los hechos registrados se convierten en el estado usado para la siguiente decisión de negocio.
sidebar:
  order: 3
---
<!-- translation-source-sha256: 6bca4999700dc492c501c8515d57fcb22d50687ded825f4c40f360072f53a1d6 -->

Antes de aceptar una solicitud nueva, una aplicación necesita conocer el estado
actual pertinente. Saber cómo se formó ese estado también ayuda a explicar las
decisiones anteriores. NeoHaskell conecta ambas necesidades: el estado actual de
una entidad se construye aplicando sus eventos en orden.

Una **entidad** es el objeto de negocio cuyas reglas proteges. Puede representar
una reserva, un documento o una cuenta. En el proyecto de práctica es un Cart,
identificado por un UUID. Su estado ayuda a decidir el comando siguiente; su
historial de eventos registra los cambios aceptados.

Esta página supone que [tu primer slice funcional](/es/build/first-cart/) y las
[adiciones de Cart](/es/build/commands-and-events/) están en el mismo proyecto
`mug-shop`. Si llegas directamente, abre el proyecto creado en Comenzando y usa
primero los puntos de control de archivos completos de esas dos páginas; el archivo
completo de entidad de esta página hace referencia a `CartItem` y `ItemAdded` del
punto de control de adiciones.

## Sigue un Cart a lo largo del tiempo

Supón que el historial de eventos de un Cart es:

| Evento registrado | Estado resultante |
| --- | --- |
| `CartCreated` | El Cart tiene un identificador, un identificador de propietario y ninguna entrada. |
| `ItemAdded`, cantidad 2 | Una entrada contiene el identificador del stock seleccionado y la cantidad 2. |
| `ItemAdded`, cantidad 1 | Se añade una segunda entrada, aunque se refiera al mismo stock. |

La distinción entre una entrada y una cantidad total es una elección del modelo.
El ejemplo actual no combina adiciones repetidas. Tampoco elimina artículos,
captura un precio ni marca un Cart como checkout completado. Son decisiones de
negocio separadas que merecen sus propios hechos y reglas.

## Decide dónde vive el comportamiento del estado

Trabaja desde la raíz del proyecto `mug-shop`. `src/Shop/Cart/Event.hs` posee el
vocabulario de eventos de Cart y `getEventEntityId`; `src/Shop/Cart/Item.hs` posee
el pequeño valor almacenado en cada entrada; `src/Shop/Cart/Entity.hs` posee el
registro de estado, su valor inicial y la reproducción. La fachada de dominio en
`src/Shop/Cart/Core.hs` vuelve a exportar los tipos de entidad y eventos para los
comandos y las consultas.

La página de adiciones ya te indicó que sustituyeras
`src/Shop/Cart/Entity.hs`. Esta página explica por qué ese archivo tiene ese orden
y esos límites, y después muestra el archivo actual completo. Si aplicas el cambio
ahora, sustituye el archivo de esa ruta por el bloque ensamblado siguiente. No
muevas `initialState`, `update` ni `getEventEntityId` detrás del marcador que
depende de ellos.

## Lee el estado y su cableado

El registro de estado de Cart contiene los hechos que necesitan las decisiones
posteriores:

```haskell
data CartEntity = CartEntity
  { cartId :: Uuid
  , ownerId :: Text
  , items :: Array CartItem
  }
```

La reconstrucción comienza con un array vacío y un identificador nil:

```haskell
initialState :: CartEntity
initialState = CartEntity {cartId = Uuid.nil, ownerId = "", items = Array.empty}
```

El caso `CartCreated` establece la identidad y el propietario. El caso `ItemAdded`
añade una entrada ya aceptada por el comando:

```haskell
update change cart = case change of
  CartCreated created ->
    CartEntity {cartId = created.entityId, ownerId = created.ownerId, items = Array.empty}
  ItemAdded added ->
    cart {items = cart.items |> Array.push (CartItem {stockId = added.stockId, quantity = added.quantity})}
```

La función de actualización aplica un hecho aceptado. La validación debe ocurrir
antes de registrar ese hecho; el trabajo externo pertenece a una integración que
reacciona a él. La actualización de Cart no llama a un almacén, consulta el
catálogo de hoy ni reconsidera si la solicitud debería haberse aceptado.

Después de `initialState` y `update`, conecta la entidad con su tipo de evento
mediante el helper exportado por el import de `Core` orientado al framework:

```haskell
deriveEntity ''CartEntity ''CartEvent
```

La función `getEventEntityId` de `Event.hs` debe importarse antes de este marcador.
Estos elementos complementarios son el comportamiento que debes revisar con tu
agente. El marcador proporciona los enlaces entre `CartEntity` y `CartEvent`, la
conversión JSON, el valor inicial predeterminado y las instancias de reproducción
y enrutamiento de eventos del framework. No exige que los campos de la entidad
admitan `Show`.

## La reproducción es un límite de negocio

Mantener la validación fuera de `update` hace estable la reproducción. Si al
reconstruir el Cart de ayer consultaras el precio del producto de hoy, el mismo
historial podría producir un resultado comercial diferente. Cuando un precio tenga
que formar parte de un acuerdo de pedido, diseña un evento que registre el importe
y la divisa acordados en el momento adecuado.

Capturar ese precio es una **ampliación de diseño del proyecto de práctica**, no un
campo ya presente en este Cart. La lección general es conservar la información que
da significado a una decisión pasada. Consulta [fundamentos del lenguaje](/es/build/language-essentials/#amounts-and-money) para conocer el tipo Decimal actual y sus límites.

Las instantáneas pueden reducir el trabajo necesario para reconstruir una entidad.
Son una ayuda de rendimiento; el comportamiento que enseñas y verificas sigue
siendo la aplicación ordenada de hechos registrados. La persistencia y la
recuperación reciben su propio tratamiento en [ejecutar y evolucionar](/es/operate/).

## Archivo de entidad actual completo

Lo siguiente es la sustitución ensamblada para `src/Shop/Cart/Entity.hs`, relativa
a la raíz del proyecto `mug-shop`. Las definiciones de `CartEvent`, `CartItem` e
`ItemAdded` que importa están completas en [comandos y eventos](/es/build/commands-and-events/).

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

## Ejercicio: explica una reconstrucción

Dale a tu agente este historial: se crea un Cart, se añaden dos tazas y después se
añaden tres más. Pídele que prediga tanto el número de entradas como la cantidad
total. Después haz que demuestre la reconstrucción desde `initialState`.

<details>
<summary>Razonamiento y comprobaciones sugeridos</summary>

Espera dos entradas y cinco unidades según el modelo actual. Un historial vacío
produce el estado inicial; solo la creación produce un Cart vacío real. Un comando
rechazado de cantidad cero no debe aportar un hecho `ItemAdded`. Reproducir el mismo
historial aceptado desde el mismo estado inicial debe producir el mismo estado. No
lo confundas con añadir el historial dos veces: las adiciones aceptadas duplicadas
cambian el resultado salvo que tu aplicación haya diseñado una gestión de
duplicados.

</details>

Siguiente: [consultas](/es/build/queries/) convierte este estado en información útil para una pantalla.

Sigue trabajando en tu proyecto con `neo build`, `neo test` y `neo ide`. La
[lección de testing](/es/build/testing/) añade una comprobación de reproducción
para estos módulos exactos de Cart.
