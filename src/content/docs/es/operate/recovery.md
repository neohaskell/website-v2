---
title: Recupérate con evidencia
description: Ensaya restauraciones, distingue fallos de proyección de historiales perdidos y concilia efectos externos.
sidebar:
  order: 4
---
<!-- translation-source-sha256: 3efad6b471692ef116036de40f463296ac5478f053edd8e8318e41b845bebe28 -->

Restaurar una base de datos recupera una parte de la aplicación. Los sistemas
externos aún pueden recordar un trabajo que tu copia restaurada no tiene. La
recuperación debe tener en cuenta ambos historiales sin repetir operaciones
completadas ni olvidar en silencio las que quedaron pendientes. En un ejemplo de
comercio electrónico, esto podría significar conciliar un pago sin volver a cobrar
al cliente.

El historial de eventos ayuda a reconstruir el estado de la aplicación. No puede
recrear un adjunto perdido a partir de sus metadatos ni revertir por sí solo un
pago externo. La recuperación incluye los recursos y las organizaciones que rodean
a la aplicación.

## Identifica primero qué falló

| Observación | Investiga antes de cambiar datos |
| --- | --- |
| No hay respuesta de `/health` | Inicio del proceso, configuración, conexión de base de datos y enlace del puerto |
| `/health` funciona, `/ready` permanece en `503` | Progreso o fallo de reconstrucción de consultas |
| Está listo, pero una vista es incorrecta | Lógica de proyección, eventos almacenados, autorización y revisión en ejecución |
| Existen metadatos de archivo, pero falla la descarga | Volumen de blobs y estado del ciclo de vida del archivo |
| El proveedor tuvo éxito, pero el resultado de la aplicación es incierto | Identidad de transacción del proveedor e historial de seguimiento local |

Conserva los logs útiles y la identidad de la revisión que falló. Restablecer la
base de datos a ciegas puede destruir la evidencia necesaria para distinguir estos
casos.

## Ensaya una restauración en un entorno aislado

Completa primero [persistencia](/es/operate/persistence/); el almacén inicial en
memoria no conserva historial que pueda restaurarse. Antes de que las personas
dependan de datos conservados, ensaya con operaciones representativas:

1. Crea un historial conocido pequeño: un cambio aceptado, uno rechazado y cualquier adjunto o resultado de integración que admitas. En `mug-shop`, crea un carrito, añade una cantidad positiva y confirma que cero se rechaza.
2. Haz una copia de seguridad usando los procedimientos de base de datos y almacenamiento de archivos de tu entorno de alojamiento.
3. Restaura en un entorno aislado con los efectos salientes de producción desactivados o sustituidos por endpoints de prueba controlados.
4. Ejecuta `neo run` desde el proyecto restaurado de la aplicación con su configuración de almacenamiento aislada y espera `/ready`.
5. Compara las entidades y vistas reconstruidas con el historial conocido.
6. Verifica los bytes de adjuntos, los límites de autorización y el tratamiento del trabajo externo sin terminar.
7. Registra la duración de la recuperación y la última operación aceptada incluida en la copia de seguridad.

Incluye cargas abandonadas en ese ensayo. El módulo de carga de archivos tiene un
worker de limpieza, pero el inicio normal de la aplicación no lo lanza actualmente.
No supongas que una caducidad o un intervalo de limpieza configurado demuestre que
se han eliminado los bytes caducados.

Las dos últimas mediciones responden a preguntas de negocio: ¿cuánto tiempo podría
estar no disponible la aplicación y cuánto trabajo reciente podría necesitar
conciliación? NeoHaskell no elige esas tolerancias por ti.

## Ensaya con tu base de datos Postgres local

Para la base de datos de Docker Compose de [persistencia](/es/operate/persistence/),
puedes practicar una restauración solo de base de datos sin sustituir la original.
Detén `neo run` después de crear un carrito conocido y anotar su resumen. Desde
`mug-shop`, exporta la base de datos local a un archivo de copia protegido:

```sh
docker compose exec -T postgres pg_dump -U neohaskell -d neohaskell --format=custom > mug-shop.backup
```

Crea una base de datos nueva dentro del mismo servicio local de Postgres y restaura
en ella:

```sh
docker compose exec -T postgres createdb -U neohaskell mug_shop_restore
docker compose exec -T postgres pg_restore -U neohaskell --dbname=mug_shop_restore < mug-shop.backup
```

`createdb` debe fallar si la base de restauración ya existe. Elige un nombre nuevo
para una restauración posterior en lugar de sustituir datos que todavía no hayas
inspeccionado. Comprueba que ambos comandos tengan éxito antes de iniciar la
aplicación.

Si has añadido integraciones salientes reales, usa primero endpoints de proveedor
controlados o elimina sus registros en una revisión de aplicación aislada. Después
selecciona la base de datos restaurada mediante la configuración que añadiste:

```sh
DB_NAME=mug_shop_restore DB_PASSWORD=neohaskell neo run
```

Conserva cualquier `DB_PORT` personalizado que usaras para la base de datos local.
En otro terminal, comprueba `/ready` y recupera el resumen del carrito original con
el mismo identificador usando las solicitudes de [HTTP y frontend](/es/build/http-and-frontend/). Compáralo antes de ejecutar tests o crear más datos. La copia contiene datos de base de datos, incluido un historial de eventos potencialmente sensible; almacénala con la protección de acceso adecuada.

Este procedimiento restaura la base de datos de eventos. Los bytes cargados y los
almacenes de credenciales de proveedores separados necesitan sus propias copias.
Un `pg_restore` correcto es el comienzo de las comprobaciones de la aplicación, no
su sustituto.

## Entiende el límite de reconstrucción

Un suscriptor de consultas puede reconstruir vistas a partir de eventos y expone
estados de readiness. Existen APIs de nivel inferior `rebuildAllAsync`,
`rebuildFrom` y de puntos de control; son APIs de aplicación/framework, no un
comando `neo rebuild`.

El cableado normal de `Application` crea actualmente `Subscriber.new` sin conectar
automáticamente el almacén de puntos de control. Las filas persistentes de consulta
no demuestran por sí solas una reanudación basada en puntos de control. Prueba el
almacén exacto, la ruta de inicio y la lógica de proyección que uses; consulta
[persistencia](/es/operate/persistence/).

El almacén de consultas Postgres crea su tabla si no existe. No es un servicio
general de migración de esquemas. Las instalaciones existentes con un esquema de
tabla incompatible necesitan un plan de migración explícito.

## Recupera el trabajo externo mediante su identidad

Conserva suficiente información para relacionar una operación de la aplicación con
su equivalente externo. Para un flujo de pagos futuro en el proyecto de práctica
de comercio electrónico, eso significa conectar el pedido con la operación del
proveedor. Define qué ocurre cuando el proveedor acepta una solicitud pero la
conexión falla antes de que llegue la respuesta.

Este es un requisito de diseño de tu adaptador de pagos, no una afirmación de que
NeoHaskell distribuya un sistema completo de pagos y conciliación. La idempotencia
y la consulta de estado que admita el proveedor pueden orientar el diseño; sus
garantías exactas deben comprobarse frente al proveedor elegido.

## Ejercicio: interrumpe el traspaso

Para el diseño de pagos anterior, prepara una prueba controlada en la que la
operación externa tenga éxito pero la confirmación local se interrumpa. Reinicia e
inspecciona el resultado. Aplica el mismo método al efecto externo que realice tu
propia aplicación.

<details>
<summary>Qué verificar</summary>

El cliente no debería recibir un segundo cargo solo porque se perdió la primera
respuesta. La aplicación debería alcanzar un estado final correcto o mostrar un
estado pendiente claro que pueda conciliarse. Un timeout demuestra una respuesta
incierta, no que el proveedor no hiciera nada.

</details>

Siguiente: conserva esas garantías mientras [evolucionas la aplicación](/es/operate/evolution/).
