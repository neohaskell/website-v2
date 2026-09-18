---
title: "Revisa tu aplicación"
description: Comprueba el proyecto que has construido y elige la siguiente promesa significativa que implementarás.
sidebar:
  order: 10
---
<!-- translation-source-sha256: d1943b1dcb11690b1e384e67f7d0544df06c56ab72b7b7129b6a19c1a42dd13c -->

Un hito útil es un momento en el que puedes explicar el comportamiento de tu
aplicación y mostrar evidencia que lo respalde. Ahora tienes un proyecto con Cart y
Stock, decisiones explícitas, modelos de lectura y tests. Antes de añadir otra
capacidad, comprueba que estas piezas cuentan la misma historia.

Este es tu proyecto `mug-shop` de `neo new`. No hay ninguna transferencia a un
segundo espacio de trabajo. Las secciones siguientes continúan a partir de los
archivos que has escrito aquí.

## Comprueba la forma de tu proyecto

Tus archivos de dominio deberían incluir ahora:

```text
src/
  App.hs
  Shop/
    Config.hs
    Cart/
      Core.hs
      Entity.hs
      Event.hs
      Item.hs
      Events/CartCreated.hs
      Events/ItemAdded.hs
      Service.hs
      Commands/CreateCart.hs
      Commands/AddItem.hs
      Queries/CartSummary.hs
    Stock/
      Core.hs
      Entity.hs
      Event.hs
      Events/StockInitialized.hs
      Events/StockReserved.hs
      Service.hs
      Commands/InitializeStock.hs
      Commands/ReserveStock.hs
      Queries/StockLevel.hs
tests/
  Spec.hs
  Decider/Cart/CreateCartSpec.hs
  Decider/Cart/AddItemSpec.hs
  Decider/Cart/ReplaySpec.hs
  Decider/Stock/ReserveStockSpec.hs
  scenarios/create-cart.hurl
  scenarios/cart-flow.hurl
  scenarios/stock-flow.hurl
```

El lanzador generado y `neo.json` siguen formando parte del proyecto. `neo`
descubre los módulos de código fuente y tests, y mantiene los artefactos de build
generados. Conserva el proyecto en control de versiones para que un cambio
posterior tenga un punto de comparación claro.

## Ejecuta la evidencia

Detén el servidor de desarrollo si está en ejecución y ejecuta:

```sh
neo build
neo test
```

Los tests de decisión comprueban las cargas aceptadas, las entidades inexistentes,
la cantidad cero y la última unidad de stock disponible. La comprobación de
reproducción protege las entradas de carrito separadas. Las comprobaciones HTTP
crean sus propios carritos y esperan el resumen correspondiente.

Ahora ejecuta `neo run` y repite [las solicitudes de la lección de stock](/es/build/stock-and-checkout/#create-and-inspect-stock). Crea tres unidades de stock, crea un carrito y añade dos unidades. El carrito debe mostrar una entrada. El stock debe seguir mostrando tres disponibles y cero reservadas, porque la integración entre los dominios es la lección siguiente.

En otro terminal situado en la raíz de este proyecto, ejecuta `neo ide`. Sigue el
[flujo de trabajo del modelo](/es/getting-started/visual-ide/) para inspeccionar las
relaciones. El grafo ayuda a localizar el código; los tests establecen qué hace el
código.

## Explica el resultado sin jerga de implementación

Una explicación razonable es:

> «La aplicación registra las selecciones de una persona y rechaza las cantidades
> no válidas. También puede decidir si se puede reservar stock. Hemos probado esas
> reglas. Ahora conectaremos una selección aceptada con la decisión de stock y
> mostraremos qué ocurre cuando ese segundo paso falla».

Esa explicación hace concreto el siguiente trabajo. No depende de fingir que ya
existe un checkout completo.

## Elige el siguiente slice

| Hito | Evidencia que debes pedir |
| --- | --- |
| [Conectar Cart y Stock](/es/connect/workflows/) | Adición aceptada, resultado de reserva, ambas vistas y una reserva rechazada. |
| Aceptación de pedidos | Hecho de pedido aceptado explícitamente con precios, divisa, cantidades y contexto de entrega acordados. |
| Pago | Identidad del proveedor, gestión de duplicados, rechazos y conciliación después de una respuesta perdida. |
| Notificación | Trabajo de entrega aceptado o fallido sin reescribir el pedido subyacente. |
| [Funcionalidades asistidas por IA](/es/connect/ai/) | Revisión antes de publicar y protección contra respuestas tardías que sustituyan trabajo más reciente. |
| [Operar la aplicación](/es/operate/) | Reinicio duradero, evidencia de restauración, acceso autorizado y smoke tests contra la revisión desplegada. |

Algunas son integraciones desarrolladas; otras son ejercicios de diseño deliberados.
Elige una promesa, describe la aceptación y el rechazo, y después impleméntala y
verifícala antes de añadir otra.

## Ejercicio: define cuándo está terminado

Tu agente dice «el checkout está terminado» porque la solicitud devolvió 200.
Escribe la evidencia que necesitarías para aceptar esa afirmación según la política
de checkout que hayas elegido.

<details>
<summary>Razonamiento y comprobaciones sugeridos</summary>

Nombra el hecho que significa que el pedido fue aceptado. Identifica qué precios y
datos del cliente fija. Explica si la reserva y el pago son requisitos previos o
pasos posteriores, y cómo se representa cada rechazo. Prueba un éxito normal, un
fallo parcial y un resultado duplicado o retrasado. Un acuse HTTP solo demuestra la
aceptación del comando concreto.

</details>

Continúa con [integraciones](/es/connect/), usando el mismo proyecto y el mismo hábito de hacer visible cada promesa.
