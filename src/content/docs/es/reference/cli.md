---
title: Referencia de la CLI de Neo
description: Consulta los comandos implementados, sus flags, efectos secundarios y códigos de salida de validación.
sidebar:
  order: 1
---
<!-- translation-source-sha256: 18040b84541530bf7ef56d16fde5be6c7d4d83c8e3cf9ba9a0dda4a08dec2185 -->

La CLI de Neo te ayuda a crear, construir, probar e inspeccionar un proyecto
NeoHaskell. Usa el comando que corresponda a tu objetivo inmediato; el IDE visual
ofrece otra forma de entender el mismo proyecto.

Ejecuta los comandos del proyecto desde el directorio que contiene `neo.json`.
Usa `neo --help` o `--help` con un comando para consultar la ayuda propia del
binario instalado. Esta página describe Neo 0.10.0, la versión usada en la
[configuración](/es/getting-started/); una versión instalada más antigua puede
diferir.

## Flags compartidos

| Flag | Efecto |
| --- | --- |
| `-v`, `--verbose` | Activa la salida de la CLI a nivel debug |
| `--ci` | Desactiva prompts interactivos, animaciones y colores |
| `--help` | Muestra la ayuda |
| `--version` | Muestra la versión |

`--ci` resulta útil en scripts repetibles. No convierte un test local en un
despliegue de producción.

## Crear, construir, ejecutar y probar

Esta secuencia usa `mug-shop`, el nombre recurrente del proyecto de práctica.
Sustituye el nombre por el de tu propio proyecto; los comandos funcionan igual.

```sh
neo --ci new mug-shop
cd mug-shop
neo build
neo run
```

`neo run` sigue sirviendo hasta que lo detengas con Ctrl-C. Deténlo antes de
ejecutar tests, porque `neo test` inicia su propio proceso de aplicación:

```sh
neo test
```

| Comando | Opciones | Comportamiento |
| --- | --- | --- |
| `neo new [project_name]` | `--library` | Crea un scaffold desde el starter incluido; el nombre es obligatorio en modo CI. Una biblioteca omite el lanzador y la sección del ejecutable. |
| `neo build` | `--watch`, `--skip-lock-check` | Reconcilia la configuración y construye; watch usa la realimentación de GHCi; skip solo omite la comprobación de bloqueo del build. |
| `neo run` | `--watch` | Reconcilia, construye y ejecuta; watch vuelve a construir y reinicia ante cambios. |
| `neo test` | `--watch` | Ejecuta los tests unitarios del proyecto y después los tests HTTP Hurl descubiertos. |

Build, run y test regeneran los archivos de build gestionados a partir de
`neo.json` y descubren módulos bajo `src/` y `tests/`. Tus módulos `Shop.Cart` y
`Shop.Stock` permanecen en la aplicación; la CLI gestiona su inclusión en el build.

Cuando existen tests Hurl, el comando de test inicia la aplicación y espera una
respuesta HTTP en `127.0.0.1:8080`. Esa espera acepta cualquier respuesta HTTP; no
espera el contrato de proyección de `/ready`. Mantén disponible el puerto de test
del proyecto y añade comprobaciones conscientes de readiness a los escenarios que
dependan de consultas reconstruidas. Un puerto personalizado de aplicación exige
prestar atención tanto a los destinos de test como a la sonda de inicio fija actual.

## Gestionar las dependencias del proyecto

`neo.json` es la fuente de las decisiones de dependencias de tu proyecto. Conserva
sus campos existentes `name`, `version` y `neo-version`, y edita el objeto
`dependencies` cuando tu aplicación necesite otro paquete. `neo-version` selecciona
la revisión del framework; es independiente de la versión instalada de la CLI que
muestra `neo --version`.

La tabla siguiente muestra la sintaxis compatible. Los nombres de paquetes y
repositorios son ejemplos de la forma de declaración, no dependencias requeridas
por la lección del carrito.

| Entrada de dependencia | Significado |
| --- | --- |
| `"package-name": "^1.2.3"` | Resuelve un paquete del registro NeoPackages cuya versión coincide con el rango |
| `"hackage:package-name": "^1.2.3"` | Resuelve explícitamente un paquete de Hackage |
| `"package-name": "github:owner/repository#revision"` | Usa la fuente y revisión de GitHub indicadas |
| `"package-name": "git:https://host/repository.git#revision"` | Usa otra fuente Git |
| `"package-name": "file:../package-directory"` | Usa un paquete local que mantienes junto a la aplicación |

Los rangos de versión usan formas como `^1.2.3`, `~1.2.3` y `>=1.2.3 <2.0.0`.
Un nombre de paquete simple va al registro NeoPackages; no recurre a Hackage en
silencio. Las fuentes Git sin revisión usan `main` por defecto, así que indica una
revisión revisada cuando importe la reproducibilidad.

Después de editar `neo.json`, ejecuta desde `mug-shop`:

```sh
neo build
neo test
```

Revisa los cambios generados y registra la decisión de dependencia junto con el
código de aplicación y los tests que la usan. No mantengas cambios separados en
los archivos regenerados `.cabal`, `cabal.project` o `flake.nix`. La CLI no tiene
un comando `neo add` en la versión descrita aquí.

## Explorar la aplicación

Inicia el IDE desde el directorio del proyecto:

```sh
neo ide
```

Para usar otro puerto del IDE, ejecuta `neo ide --port 2324`. Deja ese proceso
ejecutándose e inspecciona el mismo proyecto desde un segundo terminal:

```sh
neo inspect
neo inspect commands
neo inspect wiring
```

`neo ide` usa `127.0.0.1:2323` de forma predeterminada. `--host` acepta un literal
de dirección IP, no un nombre de host. Por ejemplo, `--host 0.0.0.0` expone el IDE
en otras interfaces IPv4; elige esto deliberadamente. Detén el servidor con Ctrl-C.

`neo inspect` imprime JSON. Sus vistas son `domains`, `commands`, `events`,
`queries`, `integrations` y `wiring`. Sin una vista imprime todo el proyecto
inspeccionado.

`neo inspect sync` es una **mutación**: actualiza `event-model.json` a partir del
código fuente. Los cambios de campos existentes pueden conservar la distribución;
los nodos nuevos activan trabajo de distribución. Úsalo cuando quieras actualizar
el modelo, no como informe de solo lectura.

Consulta el [recorrido del IDE visual](/es/getting-started/visual-ide/) para saber cómo leer ese modelo.

## Validar un modelo guardado

```sh
neo validate
neo validate ./event-model.json --json
```

La validación es de solo lectura. La ruta opcional usa por defecto
`event-model.json` en el directorio actual. Comprueba la integridad del esquema y
las referencias, no si tus reglas de negocio son correctas.

| Código de salida | Significado |
| --- | --- |
| `0` | Modelo válido |
| `1` | Fallo de E/S o de la herramienta |
| `2` | El modelo no supera la validación |
| `3` | JSON malformado |
| `4` | Archivo ausente |

`--json` emite el resultado estructurado de validación sin prefijos de logs
humanos; los códigos de salida conservan el mismo significado.

## Proteger archivos de dominio

```sh
neo lock --all
neo lock Cart
neo lock install
neo lock check
```

`neo lock [search]` usa una búsqueda difusa de archivos de dominio. `--all`, o no
indicar búsqueda, selecciona todos los archivos de dominio descubiertos. El
manifiesto vive en `.locked-files`. `install` escribe el hook de pre-commit de Git
y sobrescribe un hook existente en esa ruta; `check` detecta archivos bloqueados
modificados, incluidos cambios del árbol de trabajo. Consulta [evolución](/es/operate/evolution/) para conocer el problema de compatibilidad histórica que hay detrás.

El bloqueo prepara las rutas elegidas y `.locked-files`, y crea un commit de Git.
Comprueba antes `git status`: el contenido no relacionado que ya esté preparado
puede incluirse en ese commit. Conserva cualquier hook de pre-commit existente
antes de instalar el hook de bloqueo.

## Instalar las skills separadas del agente

```sh
neo skills setup --tool codex --dry-run
neo skills setup --tool codex
```

Este comando obtiene la biblioteca compartida de skills y la instala para las
herramientas seleccionadas. La documentación para personas permanece separada de
esas instrucciones.

Opciones de setup: `--tool` repetible (`claude`, `codex`, `kiro`, `cursor`),
`--all-tools`, `--skill` repetible, `--force`, `--dry-run`, `--refresh` y
`--no-primer`. `--dry-run` imprime el plan sin instalarlo en el proyecto, pero
obtener la biblioteca puede poblar la caché local; `--force` permite sobrescribir
destinos; `--refresh` vuelve a clonar la biblioteca; `--no-primer` omite el primer
mensaje siempre activo y el cableado de su archivo de instrucciones. `neo skills`
sin argumentos ejecuta setup.

La fuente de verdad es [la definición de la CLI](https://github.com/neohaskell/NeoHaskell/blob/main/neo/src/cli.rs). Para un fallo, usa [solución de problemas](/es/reference/troubleshooting/).
