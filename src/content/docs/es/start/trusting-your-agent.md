---
title: "Aprende a confiar en tu agente de programación"
description: "Genera confianza mediante un modelo compartido, ejemplos explícitos y evidencia que puedas explicar."
sidebar:
  order: 7
---
<!-- translation-source-sha256: 5571aa8d3085df7eb49fb3f55c7a98321867ff229b9e4b8ac90a3d721a4fe676 -->

Trabajar con un agente de programación debería permitirte construir más de lo que
podrías implementar cómodamente a solas. Tú aportas una idea, la comprensión de
las personas que usarán el producto y el criterio sobre lo que debería ocurrir. El
agente ayuda a convertir esa comprensión en software funcional.

No deberías tener que revisar cada línea generada para avanzar. Sí necesitas una
forma de reconocer si el resultado significa lo que pretendías. El modelo
compartido, las convenciones, el compilador y los tests de NeoHaskell te dan varias
formas de plantear esa pregunta. Cada una aporta evidencia; juntas permiten
 delegar con confianza.

La confianza crece cuando puedes explicar las promesas de la aplicación y cómo las
comprobaste, y después entregar con seguridad la siguiente pieza de trabajo.

## Conserva la propiedad del significado

Un agente puede llenar los huecos con decisiones plausibles. Eso resulta útil al
elegir el nombre de un helper; es importante cuando decide quién puede cancelar
una reserva o si un pago fallido libera el stock reservado.

Antes de implementar, describe el resultado que quieres y proporciona algunos
ejemplos. Pide al agente que identifique los comandos, decisiones, eventos y vistas
afectados. Una explicación breve suele revelar un desacuerdo cuando todavía es
barato corregirlo.

Para una regla nueva, acuerda al menos tres casos: una solicitud aceptada normal,
una solicitud rechazada y un valor justo en el límite. Al cambiar una regla
existente, pregunta también qué debería ocurrir con el historial aceptado
anteriormente. Estos ejemplos convierten «haz que funcione» en un resultado que
puedes reconocer.

## Detecta pronto un malentendido pequeño

Imagina que la aplicación de práctica de comercio electrónico va a incorporar un
límite de tres unidades por solicitud nueva. Una versión anterior aceptaba cinco.
Este es un desacuerdo útil que conviene encontrar antes de que el agente cambie
nada:

> **Jess:** Limita a tres unidades las solicitudes nuevas. Las solicitudes
> aceptadas antiguas deben seguir entendiéndose tal como ocurrieron.
>
> **Agente:** Limitaré las cantidades a tres al reconstruir el carrito, para que
> todos los carritos respeten el límite.
>
> **Jess:** Eso cambiaría el significado de la solicitud antigua. Comprueba el
> límite al decidir sobre una solicitud nueva. Reconstruir el historial antiguo
> debe conservar las cinco unidades que ya aceptamos.
>
> **Agente:** Pondré la regla en la decisión de solicitud nueva y comprobaré tanto
> las solicitudes nuevas como la reconstrucción del evento aceptado antiguo.

El malentendido se puede recuperar porque el modelo da a Jess una pregunta clara:
¿este código decide qué puede ocurrir después o interpreta lo que ya ocurrió? Puede
cuestionar esa distinción sin escribir ella misma la implementación.

La corrección necesita evidencia. Pide solicitudes de dos, tres y cuatro unidades,
además de un evento antiguo aceptado de cinco unidades. Dos y tres deben aceptarse
según esta política propuesta; cuatro debe rechazarse; las cinco unidades
históricas deben seguir siendo cinco. Son requisitos de práctica, no un límite de
cantidad incorporado en NeoHaskell.

## Haz visible el ciclo de retroalimentación

![Una persona define la intención y los ejemplos, un agente propone e implementa un modelo, las comprobaciones producen evidencia y la persona revisa el resultado antes del cambio siguiente.](/diagrams/trust-loop.svg)

*La confianza crece mediante un ciclo repetible: explicar, modelar, implementar,
comprobar y revisar. Cada vuelta proporciona un punto de partida más claro para la
siguiente delegación.*

Para una funcionalidad, una corrección de bug o un cambio de política:

1. Explica la situación y la regla en lenguaje normal.
2. Pide al agente que muestre lo que ha entendido y nombre las decisiones pendientes.
3. Acuerda ejemplos que distingan un resultado correcto de un error plausible.
4. Delega la implementación y las comprobaciones pertinentes.
5. Inspecciona el resultado observable, incluida una variación que elijas tú.
6. Pregunta qué cubre la evidencia y qué sigue dependiendo de una condición no comprobada.

Cuando falla una comprobación, determina si es incorrecto el comportamiento o la
expectativa. Cambiar una expectativa puede ser adecuado cuando cambias
deliberadamente una regla. Eliminar una comprobación fallida sin resolver el
desacuerdo solo elimina evidencia.

## Entiende qué establece cada capa

Las distintas comprobaciones responden a preguntas diferentes:

| Evidencia | Qué ayuda a establecer | Qué no puede decidir por ti |
| --- | --- | --- |
| Modelo compartido y grafo del IDE | Se pueden inspeccionar los conceptos y las relaciones | Si elegiste la política correcta |
| Compilación correcta | La implementación satisface las relaciones de tipos que comprueba el compilador | Si la regla coincide con tu intención |
| Tests que pasan | Los ejemplos afirmados se comportan como se espera en el entorno probado | Si faltan ejemplos importantes |
| Comprobación con un proveedor externo | La interacción probada funciona con esa configuración | Cómo se comportará cada fallo real o solicitud repetida |
| Comprobaciones y observación del despliegue | La revisión desplegada muestra el comportamiento comprobado | Si funcionará cada condición futura |

El compilador puede rechazar errores estructurales que de otro modo serían fáciles
de pasar por alto. No puede saber si tres es el límite correcto, si debe permitirse
la cancelación o si una regla trata justamente a las personas. Son decisiones de
política. Los tests pueden expresar tus respuestas, pero pasar solo respalda los
casos que realmente comprueban.

Pide escenarios y resultados, no solo «todo está verde». Para una vista que se
actualiza de forma asíncrona, distingue «el comando fue aceptado» de «la vista ya
refleja el evento». Para una integración, distingue «preguntamos al proveedor» de
«el proveedor completó el trabajo». El [capítulo de testing](/es/build/testing/) desarrolla los mecanismos más adelante.

## Dos funciones diferentes para la IA

El agente de programación que tienes al lado cambia la implementación: escribe
código fuente, ejecuta comprobaciones y explica su trabajo. Tú revisas el cambio
propuesto antes de confiar en la aplicación resultante.

La IA dentro de una aplicación tiene una función distinta. Puede sugerir una
categoría, resumir un documento o proponer una acción. Si la diseñas para actuar
mediante comandos, solicita un cambio de dominio que las reglas de decisión de la
aplicación pueden aceptar o rechazar. Una respuesta segura de un modelo no es por
sí misma un evento aceptado.

Ninguna de las dos funciones elimina tu responsabilidad de definir el
comportamiento permitido. Debes diseñar las acciones disponibles, las reglas de
acceso y cualquier aprobación humana necesaria. Un agente de programación puede
implementar esos límites; la IA en ejecución debe operar dentro de los límites que
realmente implementaste. Los capítulos posteriores explican la [asistencia de IA](/es/connect/ai/) y las [herramientas restringidas](/es/connect/ai-tools/).

## Deja que la confianza crezca con la evidencia

Empieza con cambios pequeños cuyos resultados puedas inspeccionar fácilmente. A
medida que aprendas el modelo y veas que el agente maneja tus ejemplos de forma
fiable, delega slices mayores. Presta más atención donde un error tenga consecuencias
mayores: acciones externas irreversibles, cambios de acceso o cambios en la forma
de interpretar el historial antiguo.

La confianza puede ser específica. Puedes delegar con seguridad un cambio de
consulta conocido y pedir una explicación más cercana de un flujo de pago nuevo.
Deja que la evidencia guíe la profundidad de tu revisión.

Elige una regla de tu propia aplicación. Escribe un ejemplo que revele una
implementación plausible pero incorrecta y luego identifica la evidencia que
necesitarías.

<details>
<summary>Una comprobación personal útil</summary>

¿Puedes indicar el resultado esperado antes de ver la implementación? ¿Tu ejemplo
prueba un rechazo, un límite o un historial antiguo? ¿Podría el agente mostrarte el
resultado sin pedirte que aceptes su explicación por fe? Si es así, tienes una base
concreta para delegar.

</details>

Continúa para [configurar tu primer proyecto](/es/getting-started/). Usarás este
ciclo con pequeños ejemplos funcionales antes de aplicarlo a funcionalidades más
complejas.
