---
title: Consultas y vistas útiles
description: Construye modelos de lectura alrededor de las preguntas que cada lector necesita responder.
sidebar:
  order: 4
---
<!-- translation-source-sha256: 919b26e8b68bacc03787967b39a93c7c60d5208e1095967bfe4cf4c90692529a -->

Una pantalla o un informe necesita información adaptada a la pregunta de quien lo
lee. Mostrar todo el historial interno de la aplicación haría más difícil responder
a esa pregunta. Una consulta prepara una vista útil, como trabajo pendiente de
revisión o el progreso de una solicitud.

Los modelos de lectura de NeoHaskell separan la presentación de información de la
decisión sobre si se permite un cambio. Eso te da libertad para dar forma a la
vista, con una contrapartida: un cambio recién aceptado puede tardar un momento en
aparecer.

Esta página sigue a las [adiciones de Cart](/es/build/commands-and-events/). Esa
página modificó la misma entidad Cart para que contenga `items`; la consulta de
abajo lee ese estado. Sigue [tu primer slice funcional](/es/build/first-cart/) y la
página de adiciones en un único proyecto `mug-shop`. Si llegas aquí directamente,
usa primero sus puntos de control completos y después crea o sustituye
`src/Shop/Cart/Queries/CartSummary.hs` con el archivo completo de esta página.

## Empieza por la pregunta de la pantalla

El `CartSummary` existente responde: «¿Qué Cart es este, quién es su propietario,
cuántas entradas tiene y está vacío?». No informa de las unidades totales ni de los
precios. Decide el significado de cada campo antes de pedirle uno nuevo a un agente:
`itemCount` significa actualmente entradas, así que una adición de cinco tazas
produce un recuento de uno.

La lógica de negocio de la consulta pertenece a
`src/Shop/Cart/Queries/CartSummary.hs`. Desde la raíz del proyecto `mug-shop`,
sustituye ese archivo después de revisar la proyección enfocada:

```haskell
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

`queryId` determina a qué fila de vista contribuye esta entidad. `combine` recibe
el estado actual de la entidad y la vista existente, si la hay. Aquí la entidad
actual contiene todo lo necesario, por lo que la vista antigua no se usa y se
sustituye con `Update`.

Otros resultados son `Delete`, que elimina la fila de vista, y `NoOp`, que la deja
sin cambios. Más de un tipo de entidad puede contribuir a una consulta. Empieza con
uno hasta que tu pantalla tenga un motivo para combinar vistas.

## Deriva y registra la vista

Para esta consulta, el archivo define el registro de datos, `canAccess` y
`canView`, y después llama al helper canónico:

```haskell
deriveQuery ''CartSummary [''CartEntity]
```

Coloca la instancia de negocio `QueryOf` pertinente **después** de ese marcador:
depende de la instancia `Query` que genera el marcador. El marcador procede del
import `Core` orientado al framework y genera la compatibilidad estándar de las
consultas. El archivo completo de abajo conserva los imports y el orden de
declaración requeridos.

El registro de la aplicación ya está en `src/App.hs` desde el primer slice. Si una
aplicación existente tiene el servicio Cart pero no tiene registro de consultas,
añade esta línea junto al registro del servicio:

```haskell
  |> Application.withQuery @CartSummary
```

El nombre interno del marcador es `CartSummary`; la URL HTTP es
`/queries/cart-summary`. La consulta de práctica permite deliberadamente el acceso
público. Antes de exponer datos privados de la aplicación, define y prueba las
[políticas de control de acceso](/es/build/access-control/).

## Archivo de consulta actual completo

Crea el directorio `src/Shop/Cart/Queries` si es necesario y sustituye
`src/Shop/Cart/Queries/CartSummary.hs` por este archivo ensamblado desde la raíz del
proyecto:

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

`Array qualified` es un import real usado por la proyección; consérvalo al montar
el archivo. `canAccess` y `canView` son funciones explícitas de política de la
aplicación. Aquí son públicas para que el ejercicio pueda inspeccionar un Cart sin
autenticación; esa comodidad no es una recomendación para datos privados.

## Encuentra tu Cart

Ejecuta la aplicación desde la raíz del proyecto `mug-shop`:

```sh
neo build
neo run
```

Crea un Cart, añade un artículo como se describe en [las adiciones de Cart](/es/build/commands-and-events/) y sustituye `YOUR-CART-UUID` por el identificador devuelto al crearlo:

```sh
curl --get http://localhost:8080/queries/cart-summary \
  --data-urlencode 'q=.cartSummaryId == "YOUR-CART-UUID"' \
  --data-urlencode 'limit=10' \
  --data-urlencode 'offset=0'
```

Espera un objeto de página. Su array `items` contiene el resumen coincidente una
vez que la proyección se actualiza. `total` refleja el número de resultados
accesibles y filtrados; `hasMore` indica si quedan más resultados coincidentes;
`effectiveLimit` informa del límite de página aplicado.

Los valores predeterminados son un tamaño de página de 100 y offset cero, con un
tamaño máximo absoluto de 1000. Una consulta puede establecer un límite menor
definiendo `maxResults :: Int` antes de su marcador. Los clientes deben usar el
`effectiveLimit` devuelto al avanzar por las páginas.

El NeoQL actual admite acceso a campos e igualdad con literales de cadena o
numéricos. No es un lenguaje SQL general: no inventes joins, ordenación,
condiciones compuestas ni comparaciones con literales booleanos. La sintaxis no
válida produce un error de análisis; las expresiones están limitadas a 500
caracteres.

## Evita una pantalla de carga engañosa

Después de un comando aceptado, muestra un estado pendiente claro mientras la vista
se actualiza. Vuelve a leer con un reintento acotado y un estado de fallo útil. Una
primera respuesta vacía no demuestra que el comando haya fallado. Volver a enviar
una adición solo porque su resumen todavía no aparece puede añadirla dos veces.

## Ejercicio: la insignia del Cart

La interfaz dice «5 artículos», pero el cliente hizo una adición de cinco tazas.
¿Debe la insignia mostrar uno o cinco? Indica el significado y después pide a tu
agente que identifique qué debe cambiar.

<details>
<summary>Razonamiento y comprobaciones sugeridos</summary>

El resumen existente informa de una entrada. Si la insignia significa unidades,
diseña un total de cantidades en lugar de cambiar el nombre de `itemCount`.
Verifica una adición de cinco, dos adiciones del mismo producto, un Cart vacío y una
adición rechazada. Consulta también un ID de Cart desconocido: el filtro no debe
producir ninguna fila coincidente ni el Cart de otro cliente. Los tests deben
esperar una actualización de proyección acotada en lugar de suponer visibilidad
inmediata.

</details>

Siguiente: [stock y checkout](/es/build/stock-and-checkout/).
