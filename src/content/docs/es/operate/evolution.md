---
title: Evoluciona una aplicación sin reescribir su pasado
description: Separa los cambios de negocio, la compatibilidad de eventos históricos y la evolución de consultas.
sidebar:
  order: 5
---
<!-- translation-source-sha256: b841f211ce6aff16eeb0eba07b6e602f3f11dbfb8d1e1d740de0ed1a2b95eea1 -->

Los requisitos cambian mientras los datos existentes conservan su significado. El
código nuevo debe admitir ambas realidades. Por ejemplo, añadir texto opcional a
los registros nuevos no debe fingir que los usuarios anteriores lo proporcionaron.
En el proyecto de práctica de comercio electrónico, prueba a añadir una nota
opcional a los carritos recién creados mientras los antiguos conservan una
ausencia explícita de esa información.

Un sistema basado en event sourcing hace explícito el historial. Eso resulta útil
para explicar decisiones, pero crea una responsabilidad: el código futuro debe
seguir entendiendo los hechos que ya aceptaste.

## Clasifica el cambio antes de programar

| Cambio | Pregunta principal |
| --- | --- |
| Nueva regla para operaciones futuras | ¿Se puede reconstruir el estado existente antes de ejecutar la nueva decisión? |
| Nuevo tipo de evento | ¿Las revisiones antiguas y nuevas de la aplicación pueden leer los historiales que podrían encontrar? |
| Cambio en la forma de un evento almacenado | ¿Cómo seguirá siendo decodificable y significativo el JSON histórico? |
| Consulta nueva o modificada | ¿Puede reconstruirse correctamente a partir de todos los historiales compatibles? |
| Nuevo flujo de trabajo externo | ¿El despliegue o la reproducción podrían duplicar una acción externa? |

Usa [modelado de eventos](/es/start/event-modeling/) y el [IDE visual](/es/getting-started/visual-ide/) para identificar los consumidores afectados. Cambiar un evento puede afectar de formas distintas a comandos, consultas e integraciones.

## Conserva un fixture histórico

Antes de aceptar un cambio, conserva en tus tests un historial pequeño y
representativo. Incluye comportamiento anterior y posterior al cambio, además de
una operación rechazada. Para el ejemplo de comercio electrónico, usa un carrito
antiguo y uno nuevo con una nota. Comprueba que el código nuevo:

- Decodifica eventos persistidos antiguos y nuevos.
- Reconstruye el estado previsto para cada uno.
- Aplica la nueva regla solo donde lo requiera el negocio.
- Construye los resultados de consulta esperados después de la reproducción.
- No repite un efecto externo durante el ejercicio.

Que un tipo JSON compile correctamente no demuestra que el JSON histórico se
decodifique correctamente. Conserva los casos históricos junto a tus tests de
`Shop.Cart` y ejecuta `neo test` desde `mug-shop` contra una base de datos
desechable. Consulta [testing](/es/build/testing/) para obtener evidencia ejecutable.

## Usa el bloqueo del dominio como recordatorio

Desde la raíz de un proyecto generado, la CLI puede bloquear los archivos de
dominio descubiertos:

```sh
neo lock --all
neo lock install
neo lock check
```

Antes de bloquear, inspecciona `git status` y elimina el trabajo preparado no
relacionado. El bloqueo prepara los archivos seleccionados y `.locked-files`, y
crea un commit de Git; puede incluir contenido ya preparado. `neo lock install`
escribe la ruta del hook de pre-commit, así que conserva e integra deliberadamente
cualquier hook existente.

El manifiesto es `.locked-files`; el hook de Git instalado y `neo build`
comprueban si han cambiado las rutas bloqueadas. `neo lock check` incluye
modificaciones preparadas, no preparadas y sin seguimiento. El bloqueo ayuda a
hacer deliberado un cambio importante. No establece compatibilidad de esquemas ni
proporciona una implementación de migración.

`neo build --skip-lock-check` existe para omitir intencionadamente la comprobación
en tiempo de compilación. Trata por separado la cuestión subyacente de
compatibilidad histórica; omitir la comprobación no la responde.

## No supongas que los cambios de consulta se migran solos

El almacén de consultas de Postgres y el suscriptor exponen operaciones de hash y
puntos de control. Su existencia no significa que cada cambio en una función de
consulta se detecte o migre automáticamente, ni que el arranque estándar de la
aplicación habilite la reanudación desde puntos de control. Planifica y prueba una
reconstrucción con el cableado real de tu aplicación.

Para un esquema de consulta persistido incompatible, haz explícita la transición.
Conserva intacto el historial de eventos autoritativo y ensaya la transición sobre
una copia restaurada. Incluye si la revisión anterior puede ejecutarse contra los
datos resultantes; “revertir el binario” no siempre basta después de un cambio de
datos.

## Ejercicio: añade notas al carrito

Para el proyecto de práctica de comercio electrónico, pide a tu agente que
proponga cómo adquieren una nota opcional los carritos nuevos y qué muestran los
antiguos. Antes de aceptar el código, explica tú mismo el comportamiento del
historial antiguo.

<details>
<summary>Un límite de aceptación útil</summary>

Un carrito antiguo debe conservar su significado original, con una ausencia
explícita de nota. Un carrito nuevo con nota debe conservarla entre reinicios y
reproducciones. Una nota que infrinja tu política de tamaño o contenido debe
rechazarse antes de convertirse en un hecho aceptado. Elige la política exacta
para este ejercicio antes de comprobar la implementación.

</details>

Continúa con [seguridad](/es/operate/security/) o pasa a [contribuir a NeoHaskell](/es/operate/contributing/).
