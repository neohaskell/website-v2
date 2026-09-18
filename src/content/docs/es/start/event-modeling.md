---
title: "Describe la aplicación con eventos"
description: "Usa un modelo compartido para conectar solicitudes, decisiones, hechos registrados y lo que ven las personas."
sidebar:
  order: 6
---
<!-- translation-source-sha256: 68fc7492badcdb6e1b41f881daeed6e78a63fde57f51b1fe140a36479ccca065 -->

Antes de que una aplicación pueda hacer lo correcto, las personas deben ponerse de
acuerdo sobre qué significa «correcto». Una solicitud como «permitir que la gente
cancele» parece sencilla hasta que alguien pregunta: ¿cancelar qué?, ¿hasta cuándo?
y ¿qué ocurre con el trabajo que ya ha comenzado?

El modelado de eventos da a esas preguntas un lugar visible. Describes lo que
alguien quiere hacer, las reglas que deciden si puede suceder, los hechos que vale
la pena recordar y la información que las personas necesitan después. Puedes
hablar de todo esto sin leer el código de implementación.

Para quien evalúa NeoHaskell, el beneficio es la continuidad: las palabras usadas
para explicar un proceso tienen equivalentes en la aplicación. Para quien
construye con un agente de programación, el modelo ofrece un acuerdo compartido
que implementar y cuestionar. La elección de las reglas sigue siendo tu trabajo;
solo resulta más fácil verla.

## Aprende a leer la imagen

Un modelo de eventos sigue un ejemplo concreto a lo largo del tiempo. Léelo de
izquierda a derecha: la pantalla que usa alguien, su solicitud, el hecho aceptado y
la información preparada para la pantalla siguiente. Los pasos posteriores usan
información que ya apareció. Las pantallas se sitúan sobre el comportamiento de la
aplicación; los carriles separados pueden distinguir actores o partes de un
sistema. Esta distribución sigue la [introducción al modelado de eventos de Adam
Dymitruk](https://eventmodeling.org/posts/what-is-event-modeling/).

Tres colores ayudan a reconocer las funciones. También etiquetamos cada función
para que puedas leer los diagramas sin depender del color:

| Color y elemento | Pregunta que responde | Ejemplo |
| --- | --- | --- |
| Comando azul | ¿Qué cambio se solicita? | CreateCart |
| Evento naranja | ¿Qué ocurrió? | CartCreated |
| Modelo de lectura verde | ¿Qué información puede leer alguien? | CartSummary |
| Boceto de pantalla sencillo | ¿Qué puede ver o hacer la persona aquí? | Un botón para crear un carrito |

Estas son las convenciones descritas en la [introducción de Martin Dilger](https://eventmodelers.ai/docs/blog/documenting-software-with-event-modeling/). Un evento usa el tiempo pasado porque describe un hecho. Un modelo de lectura ofrece una presentación útil de esos hechos. La pantalla es un boceto aproximado de esa presentación, no otro tipo de evento de dominio.

Otras dos palabras ayudan a explicar lo que ocurre detrás de un comando. El
**estado de la entidad** es el conocimiento actual sobre la cosa que se está
cambiando. Una **decisión** usa ese conocimiento para aceptar o rechazar la
solicitud. Describimos las reglas junto a nuestros ejemplos; no necesitas añadir
maquinaria de implementación a la imagen.

## Primer ejemplo: crear un carrito vacío

Empieza con algo más pequeño que añadir un producto. Alguien quiere un carrito
vacío que pueda usar. Esta es la primera funcionalidad que construirás en tu
proyecto de práctica. Las pantallas son bocetos de la experiencia que la
aplicación ofrecerá.

![Una pantalla de creación de carrito activa el comando azul CreateCart y produce el evento naranja CartCreated; el modelo de lectura verde CartSummary proporciona una pantalla de carrito vacío.](/diagrams/event-model-first-cart.svg)

*Sigue la información desde la acción de una persona hasta un hecho registrado y
de vuelta a lo que ve. [Descarga el diagrama editable](/diagrams/event-model-first-cart.drawio).*

Lee el ejemplo en cuatro pasos:

1. La persona pide crear un carrito. **CreateCart** no necesita campos de entrada.
2. La aplicación elige un identificador de carrito nuevo y un identificador de propietario. El identificador de una persona autenticada proporciona el propietario; una solicitud anónima recibe un identificador de propietario generado.
3. **CartCreated** registra esos identificadores como `entityId` y `ownerId`.
4. **CartSummary** identifica el carrito mediante `cartSummaryId` e informa de `itemCount: 0` e `isEmpty: true`, lo que permite a la pantalla mostrar un carrito vacío.

El campo de propietario registra una relación; su mera presencia no establece una
política de acceso. Lo importante aquí es seguir la información: el identificador
del carrito se origina durante la creación y permite que solicitudes posteriores se
refieran al mismo carrito. Implementarás este recorrido en [tu primer carrito](/es/build/first-cart/).

## Segundo ejemplo: continúa la misma línea temporal

Ahora la persona selecciona un producto y solicita dos unidades. El modelo crece
hacia la derecha y conserva el paso de creación que hace posible la acción
siguiente.

![La línea temporal del carrito continúa desde CreateCart y CartCreated hasta AddItem con cantidad dos; después llega a ItemAdded y a un CartSummary actualizado que muestra una entrada e isEmpty false.](/diagrams/event-model-cart-journey.svg)

*La segunda acción usa el carrito creado antes. Su resultado proporciona la vista
siguiente. [Descarga el diagrama editable](/diagrams/event-model-cart-journey.drawio).*

**AddItem** recibe `cartId`, `stockId` y `quantity`. Aquí la cantidad es dos. Si el
carrito existe y la cantidad es positiva, **ItemAdded** registra el carrito como
`entityId`, junto con `stockId` y `quantity`.

El resumen muestra entonces `itemCount: 1` e `isEmpty: false`. ¿Por qué uno en vez
de dos? Este modelo de lectura concreto cuenta las entradas del carrito, no la
suma de sus cantidades. Una adición aceptada crea una entrada, incluso cuando esa
entrada tiene dos unidades. Su pantalla debe decir «1 entrada», no «1 unidad».

Este es exactamente el tipo de malentendido que puede revelar un modelo concreto.
Si quieres contar las unidades totales, ese es otro requisito de consulta que hay
que implementar y comprobar. La [lección de comandos y eventos](/es/build/commands-and-events/) sigue estos valores en el código que añadas a tu proyecto.

## Una solicitud no es un hecho

«Añadir dos tazas» y «se añadieron dos tazas» tienen significados distintos. La
primera puede fallar: quizá no exista el carrito. La segunda dice que la aplicación
aceptó el cambio. Mantenerlos separados evita tratar una solicitud esperanzada
como trabajo completado.

Que se haya aceptado una adición no significa que el pago haya tenido éxito ni que
se haya enviado un paquete. Cada uno de esos pasos necesitaría sus propias reglas y
evidencia.

Esta distinción resulta útil fuera del comercio electrónico. «Reservar la sala»
es una solicitud; «la sala quedó reservada» es un hecho. «Enviar el documento a
revisión» es distinto de «la persona revisora lo aprobó». Nombrar esos pasos revela
promesas que un único estado «terminado» podría ocultar.

Un rechazo no crea automáticamente un evento de dominio. Si tu aplicación debe
conservar los intentos rechazados y sus motivos, decide cómo representar ese
requisito de forma explícita. Un modelo útil describe tanto la aceptación como el
rechazo.

## Haz que la regla se pueda comprobar con ejemplos

Una línea temporal correcta aún deja margen para malentendidos sobre otras
solicitudes. **Dado–Cuando–Entonces** añade escenarios concretos: el historial ya
conocido, el comando solicitado ahora y el evento o rechazo esperado después. Los
escenarios de modelos de lectura describen la información esperada a partir de un
historial dado. Estas convenciones aparecen en la [hoja de referencia de Event
Modelers](https://eventmodelers.ai/cheatsheet/).

Para el segundo diagrama, usa estos escenarios:

| Dado | Cuando | Entonces |
| --- | --- | --- |
| Se ha creado un carrito vacío | AddItem solicita dos unidades | ItemAdded registra la cantidad dos |
| Existe el mismo carrito | AddItem solicita cero unidades | La solicitud se rechaza; no se registra ItemAdded |
| No existe ningún carrito para el identificador solicitado | AddItem solicita dos unidades | La solicitud se rechaza porque falta el carrito |

Después comprueba la vista por separado: dado el hecho de creación y la adición
aceptada, CartSummary debe informar finalmente de una entrada y de un carrito no
vacío.

Estos ejemplos distinguen una solicitud de un hecho y un hecho de su presentación.
También proporcionan a tu agente de programación un objetivo claro de
implementación. El compilador puede comprobar relaciones estructurales; estos
escenarios ayudan a comprobar si el comportamiento elegido coincide con tu
intención.

## Lo que ven las personas puede llegar un momento después

Aceptar un comando y actualizar la información de una pantalla son pasos
separados. Los modelos de lectura de NeoHaskell se actualizan de forma asíncrona:
consumen los cambios después de que esos cambios se hayan aceptado. Por tanto, una
persona puede recibir un acuse antes de que una consulta muestre el resultado nuevo.

Esta es una cuestión de diseño que puedes tratar antes de implementar. ¿Debe la
pantalla mostrar «actualizando»? ¿Qué resultado confirma que el cambio solicitado
es visible? Si el resumen no cambia durante un instante, ¿debe la persona esperar
o enviar otra solicitud? Enviar el comando repetidamente podría solicitar más
trabajo; no equivale a actualizar la vista.

Separar las vistas también permite que lectores distintos hagan preguntas
 diferentes sobre la misma actividad. Un resumen de carrito y una vista general de
stock responden a necesidades distintas. Su existencia no convierte los cambios
del carrito y del stock en una acción indivisible; la [coordinación entre ambos](/es/build/stock-and-checkout/) necesita su propio diseño.

## Cuando el siguiente actor es la aplicación

Algunos pasos empiezan sin que una persona pulse un botón. Event Modeling usa un
engranaje para una **automatización**: la información está disponible, un proceso
reacciona y emite el comando siguiente. El [patrón de automatización de Event
Modelers](https://eventmodelers.ai/cheatsheet/) lo muestra como eventos que
alimentan un modelo de lectura, seguido de automatización, comando y un evento
nuevo.

Las dos imágenes del carrito se centran en el recorrido de la persona. Más
adelante podrías añadir un paso separado de reserva de stock y explicar su
disparador y resultado. Ese paso nuevo necesita sus propias reglas y escenarios de
fallo; una flecha no promete que todos los pasos terminen juntos ni que el trabajo
externo ocurra exactamente una vez.

## Dibuja un slice pequeño y completo

Un **slice** es una pieza útil de comportamiento que puedes describir y comprobar
conjuntamente. Empieza con la pantalla y la solicitud. Añade la regla y el evento
resultante, y después el modelo de lectura que se necesita. Incluye escenarios de
aceptación y rechazo. El primer diagrama te ofrece una forma pequeña y funcional
que puedes adaptar.

Pide a tu agente que te explique de nuevo el slice. Cuestiona las decisiones
faltantes: «¿Dónde se comprueba la cantidad?», «¿este hecho significa solicitado
o completado?» y «¿qué ocurre si falla el paso siguiente?». Son preguntas de
ingeniería importantes aunque todavía no puedas leer la implementación.

Los slices pequeños dan al agente una tarea acotada. Aun así comparten contratos:
cambiar el significado de un evento puede afectar a varios lectores. El modelo
hace visible esa dependencia. Más adelante, el [grafo del IDE de Neo](/es/getting-started/visual-ide/) conecta estos conceptos con el código para que puedas explorar visualmente sus relaciones.

## Prueba el modelo con tus propias palabras

Elige una acción pequeña de una aplicación que quieras construir. Describe una
solicitud aceptada, una rechazada y la información que alguien necesita después.
Luego pregunta qué tendrías que saber dentro de un mes para explicar el resultado.

<details>
<summary>Una forma de comprobar tu razonamiento</summary>

Usa el tiempo pasado para el hecho aceptado y un verbo para la solicitud.
Identifica la regla que separa tus ejemplos correctos y rechazados. Comprueba que
la vista responde a una pregunta real y que tu explicación permite actualizarla
más adelante. Por último, busca el contexto importante que suponías que se
recordaría pero que nunca incluiste en el modelo.

</details>

A continuación, usa este vocabulario compartido para [delegar con confianza en tu agente de programación](/es/start/trusting-your-agent/).
