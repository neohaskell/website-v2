---
title: Programa trabajo periódico
description: Usa pulsos de temporizador para solicitar trabajo sin confundirlos con programaciones duraderas.
sidebar:
  order: 9
---
<!-- translation-source-sha256: b7d1f56484358a4c2ceb5fccedb2f55daa5519c02ebd35d2446b232de48cea87 -->

Algunos trabajos deben ocurrir periódicamente: comprobar registros caducados,
consultar un servicio o actualizar un resumen. Un temporizador puede solicitar ese
trabajo mientras las reglas de la aplicación deciden qué toca realmente. Mantener
separadas esas responsabilidades facilita entender el comportamiento tras un
reinicio.

NeoHaskell proporciona una integración sencilla de temporizador en proceso. Es útil
para solicitudes periódicas mientras la aplicación está ejecutándose. No es un
programador persistente de trabajos que recuerde cada ejecución perdida.

Primero observa un temporizador usando la regla de creación de carritos existente.
Después diseña la caducidad de las reservas de stock: sus plazos deben sobrevivir a
un reinicio aunque el temporizador no lo haga.

Todas las rutas de abajo son relativas a la raíz de tu proyecto `mug-shop`. La
lección crea tres archivos de Cart, sustituye un archivo de servicio y añade un
registro de aplicación. Primero aparecen las declaraciones enfocadas; los archivos
completos resultantes siguen a cada cambio.

## Da al temporizador un comando interno

Los comandos de un temporizador usan el dispatcher de integraciones, que solo
registra comandos declarados con `InternalTransport`. El `CreateCart` existente
pertenece a `WebTransport`. Conserva esa acción pública y proporciona un punto de
entrada separado para el temporizador que delegue en la misma decisión.

La delegación es la elección de negocio: cambia cómo llega la solicitud y conserva
coherente la creación de carritos.

```haskell
decide _ entity context =
  CreateCart.decide CreateCart.CreateCart entity context
```

Crea `src/Shop/Cart/Commands/CreateCartInternal.hs`. El comando no tiene campos y
crea un carrito nuevo, por lo que `getEntityId` devuelve `Nothing`. Su transporte es
interno:

```haskell
data CreateCartInternal = CreateCartInternal

getEntityId :: CreateCartInternal -> Maybe Uuid
getEntityId _ = Nothing

type instance EntityOf CreateCartInternal = CartEntity
type instance TransportsOf CreateCartInternal = '[InternalTransport]

deriveCommand ''CreateCartInternal
```

### Archivo completo del comando interno

Crea el archivo en la ruta indicada por el fence y copia el archivo completo,
incluidas su cabecera de módulo e imports.

<!-- complete-file -->
```haskell title="src/Shop/Cart/Commands/CreateCartInternal.hs"
module Shop.Cart.Commands.CreateCartInternal (
  CreateCartInternal (..),
  getEntityId,
  decide,
) where

import Core
import Service.Auth (RequestContext)
import Service.Command.Core (TransportsOf)
import Service.Transport.Internal (InternalTransport)
import Shop.Cart.Commands.CreateCart qualified as CreateCart
import Shop.Cart.Core (CartEntity, CartEvent)


data CreateCartInternal = CreateCartInternal


getEntityId :: CreateCartInternal -> Maybe Uuid
getEntityId _ = Nothing


decide :: CreateCartInternal -> Maybe CartEntity -> RequestContext -> Decision CartEvent
decide _ entity context =
  CreateCart.decide CreateCart.CreateCart entity context


type instance EntityOf CreateCartInternal = CartEntity
type instance TransportsOf CreateCartInternal = '[InternalTransport]


deriveCommand ''CreateCartInternal
```

No añadas ambos tipos de transporte a `CreateCart`; el framework rechaza mezclar
transportes internos y públicos en un mismo comando. Este ejercicio crea carritos
vacíos para observarlos. Elimina el registro del temporizador después de observarlo.

## Sustituye el registro del servicio Cart

Sustituye `src/Shop/Cart/Service.hs` por el archivo de abajo o añade la línea final
`Service.command` a tu servicio Cart existente si sus dos primeros registros no han
cambiado:

```haskell
  |> Service.command @CreateCartInternal
```

El comando debe registrarse antes de que el temporizador pueda despacharlo. Este
archivo completo es el overlay exacto de Connect.

<!-- complete-file -->
```haskell title="src/Shop/Cart/Service.hs"
module Shop.Cart.Service (service) where

import Core
import Service qualified
import Shop.Cart.Commands.AddItem (AddItem)
import Shop.Cart.Commands.CreateCart (CreateCart)
import Shop.Cart.Commands.CreateCartInternal (CreateCartInternal)

service :: Service _ _
service = Service.new
  |> Service.command @CreateCart
  |> Service.command @AddItem
  |> Service.command @CreateCartInternal
```

## Crea la integración del temporizador

Crea `src/Shop/Cart/Timers.hs`. El temporizador convierte cada pulso en el comando
interno. El valor del pulso se ignora deliberadamente: el comando es la solicitud
de trabajo, no un identificador de programación duradero.

```haskell
periodicCartCreator :: Integration.Inbound
periodicCartCreator =
  Timer.Every
    { interval = Timer.seconds 30
    , toCommand = \_ -> CreateCartInternal
    }
    |> Timer.every
```

### Archivo completo del temporizador

Copia el archivo completo a la ruta del título.

<!-- complete-file -->
```haskell title="src/Shop/Cart/Timers.hs"
module Shop.Cart.Timers (periodicCartCreator) where

import Core
import Integration qualified
import Integration.Timer qualified as Timer
import Shop.Cart.Commands.CreateCartInternal (CreateCartInternal (..))


periodicCartCreator :: Integration.Inbound
periodicCartCreator =
  Timer.Every
    { interval = Timer.seconds 30
    , toCommand = \_ -> CreateCartInternal
    }
    |> Timer.every
```

## Añade el temporizador a `App.hs`

En `src/App.hs`, añade este import junto a los demás imports de Cart:

```haskell
import Shop.Cart.Timers (periodicCartCreator)
```

Añade el registro después de los registros de servicios y consultas existentes:

```haskell
  |> Application.withInbound @() (\_ -> periodicCartCreator)
```

La fábrica `@()` no necesita configuración de la aplicación. Este archivo completo
continúa las lecciones de flujo de trabajo y cargas, conservando sus registros y
añadiendo el temporizador. Si omitiste una de esas funcionalidades opcionales,
omite su import y registro; conserva los ajustes de autenticación que hayas añadido.

<!-- complete-file -->
```haskell title="src/App.hs"
module App (app) where

import Core
import Shop.Uploads qualified as Uploads
import Shop.Cart.Integrations.ReserveStockOnItemAdded (ReserveStockOnItemAdded)
import Maybe qualified
import Path qualified
import Service.Application (Application)
import Service.Application qualified as Application
import Service.EventStore.Simple (SimpleEventStore (..))
import Service.Transport.Web qualified as WebTransport
import Shop.Config (ShopConfig (..))
import Shop.Cart.Queries.CartSummary (CartSummary)
import Shop.Cart.Service qualified as Cart
import Shop.Cart.Timers (periodicCartCreator)
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
  |> Application.withFileUpload @() (\_ -> Uploads.uploadConfig)
  |> Application.withInbound @() (\_ -> periodicCartCreator)
```

## Ejecútalo y observa el primer pulso

Detén cualquier servidor en ejecución antes de editar y después ejecuta desde
`mug-shop`:

```sh
neo build
neo test
neo run
```

En otro terminal, consulta `/queries/cart-summary`. Debe aparecer un carrito vacío
después del inicio y más carritos mientras funciona el temporizador. Cada uno
informa de cero entradas. Detén el servidor y elimina la línea `withInbound` y el
import de `Shop.Cart.Timers` después de observar el comportamiento. Conserva los
módulos del comando y del temporizador si quieres que compile el punto de control
completo; un temporizador sin registrar no se ejecuta.

`Timer.every` llama a `toCommand` con el recuento de pulsos **1 inmediatamente al
iniciar el worker**, emite ese comando y después duerme. Los pulsos posteriores
incrementan el recuento. Los helpers de intervalos convierten segundos, minutos y
horas a milisegundos.

El recuento de pulsos se reinicia con el worker. No es un identificador duradero, una
secuencia persistida ni evidencia del tiempo de reloj transcurrido. El trabajo y el
despacho también tardan, por lo que este bucle no es un programador alineado con el
calendario. La aplicación reinicia los workers entrantes después de fallos
informados con backoff creciente; eso no recupera una cola duradera de pulsos
perdidos. Varias instancias de la aplicación también pueden crear varios workers de
temporizador.

## Adapta el patrón a las reservas

En el proyecto de práctica, diseña un comando que solicite una comprobación de
caducidad usando estado duradero. Decide cómo encuentra las reservas pendientes,
cuánto trabajo hace en cada ejecución y cómo verifica el propio comando de una
reserva que todavía puede caducar.

El temporizador debe iniciar ese proceso; no debe codificar «el pulso 20 significa
que esta reserva caduca». Guarda el plazo real con la reserva o su flujo asociado.
Usa el reloj de la aplicación y los hechos persistidos en la capa responsable de
decidir si puede caducar.

Haz que las comprobaciones de caducidad repetidas sean inocuas. Por ejemplo, una
reserva ya liberada no debe restaurar el stock otra vez. Esa regla pertenece al
dominio y sus tests, no al intervalo de sueño del temporizador.

## Ejercicio: reinicia a mitad de la caducidad

Supón que una reserva caduca después de diez minutos y la aplicación se reinicia
tras seis. Explica qué ocurre en el primer pulso después del inicio. El temporizador
solicita una comprobación inmediatamente, pero la reserva sigue usando su plazo
original. Comprueba antes de caducar, exactamente en el límite que elijas y después
de caducar. Repite el comando, reinicia el worker y ejecuta dos workers contra la
misma reserva. El resultado de stock debe coincidir con tu política de duplicados.

Un test de inicio debe esperar un primer comando inmediato. Un test de negocio con
reloj controlado debe demostrar la caducidad sin dormir diez minutos.

Cuando tu aplicación necesite una programación duradera, selecciona o construye
esa capacidad explícitamente y conéctala mediante la [abstracción de integración
entrante](/es/connect/custom-integrations/). Usa [despliegue](/es/operate/deployment/)
para razonar sobre la cantidad de workers y los reinicios.

<details>
<summary>Notas sobre el código fuente del framework</summary>

- [core/service/Integration/Timer.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Integration/Timer.hs)
- [testbed/src/Testbed/Cart/Integrations.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/Testbed/Cart/Integrations.hs)
- [testbed/src/App.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/App.hs)
- [core/service/Service/Application/Integrations.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Application/Integrations.hs)

</details>
