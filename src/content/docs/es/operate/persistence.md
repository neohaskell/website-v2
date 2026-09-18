---
title: Persiste los datos de la aplicación
description: Elige el almacenamiento para eventos, modelos de lectura, archivos y credenciales, y demuestra qué sobrevive a un reinicio.
sidebar:
  order: 1
---
<!-- translation-source-sha256: 16be86b1ad86ca0cea9a3ceedf55e41210cd17c287c35a5f5280b7900f75b354 -->

Reiniciar una aplicación no debería borrar el trabajo que prometió conservar. Sin
embargo, un panel temporal puede ser seguro de reconstruir. La persistencia empieza
con esa distinción: decide qué información es autoritativa y cuál se puede
reconstruir. Un carrito y sus adiciones aceptadas en `mug-shop` nos dan un ejemplo
pequeño para seguir durante un reinicio.

En una aplicación basada en event sourcing, los eventos aceptados conservan el
historial de negocio. Las entidades y las consultas interpretan ese historial para
propósitos distintos. Conservar los eventos de forma segura es esencial, pero no
son los únicos datos que tu aplicación puede necesitar retener.

Todas las rutas de abajo son relativas a la raíz del proyecto `mug-shop` creado con
`neo new`. La lección explica primero la sustitución y después proporciona los
archivos completos de `ShopConfig`, la fábrica de almacenamiento y `App.hs` que
necesitas para el punto de control de Postgres. Si ya has añadido integraciones,
conserva sus imports y registros mientras incorporas los archivos completos de
persistencia.

## Identifica cada tipo de almacenamiento

| Información | Superficie de NeoHaskell | Decisión de la aplicación |
| --- | --- | --- |
| Eventos aceptados | `Service.EventStore` | Usa almacenamiento duradero antes de aceptar trabajo que deba sobrevivir a un reinicio |
| Resultados de consultas | `Service.QueryObjectStore` | Elige memoria o Postgres independientemente del almacenamiento de eventos |
| Bytes cargados | Almacén local de blobs configurado por `blobStoreDir` | Conserva y respalda los archivos reales |
| Propiedad y ciclo de vida de archivos | Almacén de estado de archivos | Elige estado persistente además de bytes persistentes |
| Secretos de proveedores conectados | `Application.withSecretStore` | Proporciona almacenamiento con la vida útil que necesite tu despliegue |

El starter configura `SimpleEventStore` con `persistent = False`. Una ruta con
apariencia de sistema de archivos en esa configuración no hace duradero el ajuste.
Es adecuado para el primer experimento; reiniciarlo pierde el historial de eventos.

## Sustituye la configuración por ajustes de base de datos

Continúa en tu propio directorio `mug-shop`. Los comandos siguen operando sobre tu
`neo.json`, `src/App.hs` y los módulos de `src/Shop/`. Este es el punto en que el
recorrido añade una base de datos; Cart y Stock no necesitaban una en las lecciones
anteriores.

Una contraseña es un primer ejemplo útil: es obligatoria, se proporciona desde el
entorno y se redacta al mostrar el registro de configuración:

```haskell
Config.field @Text "dbPassword"
  |> Config.doc "PostgreSQL password"
  |> Config.required
  |> Config.envVar "DB_PASSWORD"
  |> Config.secret
```

Las demás elecciones identifican el servidor y la base de datos, y establecen el
pool de conexiones y la política TLS. Sustituye `src/Shop/Config.hs` por el archivo
completo de abajo. Conserva el campo anterior `persistEvents` para que este overlay
siga siendo una extensión directa del punto de control de Build; después del cambio,
ese campo ya no controla el almacén de eventos Postgres y puedes eliminarlo cuando
nada más lo use.

<!-- complete-file -->
```haskell title="src/Shop/Config.hs"
module Shop.Config (ShopConfig (..), HasShopConfig) where

import Config (defineConfig)
import Config qualified
import Core

defineConfig
  "ShopConfig"
  [ Config.field @Bool "persistEvents"
      |> Config.doc "Keep local event files between development runs"
      |> Config.defaultsTo False
      |> Config.envVar "PERSIST_EVENTS"
  , Config.field @Text "dbHost"
      |> Config.doc "PostgreSQL host"
      |> Config.defaultsTo ("localhost" :: Text)
      |> Config.envVar "DB_HOST"
  , Config.field @Int "dbPort"
      |> Config.doc "PostgreSQL port"
      |> Config.defaultsTo (5432 :: Int)
      |> Config.envVar "DB_PORT"
  , Config.field @Text "dbUser"
      |> Config.doc "PostgreSQL user"
      |> Config.defaultsTo ("neohaskell" :: Text)
      |> Config.envVar "DB_USER"
  , Config.field @Text "dbPassword"
      |> Config.doc "PostgreSQL password"
      |> Config.required
      |> Config.envVar "DB_PASSWORD"
      |> Config.secret
  , Config.field @Text "dbName"
      |> Config.doc "PostgreSQL database name"
      |> Config.defaultsTo ("neohaskell" :: Text)
      |> Config.envVar "DB_NAME"
  , Config.field @Int "dbPoolSize"
      |> Config.doc "Event-store connection pool size"
      |> Config.defaultsTo (6 :: Int)
      |> Config.envVar "DB_POOL_SIZE"
  , Config.field @Text "dbSslMode"
      |> Config.doc "PostgreSQL TLS mode"
      |> Config.defaultsTo ("unset" :: Text)
      |> Config.envVar "DB_SSL_MODE"
  , Config.field @Text "dbSslRootCert"
      |> Config.doc "Root CA certificate path, or empty for none"
      |> Config.defaultsTo ("" :: Text)
      |> Config.envVar "DB_SSL_ROOT_CERT"
  ]
```

Los ajustes se asignan directamente a `DB_HOST`, `DB_PORT`, `DB_USER`,
`DB_PASSWORD`, `DB_NAME`, `DB_POOL_SIZE`, `DB_SSL_MODE` y `DB_SSL_ROOT_CERT`. Los
valores locales predeterminados coinciden con la base de datos Docker Compose del
proyecto generado. La contraseña es obligatoria para que una credencial ausente
produzca un error de configuración. Elige la dirección real de la base de datos
desplegada, sus credenciales, el presupuesto del pool y los requisitos TLS cuando
salgas de este ejercicio local.

## Crea una fábrica de almacenamiento

Crea `src/Shop/Storage.hs`. Mantén en este archivo la traducción de ajustes a
almacenamiento para que `App.hs` solo seleccione la fábrica. Empieza por su contrato:

```haskell
makePostgresConfig :: ShopConfig -> PostgresEventStore
```

La mayoría de los campos pasan un valor directamente, como `host = config.dbHost`.
El modo TLS necesita validación porque el entorno proporciona texto:

```haskell
      sslMode = case ConnectionConfig.textToSslMode config.dbSslMode of
        Ok mode -> mode
        Err message -> panic message,
```

Copia la fábrica completa siguiente. Pasa los ocho campos actuales de
`PostgresEventStore`, incluidos los ajustes de pool y TLS, y trata una ruta vacía de
certificado raíz como ausente.

<!-- complete-file -->
```haskell title="src/Shop/Storage.hs"
module Shop.Storage (makePostgresConfig) where

import Core
import Service.EventStore.Postgres (PostgresEventStore (..))
import Service.Infra.Postgres.ConnectionConfig qualified as ConnectionConfig
import Shop.Config (ShopConfig (..))
import Text qualified

makePostgresConfig :: ShopConfig -> PostgresEventStore
makePostgresConfig config =
  PostgresEventStore
    { user = config.dbUser,
      password = config.dbPassword,
      host = config.dbHost,
      databaseName = config.dbName,
      port = config.dbPort,
      poolSize = config.dbPoolSize,
      sslMode = case ConnectionConfig.textToSslMode config.dbSslMode of
        Ok mode -> mode
        Err message -> panic message,
      sslRootCert =
        if Text.isEmpty config.dbSslRootCert
          then Nothing
          else Just config.dbSslRootCert
    }
```

Un modo TLS desconocido falla durante el inicio; `unset` deja la negociación
predeterminada del driver. Un ajuste tiene efecto porque la fábrica lo pasa, no
porque una variable de entorno tenga un nombre de apariencia reconocida.

## Sustituye el cableado del almacén de eventos de la aplicación

En `src/App.hs`, añade este import:

```haskell
import Shop.Storage qualified as Storage
```

Sustituye el import de `SimpleEventStore` y la expresión
`Application.withEventStore` por la fábrica Postgres, conservando el transporte,
los servicios, las consultas y los registros de integración:

```haskell
  |> Application.withEventStore Storage.makePostgresConfig
```

El resultado completo de abajo continúa las lecciones de Cart–Stock y cargas, pero
sustituye el almacén de eventos. La observación temporal del temporizador ha
terminado, por lo que no aparece su registro. Si omitiste alguna funcionalidad,
omite su import y registro; conserva la autenticación u otras adiciones que hayas
hecho. `ShopConfig` y `Shop.Storage` son los dos archivos completos que acabas de
crear.

<!-- complete-file -->
```haskell title="src/App.hs"
module App (app) where

import Core
import Shop.Uploads qualified as Uploads
import Shop.Cart.Integrations.ReserveStockOnItemAdded (ReserveStockOnItemAdded)
import Service.Application (Application)
import Service.Application qualified as Application
import Service.Transport.Web qualified as WebTransport
import Shop.Config (ShopConfig)
import Shop.Storage qualified as Storage
import Shop.Cart.Queries.CartSummary (CartSummary)
import Shop.Cart.Service qualified as Cart
import Shop.Stock.Queries.StockLevel (StockLevel)
import Shop.Stock.Service qualified as Stock

app :: Application
app = Application.new
  |> Application.withConfig @ShopConfig
  |> Application.withEventStore Storage.makePostgresConfig
  |> Application.withTransport WebTransport.server
  |> Application.withService Cart.service
  |> Application.withQuery @CartSummary
  |> Application.withService Stock.service
  |> Application.withQuery @StockLevel
  |> Application.withOutbound @ReserveStockOnItemAdded
  |> Application.withFileUpload @() (\_ -> Uploads.uploadConfig)
```

No necesitas otro paquete en `neo.json`: el framework proporciona la
implementación del almacén de eventos. Conserva los pins de la CLI y del framework
de la misma versión de Neo para que el proyecto generado y estos ejemplos usen un
compilador y framework compatibles.

## Inicia la base de datos local y la aplicación

Con Docker y su comando Compose disponibles, usa el `docker-compose.yml` del
proyecto generado:

```sh
docker compose up -d postgres
docker compose exec postgres pg_isready -U neohaskell
neo build
DB_PASSWORD=neohaskell neo run
```

Espera a que `pg_isready` indique que la base de datos acepta conexiones. La
contraseña anterior es la credencial del ejemplo local de Compose. Proporciona las
credenciales reales mediante el mecanismo de secretos de tu despliegue. El cargador
de configuración lee el entorno del proceso; crear solo un archivo `.env` no
demuestra que haya llegado a la aplicación.

Si otro servicio local usa el puerto 5432, cambia el mapeo del host de Compose a un
puerto libre, como `55432:5432`, antes de iniciarlo y proporciona
`DB_PORT=55432` al ejecutar la aplicación o sus tests. No detengas una base de datos
no relacionada.

Cambiar de almacén no migra el historial anterior en memoria ni los archivos de
eventos locales activados con `persistEvents`. Crea el carrito del experimento
siguiente después de iniciar con Postgres. Para tests HTTP repetibles, detén la
aplicación en ejecución y usa `DB_PASSWORD=neohaskell neo test` contra esta base de
datos local desechable. La CLI inicia su propio servidor; los tests escriben datos,
así que nunca dirijas ese comando a una base de datos de producción.

## Los eventos y las consultas persistentes son independientes

Las consultas usan memoria salvo que proporciones un backend de almacén de consultas
con `Application.withQueryObjectStore` (también expuesto como
`useQueryObjectStore`). `PostgresQueryObjectStoreConfig` tiene sus propios ajustes
de conexión y pool. Los almacenes distinguen las consultas tanto por nombre como
por identificador de instancia, de modo que dos vistas de la misma entidad siguen
siendo independientes.

Hay un límite operativo importante: las API de suscriptor de consultas de nivel
bajo proporcionan soporte de reconstrucción con puntos de control y consciente del
hash, pero el cableado normal de `Application` construye actualmente
`Subscriber.new`. Elegir solo un almacén de consultas Postgres **no demuestra que
el inicio reanude desde un punto de control persistido**. Prueba el reinicio y la
reproducción con tu cableado real y tu lógica de proyección, especialmente si una
proyección acumula valores en lugar de sustituirlos.

## Demuestra la durabilidad con un cambio representativo

Usa las rutas de Cart de [HTTP y frontend](/es/build/http-and-frontend/) con la
configuración local de Postgres:

1. Crea un carrito, añade una cantidad positiva y guarda su identificador y contenido esperado.
2. Espera a que `CartSummary` muestre el resultado esperado, envía después una cantidad cero y verifica el rechazo.
3. Detén con Ctrl-C y vuelve a ejecutar `DB_PASSWORD=neohaskell neo run` desde el mismo proyecto, usando la misma base de datos.
4. Espera `/ready` y después obtiene el resumen del mismo carrito.
5. Compara el identificador, el recuento de artículos y el estado vacío/no vacío. Comprueba que la reproducción no haya contado dos veces una adición y que la solicitud rechazada no haya aportado nada.

Repite con un adjunto cargado si tu flujo lo usa. Que sobreviva una fila de base de
datos no demuestra que hayan sobrevivido los bytes correspondientes. Establece
también cómo se eliminan las cargas abandonadas: existe un worker de limpieza de
nivel inferior en `Service.FileUpload.Web`, pero el inicio actual de
`Application.withFileUpload` no lo lanza. Por tanto, establecer solo
`cleanupIntervalSeconds` no demuestra la limpieza automática. Verifica el cableado
del ciclo de vida elegido y vigila el crecimiento del almacenamiento.

Prueba a mover el proceso a un host nuevo conservando solo los recursos que
pretendías hacer persistentes. El carrito debería seguir siendo recuperable desde
el almacén de eventos conservado. Cualquier archivo o conexión de proveedor ausente
revela otra dependencia de persistencia; añádela al plan de despliegue y copias de
seguridad y repite el experimento. No deduzcas durabilidad de un reinicio normal
correcto por sí solo.

Continúa con [despliegue](/es/operate/deployment/) y [recuperación](/es/operate/recovery/).

<details>
<summary>Fuentes del framework y de los puntos de control</summary>

- [Campos del almacén de eventos Postgres](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/EventStore/Postgres/Internal.hs)
- [Análisis del modo TLS](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Infra/Postgres/SslMode.hs)
- [Base de datos local generada](https://github.com/neohaskell/NeoHaskell/blob/main/neo/starter/docker-compose.yml)
- [Configuración completa de persistencia](https://github.com/neohaskell/NeoHaskell/blob/main/website/examples/mug-shop/persistence/src/Shop/Config.hs)
- [Fábrica completa de almacenamiento de persistencia](https://github.com/neohaskell/NeoHaskell/blob/main/website/examples/mug-shop/persistence/src/Shop/Storage.hs)
- [Aplicación completa de persistencia](https://github.com/neohaskell/NeoHaskell/blob/main/website/examples/mug-shop/persistence/src/App.hs)

</details>
