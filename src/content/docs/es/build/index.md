---
title: "Construye tu aplicación"
description: Haz crecer un proyecto desde su primera solicitud hasta las decisiones, vistas, tests e integraciones.
sidebar:
  order: 0
---
<!-- translation-source-sha256: 99f407dc4a61200ac1fffefeb2d025a4c69aa842af22915a2daec5319a885508 -->

Una aplicación acepta solicitudes, aplica reglas, recuerda lo ocurrido y presenta
información útil. NeoHaskell da a esas responsabilidades lugares explícitos en el
código. Entender esas conexiones te ayuda a construir un comportamiento que puedas
explicar y verificar.

Este recorrido se mantiene dentro de **tu propio proyecto**, creado con `neo new
mug-shop`. Escribirás sus módulos, lo construirás con `neo build`, lo ejecutarás
con `neo run`, lo comprobarás con `neo test` y lo explorarás con `neo ide`. Cada
lección hace crecer la misma aplicación.

Nuestro proyecto de práctica recurrente vende una taza. El comercio electrónico
da significados conocidos a las cantidades, la disponibilidad y el trabajo
externo. Tu aplicación real puede gestionar citas, documentos, logística u otra
cosa; traslada el método a sus solicitudes y promesas.

## Elige tu profundidad

Si estás evaluando NeoHaskell, lee la introducción y las secciones de decisiones.
Explican los beneficios y las responsabilidades que conserva tu equipo. Empieza
por [por qué NeoHaskell](/es/start/why-neohaskell/) para conocer el caso general.

Si estás construyendo, completa [comenzando](/es/getting-started/) y sigue estos
hitos. Tu agente de programación puede entrar en los archivos y adaptarlos contigo.
La documentación sigue mostrando la implementación y su evidencia, para que puedas
cuestionar qué significa.

| Hito | Qué entenderás o construirás |
| --- | --- |
| [Tu primer slice funcional](/es/build/first-cart/) | Crea módulos Cart y lee el primer resultado de tu propia aplicación. |
| [Explora visualmente tu carrito](/es/getting-started/visual-ide/) | Conecta el comando, el evento y el resumen en el IDE de tu proyecto. |
| [Comandos y eventos](/es/build/commands-and-events/) | Añade una acción con una regla explícita de cantidad positiva. |
| [Entidades y estado](/es/build/entities-and-state/) | Explica cómo el historial aceptado informa la siguiente decisión. |
| [Consultas](/es/build/queries/) | Da forma a la información alrededor de la pregunta de un lector. |
| [Stock y checkout](/es/build/stock-and-checkout/) | Añade un segundo dominio e identifica la coordinación que necesita. |
| [HTTP y frontends](/es/build/http-and-frontend/) | Conecta una interfaz con resultados reales de la aplicación. |
| [Comprobar el comportamiento](/es/build/testing/) | Escribe comprobaciones de decisiones, reproducción y HTTP. |
| [Control de acceso](/es/build/access-control/) | Decide quién puede actuar y qué registros puede ver. |
| [Configuración](/es/build/configuration/) | Conecta los ajustes con sus consumidores reales. |
| [Revisa tu aplicación](/es/build/your-shop/) | Establece qué funciona y elige el siguiente slice útil. |
| [Fundamentos del lenguaje](/es/build/language-essentials/) | Lee la sintaxis desconocida cuando resulte útil. |

La página del lenguaje es un complemento, no un examen de entrada. Puedes entender
el significado de una acción antes de memorizar cada declaración que la sustenta.

## Haz crecer una promesa cada vez

La primera aplicación crea carritos vacíos. Después añadimos selecciones, un
resumen y decisiones de stock. La [sección de integraciones](/es/connect/) une
esas decisiones e introduce proveedores externos. [Ejecutar y evolucionar](/es/operate/) lleva el mismo proyecto a la persistencia, el despliegue y los cambios.

Cada paso tiene límites. Añadir algo a un carrito establece una selección; aceptar
un pedido requeriría política adicional. Una regla de reserva puede probarse antes
de tener un disparador. Una respuesta correcta de un proveedor debe relacionarse
con la operación que la solicitó. Mantén explícitos esos significados a medida que
crece el proyecto.

La aplicación introductoria usa un almacén en memoria y políticas públicas de
desarrollo local. Los capítulos posteriores introducen deliberadamente
almacenamiento duradero y autenticación, en lugar de suponer en silencio que ya
están configurados.

## Una primera decisión que te pertenece

¿«Dos tazas» significa una entrada de carrito con cantidad dos o dos selecciones
separadas? Usaremos una entrada por cada adición aceptada. Así, una adición de dos
tazas cuenta como una entrada en el resumen.

<details>
<summary>Razonamiento y comprobaciones sugeridos</summary>

Indica qué significa el recuento de la interfaz antes de implementarlo. Comprueba
un carrito vacío, una adición de dos unidades, una segunda adición y una cantidad
cero rechazada. Si tu aplicación debe combinar productos repetidos o mostrar el
total de unidades, diseña y prueba ese cambio explícitamente.

</details>

Empieza con [tu primer slice funcional](/es/build/first-cart/). Consulta el [glosario](/es/reference/glossary/) cuando necesites recordar rápidamente un término.
