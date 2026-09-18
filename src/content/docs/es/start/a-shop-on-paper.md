---
title: "Prueba a modelar sin código"
description: "Usa un pequeño ejercicio de comercio electrónico para describir una regla y detectar el malentendido de un agente."
sidebar:
  order: 5
---
<!-- translation-source-sha256: ca3ed61c3312e85dfc0ec77ff6f400910bf9cfb5bfe3657b359063f2bf81232b -->

Empieza una aplicación de práctica con un producto: una taza. Un cliente solicita
dos tazas. El comerciante recibe la solicitud y decide cómo satisfacerla. Todavía
no hay proveedor de pagos, reserva de stock ni integración de envíos. El comercio
electrónico nos ofrece un ejemplo conocido; la habilidad que practicas es
convertir una regla en un comportamiento que puedas comprobar en cualquier
aplicación.

Para este primer boceto, elige una regla sencilla: **una solicitud puede contener
entre una y cinco tazas**. Es una política ficticia para el ejercicio, no una regla
incorporada de NeoHaskell.

## Dibuja tres momentos

| Antes de la solicitud | Lo que pide el cliente | Lo que sabemos después |
| --- | --- | --- |
| No existe ningún pedido | Realizar un pedido de dos tazas | Se realizó un pedido de dos tazas |

La solicitud puede rechazarse. El hecho registrado describe algo aceptado. Por
eso «Realizar pedido» y «Pedido realizado» tienen funciones distintas, aunque las
palabras se parezcan.

La lista de pedidos del comerciante responde entonces a otra pregunta: «¿Qué
tengo que preparar?». La lista es una vista de los hechos aceptados. No debe
convertir una solicitud rechazada en un pedido nuevo.

## Trabaja con tu agente

> **Jess:** Los clientes pueden pedir de una a cinco tazas. Muéstrame la regla y
> los ejemplos antes de implementarla.
>
> **Agente:** Aceptaré cualquier cantidad positiva. Dos tazas tiene éxito; cero
> falla.
>
> **Jess:** Falta el máximo. ¿Qué ocurre con cinco tazas y con seis tazas?
>
> **Agente:** Cinco debe tener éxito. Seis debe rechazarse y no debe registrarse
> ningún pedido.

Jess no necesitó revisar una función para detectar el malentendido. Entendía la
regla de negocio y pidió evidencia en su límite. Más adelante, un test hará
repetible esa misma comprobación.

## Decide qué cuenta como éxito

| Solicitud | Resultado esperado |
| --- | --- |
| Dos tazas | Un pedido aceptado que contiene dos tazas |
| Cero tazas | Un rechazo, sin pedido nuevo |
| Cinco tazas | Un pedido aceptado en el máximo |
| Seis tazas | Un rechazo, sin pedido nuevo |

Pregunta también qué ve el cliente después de un rechazo. Una explicación útil le
ayuda a corregir la solicitud. Un fallo silencioso le deja adivinando si existe un
pedido.

## Tu primera variación

Cambia la regla del ejercicio para aceptar hasta doce tazas. Dile a tu agente qué
cambia y qué debe seguir siendo cierto. Elige los ejemplos que inspeccionarías
antes de aceptar su trabajo.

<details>
<summary>Razonamiento sugerido</summary>

Doce debe tener éxito y trece debe fallar. Cero debe seguir fallando. Dos debe
seguir teniendo éxito. Los pedidos aceptados anteriormente deben conservar sus
cantidades originales; una política nueva no debe reescribir lo que los clientes
ya pidieron.

</details>

Ya has practicado modelado, pruebas de límites y corrección de un agente. Intenta
nombrar un límite de tu propia aplicación: ¿quién lo establece?, ¿a qué solicitudes
afecta? y ¿cómo demostrarías que se respeta el límite?

A continuación, [da nombre a esas ideas](/es/start/event-modeling/). Cuando empieces a programar, el [ejemplo público de carrito](/es/build/first-cart/) proporciona bloques de construcción ejecutables; la política de pedidos anterior sigue siendo un ejercicio de diseño explícito.
