---
title: Carga y adjunta archivos
description: Almacena bytes cargados, valida referencias de archivos y adjúntalas a acciones de aplicación aceptadas.
sidebar:
  order: 5
---
<!-- translation-source-sha256: 0a81f2fdd4de6e40404671fbcce68f5cdbb189b58e661c2e8a4fec26d9c10443 -->

Alguien carga un archivo y después cierra el navegador antes de terminar el
formulario. La aplicación necesita almacenamiento temporal para esa carga sin
terminar y una asociación clara cuando el archivo pasa a formar parte de una
acción aceptada.

NeoHaskell proporciona referencias de archivos, rutas de carga y descarga,
comprobaciones de propiedad en la ruta orientada a usuarios y un ciclo de vida de
archivos. Tú decides qué archivos son aceptables y cuándo adjuntarlos. Continúa en
tu propio proyecto `mug-shop`: crea un archivo de configuración de cargas, añade
un registro de aplicación, carga una muestra pequeña y después diseña cómo se
adjunta una imagen a una taza personalizada.

Todas las rutas siguientes son relativas a la raíz del proyecto `mug-shop`. Los
fragmentos enfocados explican primero las decisiones. Los archivos completos
muestran los imports exactos y el código de aplicación circundante necesario para
un punto de control ejecutable.

## Elige la política de carga

Para este ejercicio local, permite notas de texto pequeñas, imágenes PNG y PDF.
Conserva los bytes en `./uploads`, guarda los metadatos del ciclo de vida en memoria
y haz que las referencias sin terminar caduquen después de seis horas:

```haskell
uploadConfig :: FileUploadConfig
uploadConfig = FileUploadConfig
  { blobStoreDir = "./uploads"
  , stateStoreBackend = InMemoryStateStore
  , maxFileSizeBytes = 10485760
  , pendingTtlSeconds = 21600
  , cleanupIntervalSeconds = 900
  , allowedContentTypes = Just ["text/plain", "image/png", "application/pdf"]
  , storeOriginalFilename = True
  }
```

Esta política sirve para aprender. El almacén de metadatos está en memoria, por lo
que reiniciar pierde las referencias aunque los bytes sigan en `uploads/`. Una
aplicación desplegada debe elegir conjuntamente metadatos persistentes y
almacenamiento de blobs persistente.

## Crea el archivo de configuración de cargas

Crea `src/Shop/Uploads.hs`. Copia el archivo completo de abajo como un único archivo
en lugar de adivinar qué tipos de carga de archivos debes importar.

<!-- complete-file -->
```haskell title="src/Shop/Uploads.hs"
module Shop.Uploads (uploadConfig) where

import Core
import Service.FileUpload.Core (FileUploadConfig (..), FileStateStoreBackend (..))


uploadConfig :: FileUploadConfig
uploadConfig = FileUploadConfig
  { blobStoreDir = "./uploads"
  , stateStoreBackend = InMemoryStateStore
  , maxFileSizeBytes = 10485760
  , pendingTtlSeconds = 21600
  , cleanupIntervalSeconds = 900
  , allowedContentTypes = Just ["text/plain", "image/png", "application/pdf"]
  , storeOriginalFilename = True
  }
```

Los campos son decisiones de la aplicación:

| Campo | Decide qué significa para tu despliegue |
| --- | --- |
| `blobStoreDir` | Dónde viven los bytes reales del archivo |
| `stateStoreBackend` | Dónde persisten los metadatos del ciclo de vida del archivo |
| `maxFileSizeBytes` | La carga más grande que se acepta |
| `pendingTtlSeconds` | Cuánto tiempo sigue siendo utilizable una carga sin terminar |
| `cleanupIntervalSeconds` | Configuración de la programación de limpieza |
| `allowedContentTypes` | Tipos multimedia declarados permitidos, o ninguna restricción |
| `storeOriginalFilename` | Si se conservan los nombres originales |

El inicio comprueba que los valores de tamaño y tiempo sean positivos, exige un
directorio no vacío y exige que el intervalo de limpieza sea menor que el TTL de
pendientes. El cableado actual de la aplicación no inicia el worker de limpieza
disponible. La caducidad se aplica al acceder, pero esta configuración no recupera
automáticamente los bytes abandonados del blob. Organiza y prueba la limpieza para
el backend que despliegues.

## Añade la compatibilidad de cargas a `App.hs`

En `src/App.hs`, añade este import cualificado junto a los demás imports de `Shop`:

```haskell
import Shop.Uploads qualified as Uploads
```

Añade este registro después del transporte, los servicios y las consultas
existentes:

```haskell
  |> Application.withFileUpload @() (\_ -> Uploads.uploadConfig)
```

La fábrica `@()` es independiente de `ShopConfig` para este ejemplo local. Cuando
el directorio y los límites pasen a ser ajustes de despliegue, sustituye la fábrica
por una función del tipo de configuración registrado mediante
`Application.withConfig`.

Después de completar [la lección de flujos de trabajo](/es/connect/workflows/), el
`src/App.hs` completo resultante es el siguiente. Conserva el registro saliente y
añade las cargas. Si llegas directamente a esta página, añade las dos líneas de
flujo en los mismos lugares, o déjalas fuera hasta completar la página anterior.

<!-- complete-file -->
```haskell title="src/App.hs"
module App (app) where

import Core
import Shop.Cart.Integrations.ReserveStockOnItemAdded (ReserveStockOnItemAdded)
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
import Shop.Uploads qualified as Uploads

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
  |> Application.withOutbound @ReserveStockOnItemAdded
  |> Application.withFileUpload @() (\_ -> Uploads.uploadConfig)
```

## Carga bytes antes de adjuntarlos

Detén y vuelve a construir después de editar; luego inicia la aplicación desde la
raíz del proyecto:

```sh
neo build
neo test
neo run
```

En otro terminal situado en la misma raíz del proyecto, crea un fixture y envíalo al
servidor en ejecución:

```sh
mkdir -p examples
printf 'Blue mug artwork draft\n' > examples/artwork-note.txt
curl -F 'file=@examples/artwork-note.txt;type=text/plain' \
  http://localhost:8080/files/upload
```

Espera un JSON que contenga `fileRef`, `filename`, `contentType`, `sizeBytes` y
`expiresAt`. Esta primera vuelta usa la aplicación local sin autenticación. Si has
activado la autenticación, proporciona credenciales como se describe en [control
de acceso](/es/build/access-control/).

Usa la referencia devuelta para solicitar los bytes. Sustituye el marcador por el
`fileRef` devuelto:

```sh
curl http://localhost:8080/files/YOUR-FILE-REFERENCE
```

**Limitación actual de descarga autenticada:** la ruta de descarga usa el modo de
middleware `Everyone`, que devuelve claims anónimos incluso cuando hay un token.
Por tanto, no se puede suponer que una carga propiedad de un sujeto autenticado se
pueda descargar mediante esta ruta. Verifica y resuelve ese recorrido antes de
activar adjuntos privados; el ejercicio anónimo no demuestra compatibilidad de
propiedad autenticada de extremo a extremo.

## Adjunta una referencia mediante una acción aceptada

Cargar bytes no ha cambiado ningún carrito. Para añadir una funcionalidad de imagen,
crea un comando con un campo `attachment :: FileRef`. `FileRef` es el tipo de
referencia definido en `Service.FileUpload.Core`. Usa el marcador de comandos de
[comandos y eventos](/es/build/commands-and-events/). El framework resuelve la
referencia antes de ejecutar el comando y proporciona los metadatos mediante
`RequestContext.files`.

Conserva la referencia del archivo en el evento aceptado junto con su asociación al
carrito o a la solicitud de imagen. No copies bytes sin procesar al evento. El
comando, el evento y la vista que muestran la imagen son trabajo nuevo de la
aplicación: crea esos archivos antes de ofrecer una acción «adjuntar» en la
pantalla.

El resolvedor comprueba la existencia del archivo, el borrado, la caducidad de
pendientes, la propiedad y la presencia del blob. Las referencias pendientes
caducan; las confirmadas no se rechazan solo por superar el TTL de pendientes. La
aplicación todavía necesita reglas de conservación y eliminación.

El contexto de acceso a archivos de una integración en segundo plano es distinto
del contexto de solicitud de una persona usuaria. Su implementación recupera por
referencia desde el almacenamiento; no lleva una comprobación de propiedad de
quien solicita. Activa el procesamiento solo desde una acción autorizada que haya
validado la asociación. No aceptes una referencia arbitraria de un prompt no
confiable para entregársela a un procesador en segundo plano.

Un tipo multimedia declarado resulta útil para el enrutamiento y los límites, pero
no demuestra que los bytes sean una imagen válida o un documento seguro. Valida las
propiedades en las que se apoya tu aplicación antes de aceptarlos.

## Ejercicio: la imagen abandonada de un cliente

En el proyecto de práctica, decide cuándo se adjunta la imagen a un pedido, qué
ocurre después de que caduque y qué muestra la pantalla si faltan los bytes
almacenados. Prueba una referencia válida y propiedad, una referencia de otra
persona, una carga pendiente caducada, una referencia eliminada, bytes del blob
ausentes, datos multipart ausentes y un archivo demasiado grande. Mantén rechazado
el comando cuando no pueda resolverse su adjunto obligatorio. Ejecuta esas
comprobaciones con `neo test` y ejercita por separado la ruta HTTP de carga en vivo.
Añade un escenario de propiedad autenticada antes de activar adjuntos privados.

Continúa con [procesamiento de documentos](/es/connect/documents/) cuando el ciclo
de vida del adjunto esté claro.

<details>
<summary>Notas sobre el código fuente del framework</summary>

- [core/auth/Auth/Middleware.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/auth/Auth/Middleware.hs)
- [core/service/Service/Transport/Web.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Transport/Web.hs)
- [core/service/Service/FileUpload/Resolver.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/FileUpload/Resolver.hs)
- [core/service/Service/FileUpload/Web.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/FileUpload/Web.hs)
- [core/service/Service/Application.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Application.hs)
- [testbed/src/App.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/App.hs)
- [testbed/src/Testbed/Document/Commands/CreateDocument.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/Testbed/Document/Commands/CreateDocument.hs)
- [testbed/tests/files/upload.hurl](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/tests/files/upload.hurl)
- [testbed/tests/files/download.hurl](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/tests/files/download.hurl)
- [testbed/tests/files/upload-errors.hurl](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/tests/files/upload-errors.hurl)

</details>
