---
title: "Configuración"
description: Conecta los ajustes tipados con las partes de tu aplicación que los consumen.
sidebar:
  order: 9
---
<!-- translation-source-sha256: 3efdbe4acc9f0b262596a1e4e03d8517882c1c2c7856ae43dd8256fee4c90191 -->

Las aplicaciones necesitan ajustes distintos en cada entorno y, a la vez, deben
mantener coherentes sus reglas de negocio. La configuración da nombre a esas
elecciones, valida sus tipos y hace explícita la conexión con la aplicación en
 ejecución.

Una dirección de base de datos es configuración. El precio acordado de un pedido
pertenece al historial de negocio. Cambiar un ajuste mañana no debe reescribir el
acuerdo de ayer.

Los ejemplos siguientes muestran las declaraciones y el comportamiento
pertinentes, con cada destino identificado. Los fragmentos pequeños explican una
elección cada vez; los archivos ensamblados que aparecen más adelante incluyen los
imports necesarios para esas declaraciones. El [final completo de los archivos de
Build](/examples/mug-shop-build.tar.gz) es complementario e incluye el mismo punto
de control y los tests.

## Añade un ajuste que usará tu aplicación

Hasta ahora, tu aplicación siempre inicia con un historial en memoria vacío. Vamos
a hacer explícita la persistencia local como un ajuste de desarrollo, conservando
el mismo comportamiento por defecto.

Nombra primero la elección y su valor predeterminado:

```haskell
  [ Config.field @Bool "persistEvents"
      |> Config.doc "Keep local event files between development runs"
      |> Config.defaultsTo False
      |> Config.envVar "PERSIST_EVENTS"
  ]
```

Coloca el campo dentro de `defineConfig "ShopConfig"` en `src/Shop/Config.hs`. El
punto de control contiene la definición completa.

`defineConfig` genera un registro y su parser. El campo tiene documentación, tipo
Boolean, valor predeterminado y una variable de entorno. La macro requiere que
cada campo tenga documentación y una política deliberada de valor predeterminado
o valor obligatorio.

## Conecta el ajuste con el almacén

Después de completar las lecciones de Cart y Stock, conecta el ajuste con tu
**línea base de desarrollo local**. Si ya añadiste autenticación u otros registros,
consérvalos: añade el import de `Shop.Config`, inserta `withConfig @ShopConfig` y
sustituye solo el paso `withEventStore`. No descartes la configuración de permisos
de tu aplicación.

Los pasos relevantes de la canalización en `src/App.hs` son:

```haskell
  |> Application.withConfig @ShopConfig
  |> Application.withEventStore (\(config :: ShopConfig) -> SimpleEventStore
    { basePath = Path.fromText ".neo/events" |> Maybe.getOrDie
    , persistent = config.persistEvents
    })
```

`withConfig` registra el tipo que se cargará. La fábrica del almacén consume ese
registro cargado. Esta es la conexión importante: declarar `persistEvents` por sí
solo no cambiaría el almacenamiento.

## Añade valores obligatorios deliberadamente

Una credencial de proveedor puede ser un campo secreto obligatorio. Este es un
**fragmento de lista de campos** que debes añadir cuando se implemente el proveedor
correspondiente, no un requisito para la aplicación actual:

```haskell
  , Config.field @Text "providerKey"
      |> Config.doc "Credential for the selected external provider"
      |> Config.required
      |> Config.envVar "SHOP_PROVIDER_KEY"
      |> Config.secret
```

Tu integración debe consumir después `config.providerKey`. `required` establece la
presencia; no puede demostrar que el proveedor remoto aceptará la credencial.

`Config.secret` redacta el campo en la representación del registro generado y en
JSON. No cifra el valor ni impide que el código registre el campo sin ocultarlo
después de extraerlo. Conserva las credenciales reales en el mecanismo de
credenciales de tu despliegue.

## Verifica el consumidor, no solo el parser

El cargador lee los argumentos del proceso y las variables de entorno. Un archivo
`.env` no entra automáticamente en el entorno del proceso; usa un cargador
explícito o tu gestor de procesos si eliges ese formato.

Un campo llamado `httpPort` tampoco cambia automáticamente un listener. Tu
aplicación usa actualmente `WebTransport.server`, que escucha en 8080. Para un
puerto alternativo de desarrollo fijo, sustituye ese paso de la canalización por:

```haskell
  |> Application.withTransport (WebTransport.server {port = 8081})
```

Actualiza los clientes para que coincidan. El flujo HTTP actual de `neo test`
sondea el puerto 8080, así que conserva ese puerto para los tests del tutorial;
cambiar solo las URL de Hurl no cambia su sonda de inicio. Consulta la [referencia
de la CLI](/es/reference/cli/). Si después haces configurable el puerto, sigue el
valor analizado hasta el transporte real y verifica la dirección en escucha.

## Ensambla el punto de control de persistencia local

Ya has visto el campo y el consumidor por separado. En el mismo proyecto
`mug-shop`, crea o sustituye `src/Shop/Config.hs` por el archivo completo siguiente.

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
  ]
```

Después sustituye el cableado de la aplicación en `src/App.hs` por este punto de
control local completo. Si ya has añadido la variante autenticada de [control de
acceso](/es/build/access-control/), conserva esa política e inserta los pasos
`withConfig` y `withEventStore` en tu canalización actual en lugar de sustituir el
archivo entero.

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
import Shop.Config (ShopConfig (..))
import Shop.Cart.Queries.CartSummary (CartSummary)
import Shop.Cart.Service qualified as Cart
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
```

Ejecuta `neo build` después de crear o sustituir estos archivos. Con la
configuración predeterminada, ejecuta `neo test` y después elimina `.neo/events`
si quieres un ejercicio local nuevo. Con `PERSIST_EVENTS=True`, conserva el
directorio de eventos de la aplicación entre reinicios y verifica que el mismo ID
de carrito siga teniendo su resumen. Este es un punto de control de desarrollo,
no una garantía de recuperación duradera en producción.

Para el ejercicio de reinicio, detén los demás servidores y ejecuta:

```sh
PERSIST_EVENTS=True neo run
```

Usa `True` y `False` con mayúscula inicial: este campo Boolean usa el parser de
valores Haskell tipados. Crea un carrito y conserva su ID. Detén el servidor y
vuelve a ejecutar el mismo comando. Lee el resumen del carrito y deja tiempo para
la reconstrucción y la proyección. Los carritos existentes de ejecuciones
anteriores en memoria no se migran a archivos al activar el ajuste.

El [capítulo de persistencia](/es/operate/persistence/) explica cómo pasar a
PostgreSQL y comprobar la recuperación duradera. Los archivos de eventos locales
son una opción de desarrollo útil; operar una aplicación también requiere copias
de seguridad, evidencia de restauración, decisiones de retención y un acceso
adecuado.

## Ejercicio: ¿opcional o mal configurado?

Tu agente da a una clave de proveedor obligatoria un valor predeterminado de cadena
vacía para que el inicio tenga éxito. ¿Qué comportamiento quieres cuando el
proveedor no esté disponible o no esté configurado?

<details>
<summary>Razonamiento y comprobaciones sugeridos</summary>

Si la funcionalidad es obligatoria, exige la credencial y comunica un fallo de
inicio claro cuando falte. Si es opcional, modela explícitamente el estado
inactivo. Prueba una configuración válida, un valor obligatorio ausente y un valor
tipado no válido. Comprueba la redacción con credenciales de prueba inocuas y, por
separado, comprueba que el proveedor recibe el valor configurado.

</details>

Siguiente: [revisa tu aplicación](/es/build/your-shop/) antes de conectarla a más sistemas.

Referencia de API: [configuración](https://github.com/neohaskell/NeoHaskell/blob/main/core/config/Config.hs), [fábricas de aplicaciones](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Application.hs) y [almacén simple](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/EventStore/Simple.hs).
