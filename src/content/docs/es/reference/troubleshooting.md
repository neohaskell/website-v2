---
title: Soluciona problemas a partir de la promesa incumplida
description: Encuentra la capa responsable de los problemas de compilación, inicio, modelo, consultas e integraciones.
sidebar:
  order: 3
---
<!-- translation-source-sha256: 63260d6e67ce0ea44b7be21671009579395fd9bb7ffe81b9fa61cd2a488b8b61 -->

Empieza por lo que esperabas que ocurriera: que un proyecto compilara, que un
proceso iniciara, que un cambio aceptado se volviera visible o que un proveedor
confirmara una acción. Después localiza el primer punto en que la evidencia se
desvía. Esto te proporciona a ti y a tu agente un problema más pequeño que «la
aplicación está rota».

## Conserva un registro de diagnóstico útil

Registra el comando o la solicitud, el resultado esperado, el resultado real y la
reproducción segura más pequeña. Incluye el error relevante completo, pero elimina
secretos y datos privados. Ejecuta los comandos de aquí desde el directorio de tu
aplicación que contiene `neo.json`; en este recorrido es `mug-shop`.

| Síntoma | Primera comprobación | Siguiente acción |
| --- | --- | --- |
| `neo` no puede iniciar Nix | Nix está instalado y disponible en el shell actual | Vuelve a abrir el shell después de instalarlo; sigue [comenzando](/es/getting-started/) |
| La compilación indica que falta `neo.json` | Directorio actual | Ejecuta desde la raíz del proyecto generado |
| Desaparece un cambio generado de Cabal/Nix | Fuente de reconciliación | Expresa la configuración compatible en `neo.json` |
| La compilación rechaza un archivo bloqueado | `.locked-files` y cambios del árbol de trabajo | Revisa el cambio de dominio deliberado; consulta [evolución](/es/operate/evolution/) |
| La aplicación falla antes de enlazar HTTP | Primer error de inicio/configuración/base de datos | Corrige ese error antes de cambiar los tiempos de las sondas |
| `/health` tiene éxito, `/ready` devuelve `503` | Cuerpo de readiness y logs de reproducción | Distingue la reconstrucción del fallo |
| Un comando aceptado no es visible | Actualización de la consulta, identidad y revisión correcta | Sigue el recorrido del evento a la consulta |
| Una integración agota el tiempo | Resultado del proveedor e identidad de correlación local | Resuelve la incertidumbre antes de volver a enviar una acción externa |

## Falta un módulo o una dependencia nueva

Mantén los módulos de aplicación bajo `src/`, haciendo que la ruta coincida con el
nombre del módulo: `Shop.Cart.Core` pertenece a `src/Shop/Cart/Core.hs`. Comprueba
la escritura del import y que estés construyendo el proyecto correcto. Guarda el
archivo y ejecuta:

```sh
neo --ci build
```

La CLI descubre los módulos fuente y regenera los archivos gestionados del
proyecto. Para un paquete externo, edita `dependencies` en `neo.json`; no lo
agregues únicamente a los archivos de compilación generados. Un nombre de
dependencia simple se busca en el registro NeoPackages. Usa el prefijo explícito de
clave `hackage:` cuando quieras un paquete de Hackage. Consulta la [sintaxis de
dependencias](/es/reference/cli/#manage-project-dependencies).

Si una lección usa una API que no está disponible en la revisión fijada del
framework de tu proyecto, compara `neo --version` y `neo-version` en `neo.json` con
el contexto de versión de la lección. Actualiza deliberadamente y vuelve a ejecutar
`neo build` y `neo test`; un checkout local del framework no forma parte del flujo
de trabajo de la aplicación.

## Un modelo ausente es distinto de un modelo no válido

Ejecuta esto en la raíz del proyecto:

```sh
neo validate --json
```

El código de salida `4` significa que falta el archivo, `3` que no se pudo analizar
el JSON y `2` que el modelo analizado infringe su esquema o sus referencias.
Inspecciona la ubicación indicada antes de editar. Abre `neo ide` para trabajar con
el modelo visual; usa `neo inspect sync` solo cuando quieras actualizar el modelo
guardado a partir del código fuente.

Un grafo válido no demuestra que la aplicación implemente la política de
cancelación prevista. Verifícalo con [tests de comportamiento](/es/build/testing/).

## Hurl informa de conexión rechazada

`neo test` inicia la aplicación cuando hay tests Hurl y comprueba el puerto 8080
antes de ejecutarlos. Comprueba si el proceso se ha bloqueado, si otro proceso
ocupa el puerto y si has cambiado el puerto de la aplicación. En la implementación
actual la sonda de inicio está fijada en 8080; cambiar solo las URL de Hurl no
actualiza esa sonda.

Detén primero cualquier proceso de aplicación existente. Ejecuta `neo run`
localmente y lee el error de inicio; después detén esa ejecución de diagnóstico
antes de volver a probar `neo test`. El comando de test inicia su propio proceso;
un servidor ejecutándose por separado puede ocultar qué revisión probaste. Si el
servidor responde pero los tests que dependen de consultas compiten con la
reproducción, comprueba también `/ready`: la espera de inicio de la CLI acepta
cualquier respuesta HTTP.

Un inicio frío de Nix también puede agotar la espera actual de 60 segundos antes
de que la aplicación empiece a servir. Deja que el `neo run` de diagnóstico termine
de iniciar, comprueba su respuesta, detenlo y vuelve a intentar el test con el
entorno de compilación ya preparado. Trata un error real de configuración o de la
aplicación por separado de ese retraso.

## Falla la actualización de una consulta

Usa la [guía de readiness y logs](/es/operate/observability/). Conserva el nombre
de la consulta, la posición, la revisión y el fallo saneado. Comprueba la
conectividad de la base de datos y la decodificación de eventos antes de considerar
un cambio de datos.

El almacenamiento de eventos en Postgres no implica que el estado de las consultas
sea persistente. El estado persistente de las consultas no implica que el cableado
normal de la aplicación reanude desde puntos de control. [Persistencia](/es/operate/persistence/) explica estos límites. No borres el historial de eventos para que una vista aparezca vacía y sana.

## Fallan las conexiones de base de datos de forma intermitente

Haz inventario de los pools y listeners de todas las revisiones en ejecución.
Comprueba los tamaños de pool configurados y la capacidad disponible de la base de
datos. Las conexiones del listener necesitan un endpoint directo que conserve la
sesión; el pooling en modo transacción no puede proporcionar el comportamiento
`LISTEN/NOTIFY` requerido.

Comprueba la configuración TLS de cada almacén conectado. El campo `DB_SSL_MODE`
añadido en [persistencia](/es/operate/persistence/) solo afecta a los almacenes a
los que se lo pasas. No es un interruptor universal para todos los clientes de
Postgres.

## Devuelve a tu agente una tarea enfocada

Por ejemplo, una tarea de diagnóstico en el proyecto de práctica de comercio
electrónico podría ser:

> «El comando se acepta en la revisión A. Readiness pasa a estar lista, pero la
> consulta de este usuario omite el carrito. Encuentra la consulta y su política de
> acceso, conserva esa política y dame un test que distinga un error de proyección
> de un error de propiedad».

Esto indica la evidencia y conserva la restricción de negocio. Cuando el agente
proponga una corrección, repite la reproducción original y un caso de rechazo
cercano.
