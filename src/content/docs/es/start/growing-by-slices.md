---
title: "Haz crecer una aplicación mediante slices útiles"
description: "Construye un comportamiento comprensible cada vez, con conexiones explícitas entre funcionalidades."
sidebar:
  order: 3
---
<!-- translation-source-sha256: e363345e4100abe16e40eb8cd9f55f24cee8f2c6b62500a3c353ffefc2baa2da -->

Una aplicación rara vez llega como una idea completa. Resuelves un problema
inmediato, aprendes de quienes la usan y descubres el siguiente cambio útil. El
reto es mantener comprensible el trabajo anterior a medida que se acumulan esos
cambios.

NeoHaskell te ofrece una forma de describir el crecimiento en piezas pequeñas y
conectadas. Una solicitud, la regla que la evalúa, el hecho que produce y la
información que alguien ve pueden formar un **slice de funcionalidad**: un
comportamiento que puedes explicar, implementar y comprobar. No necesitas entender
cada parte de la aplicación para hablar de ese slice. Sí necesitas entender las
promesas que hace a sus vecinos.

Este enfoque encaja con servicios de membresías, herramientas de reservas,
procesos de aprobación y aplicaciones de comercio electrónico. El dominio cambia;
las preguntas siguen siendo reconocibles.

## Empieza con un resultado que alguien pueda reconocer

«Construir la base de datos» describe trabajo técnico. «Permitir que una persona
solicite un lugar y vea si se aceptó la solicitud» describe un resultado. Lo
segundo te da algo que comentar antes de elegir cómo implementarlo.

Para cada slice, responde cuatro preguntas:

| Parte | Pregunta | Ejemplo de comercio electrónico |
| --- | --- | --- |
| Disparador | ¿Qué inicia este paso? | Alguien pide añadir dos tazas a un carrito. |
| Decisión | ¿Qué debe ser cierto para que la solicitud tenga éxito? | El carrito existe y la cantidad es positiva. |
| Hecho | ¿Qué registramos si tiene éxito? | Se añadió un artículo con la cantidad solicitada. |
| Vista | ¿Qué debería poder ver alguien? | El resumen del carrito refleja la adición aceptada. |

El rechazo también pertenece a esta descripción. Una cantidad de cero no debe
producir un hecho de artículo añadido. Escribirlo proporciona a la persona, al
agente y a la implementación un límite compartido: pueden discrepar sobre el
código propuesto y seguir de acuerdo sobre el resultado que comprueban.

![Un slice acepta una solicitud y registra un hecho. Otros dos slices usan ese contrato de evento compartido: uno prepara una vista y el otro solicita una acción de seguimiento.](/diagrams/growing-by-slices.svg)

*Cada conexión lleva un significado explícito. Aceptar un paso no significa que
todos los pasos posteriores hayan tenido éxito.*

Un slice es una forma de dividir el comportamiento, no una regla sobre el tamaño
de una carpeta. Algunos slices aceptan solicitudes. Otros preparan una vista nueva
a partir de información existente o reaccionan a un hecho solicitando otra acción.
Su tamaño útil es aquel en el que puedes explicar el éxito y el fallo sin ocultar
un paso importante.

## Permite que las funcionalidades posteriores usen promesas anteriores

Supón que la aplicación ya registra solicitudes de membresía aceptadas. Añadir un
panel para revisores no debería obligar al panel a entender cómo estaba distribuido
el formulario de solicitud. Necesita la información aceptada y un significado claro
para «pendiente de revisión».

Eso es un **contrato explícito**: un acuerdo sobre qué información está disponible
y qué significa. En NeoHaskell, los comandos, eventos y consultas proporcionan a
esos acuerdos lugares con nombre dentro del programa. Un comando expresa una
solicitud; un evento registra un hecho aceptado; una consulta prepara información
para leerla.

Los contratos estables permiten que una funcionalidad nueva use una capacidad
existente sin entrar en su implementación. Los tests pueden comprobar cada regla
cerca de la decisión que la posee. Los tests de la conexión comprueban después si
las piezas funcionan juntas. Esto facilita razonar sobre los cambios; no hace que
las conexiones desaparezcan.

## Haz crecer el proyecto de práctica en pasos deliberados

El proyecto de comercio electrónico te ofrece un lugar conocido para practicar
esta forma de crecer:

1. **Crea un carrito.** Establece un carrito identificable antes de añadirle nada.
2. **Añade un artículo.** Acepta una cantidad positiva y explica con claridad el rechazo.
3. **Muestra el resultado.** Prepara un resumen del carrito, incluida la posibilidad de que un cambio aceptado recientemente aún no haya llegado a la vista.
4. **Conecta el stock.** Da al stock su propia decisión sobre si se puede reservar una cantidad y conecta después la acción del carrito con esa solicitud.
5. **Diseña la aceptación de pedidos.** Decide qué debe confirmarse antes de aceptar un pedido y qué ve la persona mientras la confirmación está pendiente.
6. **Añade servicios externos.** Decide cómo afectan al proceso los resultados de pagos, las notificaciones y los fallos.

Construirás las funcionalidades de carrito, resumen y stock en tu propio proyecto.
La aceptación de pedidos y los pagos amplían esa base con decisiones que tomarás;
son ejercicios de diseño posteriores. El [recorrido de construcción](/es/build/) presenta las piezas funcionales antes de que [el hito del proyecto de práctica](/es/build/your-shop/) te pida tomar más decisiones por tu cuenta.

Observa cómo cada paso introduce el motivo de otro concepto. El stock importa
cuando importa la disponibilidad. Una integración importa cuando una acción
aceptada necesita una respuesta en otro lugar. Aprendes la maquinaria cuando hay
una pregunta útil a la que puede responder.

## Mantén visibles las relaciones

Los slices pequeños todavía pueden participar en un proceso grande. En el flujo
que construirás, añadir un artículo a un carrito activa una solicitud de reserva de
stock separada. El carrito acepta su cambio antes de que termine esa solicitud
posterior. La decisión del stock puede rechazar una cantidad no disponible.

Esto significa que «artículo añadido» y «stock reservado» son promesas distintas.
Una aplicación completa debe decidir cómo comunicar y gestionar la diferencia.
¿Debe quedar pendiente el artículo? ¿Debe eliminarlo una reserva fallida? ¿Quién
puede volver a intentarlo? Dibujar la conexión revela esas preguntas; no elige la
política por ti.

El mismo problema aparece al aceptar una reserva antes de que termine un pago o al
aprobar un proyecto antes de que un proveedor confirme la entrega. Un límite útil
mantiene clara cada responsabilidad y deja visible el proceso general. Más
adelante, los [flujos de trabajo entre dominios](/es/connect/workflows/) explican cómo implementar esas conexiones y comprobar los casos de fallo.

## Dale a tu agente un límite dentro del que pueda trabajar

Una tarea acotada podría ser: «Permite añadir una cantidad positiva a un carrito
existente. Rechaza cantidades cero y negativas. Muestra evidencia de aceptación,
rechazo y carrito inexistente. Explica qué contratos existentes has cambiado».

Revisa si la regla elegida es correcta y pide después el siguiente slice con las
decisiones anteriores disponibles como contexto.

A medida que crece tu confianza, delega cambios más grandes cuyos límites aún puedas
explicar. El [IDE visual](/es/getting-started/visual-ide/) ayuda a conectar el
vocabulario con el código descubierto. Los tests hacen que los resultados
esperados se puedan inspeccionar. Ninguno sustituye la decisión de qué debería
hacer la aplicación.

## Planifica los contratos que acabarán cambiando

Un campo nuevo o un cambio en el significado de un evento puede afectar a varios
slices. El compilador ayuda a identificar usos incompatibles en el código que se
construye conjuntamente. No puede establecer que los registros almacenados
antiguos sigan teniendo el mismo significado, que un consumidor remoto se haya
actualizado o que una regla nueva sea adecuada para decisiones anteriores.

Trata ese cambio como trabajo coordinado: identifica consumidores, conserva
 ejemplos del historial antiguo y comprueba cómo la versión nueva lo lee y lo
explica. El [capítulo sobre evolución](/es/operate/evolution/) desarrolla esa
responsabilidad.

Con el tiempo, un historial significativo también puede conservar la memoria
institucional: qué se pidió, qué ocurrió y cómo respondieron las acciones
posteriores. Los motivos, la evidencia y la autoridad solo están disponibles si
eliges registrarlos.

Elige un proceso de tu propio dominio y dibuja su slice completo más pequeño,
incluido un rechazo. Después nombra el siguiente slice y la promesa que los conecta.

Siguiente: [sopesa el valor de adopción y los compromisos](/es/start/fit-and-tradeoffs/).
