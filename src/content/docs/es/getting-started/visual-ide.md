---
title: "Explora visualmente tu aplicación"
description: "Usa el modelo del IDE de Neo para hablar sobre el comportamiento y conectarlo con el código."
sidebar:
  order: 1
---
<!-- translation-source-sha256: 5f75827f46bf20138bfe3830aa38e93b3c96a4cb9bdf42deb24c9a74798c14f6 -->

Has creado un carrito y leído su resumen en el [ejercicio del primer carrito](/es/build/first-cart/). Ahora sigue ese mismo comportamiento en el IDE de Neo: la solicitud que enviaste, el hecho que registró y la información que leíste. Sigue trabajando en `mug-shop`, el proyecto que creaste durante la configuración.

Úsalo junto con las comprobaciones de comportamiento. Un grafo coherente te ayuda
a comprender un cambio; no demuestra que la aplicación ejecute la política
prevista.

## Mira el modelo antes de abrir el código

![El IDE de Neo en mug-shop muestra el comando azul CreateCart, el evento naranja CartCreated y la consulta verde CartSummary conectados en la primera funcionalidad de carrito.](/screenshots/neo-ide-overview.png)

*Tu primera funcionalidad de carrito: creación, hecho registrado y resumen.
Selecciona cualquiera de las capturas para ampliarla sin salir de esta página.*

Lee la imagen en tres pasadas:

1. **Encuentra una solicitud.** La tarjeta azul `CreateCart` representa pedir un carrito. Sigue su flecha hacia abajo hasta el hecho naranja `CartCreated`.
2. **Encuentra la información que alguien ve.** La tarjeta verde `CartSummary` recibe información de `CartCreated`. Sus campos incluyen `itemCount` y `isEmpty`. El IDE llama **consultas** a estas tarjetas verdes; representan el lado del modelo de lectura de la aplicación.
3. **Encuentra un lugar donde trabajar.** El panel izquierdo enumera capítulos y slices. Aquí, `CreateCart` y `CartSummary` dividen el capítulo Cart en piezas pequeñas que puedes comentar con tu agente.

Compáralo con los [modelos de eventos desarrollados](/es/start/event-modeling/). Esos dibujos siguen un ejemplo a lo largo del tiempo, incluidas pantallas sucesivas y valores concretos. El grafo del IDE muestra comandos, tipos de eventos y consultas reutilizables: una tarjeta `CartSummary` puede describir la vista después de muchos historiales diferentes. Sus flechas describen relaciones del modelo, no un registro en vivo de solicitudes ejecutándose.

## Continúa en tu proyecto de carrito

Si ya abriste el IDE durante el ejercicio del carrito, deja esa ventana abierta. Si
no, ejecuta esto desde el directorio que contiene el `src/` de la aplicación del
carrito:

```sh
neo ide
```

Usa el directorio `mug-shop` que creaste durante la configuración. A continuación,
sincronizarás su modelo con el código del carrito que añadiste bajo
`src/Shop/Cart/`.

Abre la dirección impresa, normalmente `http://127.0.0.1:2323`. El IDE se enlaza
al directorio del proyecto desde el que lo ejecutaste. Confirma el espacio de
trabajo mostrado en el estado de conexión antes de editar. El IDE y el servidor
HTTP de la aplicación son procesos separados con puertos distintos.

El modelo vive en `event-model.json`, en la raíz del proyecto. Es posible que un
proyecto nuevo aún no tenga ese archivo. Crea un modelo usando los controles del
canvas y haz una pequeña edición para que el guardado automático lo escriba. En
un espacio de trabajo nuevo, comprueba que no estés mirando un modelo antiguo
almacenado en el navegador; **New** inicia un modelo vacío y **Open** lee el
archivo actual del espacio de trabajo.

Los cambios se guardan automáticamente cuando hay conexión. Espera al estado de
guardado antes de cerrar y usa Git para conservar versiones significativas.
Cmd/Ctrl-S vacía el guardado automático pendiente; no crea un commit de Git.

## Conecta la imagen con el código fuente

Cuando el espacio de trabajo tenga un archivo de modelo, ejecuta esto desde otro
terminal en el mismo proyecto:

```sh
neo inspect
neo inspect sync
neo validate
```

`neo inspect` informa de la estructura de dominio descubierta. `neo inspect sync`
actualiza el modelo a partir del código fuente; escribe el archivo de modelo.
`neo validate` comprueba su esquema y referencias sin modificarlo. Después de la
sincronización de la CLI, haz clic en **Open** en el IDE (o vuelve a cargarlo) para
leer el modelo guardado; una escritura de la CLI por sí sola no difunde una
actualización mediante el observador de archivos fuente. La ausencia del archivo
de modelo es un fallo de validación, así que crea y guarda primero el modelo.

El IDE también observa los cambios del código fuente e intenta la misma
sincronización. Un cambio de campo en un nodo existente está diseñado para
conservar la distribución; una estructura recién descubierta puede activar una
actualización de distribución más amplia. Inspecciona el resultado después de
una gran refactorización.

La sincronización actualmente va **del código al modelo**. Editar la imagen no
genera el código de aplicación correspondiente. Comenta el modelo que quieres
con el agente de programación, deja que cambie el código fuente y compara la
imagen actualizada con tu intención.

## Lee una pequeña parte del comportamiento

Busca `CreateCart` y síguelo hasta `CartCreated`, y después hasta `CartSummary`.
Relaciona esos nombres con la solicitud que enviaste y el resumen del carrito
vacío que observaste en el ejercicio anterior. Pide a tu agente que te muestre
por dónde viaja el identificador del carrito en ese recorrido.

## Vuelve aquí a medida que crece el carrito

Después de añadir `AddItem` en [comandos y eventos](/es/build/commands-and-events/), vuelve a sincronizar el mismo proyecto y selecciona ese comando. ¿Qué información necesita y qué registraría si se acepta? La vista ampliada de abajo muestra lo que podrás inspeccionar entonces.

![Al seleccionar el comando azul AddItem se resalta su flecha hacia el evento naranja ItemAdded. AddItem lleva cartId, stockId y quantity; ItemAdded lleva entityId, stockId y quantity. Los demás nodos aparecen atenuados.](/screenshots/neo-ide-detail.png)

*Al seleccionar `AddItem` se resalta su conexión con `ItemAdded`. Acercar la
imagen hace legibles los campos; el modelo circundante permanece visible como
contexto.*

Aquí puedes seguir una pieza concreta de información: `quantity` entra en el
comando y aparece en el evento aceptado. El `cartId` solicitado identifica el
carrito cuyo evento lleva `entityId`. Pide a tu agente que te muestre la regla
correspondiente en el código fuente y demuestre que cero se rechaza. Ver un campo
llamado `quantity` te dice qué información viaja; no te dice qué valores acepta
la regla.

Usa los controles **+** y **−** del canvas para cambiar el zoom. Al seleccionar un
nodo se resaltan sus conexiones. Si la imagen queda fuera del área visible,
prueba **Fit View**; volver a abrir o cargar el modelo guardado también restaura
un encuadre inicial útil.

Cuando crezca el modelo de una aplicación, usa sus funcionalidades y capítulos
para concentrarte en un comportamiento. Sigue las conexiones a través de una
frontera cuando investigues otro dominio o un proveedor externo. **Tidy by flow**
ajusta la presentación; no corrige las reglas de negocio. El panel Problems ayuda
a localizar problemas de validación del modelo.

**Heal with AI** es una acción opcional de reparación del modelo que invoca el
flujo configurado de la CLI de Claude. La visualización, inspección, validación y
sincronización determinista normales no requieren usar esa acción. Revisa sus
cambios como revisarías la propuesta de otro agente; no demuestra el
comportamiento en ejecución.

## Conoce el alcance actual

El canvas Model está implementado. Actualmente, las lentes Schema, Logs y Emulate
muestran marcadores de posición para trabajo futuro. Usa los logs y tests de la
aplicación real como [evidencia operativa](/es/operate/observability/).

Mantén el enlace loopback predeterminado para el trabajo local. Enlazar con
`--host 0.0.0.0` expone el IDE en otras interfaces de red; las herramientas del
espacio de trabajo local no deben tratarse como una interfaz de producción para
clientes.

## Tu comprobación

Predice qué hará una segunda solicitud `CreateCart` para la funcionalidad que
tienes ahora. Envíala y encuentra ambos identificadores en el resumen. El grafo
sigue teniendo un único nodo `CreateCart`: describe un tipo de solicitud, no cada
ocurrencia. Pide a tu agente que localice el código que elige un identificador
nuevo y sigue ese campo desde el comando al evento y a la consulta.

Después de la lección siguiente, vuelve y comprueba también el rechazo de cantidad
cero. La tarjeta `AddItem` nombra la solicitud; su función de decisión determina
qué valores se aceptan.

Siguiente: [comandos y eventos](/es/build/commands-and-events/) explica la decisión detrás de estas conexiones. Para comandos individuales, consulta la [referencia de la CLI](/es/reference/cli/).

Evidencia de implementación: [servidor del IDE](https://github.com/neohaskell/NeoHaskell/blob/main/neo/src/commands/ide.rs), [sincronización del código fuente](https://github.com/neohaskell/NeoHaskell/blob/main/neo/src/ide/sync.rs) y [lentes actuales](https://github.com/neohaskell/NeoHaskell/blob/main/neo/assets/ide/src/ui/lenses/lenses.tsx).
