---
title: "¿Por qué NeoHaskell?"
description: "Entiende por qué conservar el significado importa cuando las personas y los agentes de IA pueden cambiar el software rápidamente."
sidebar:
  order: 1
---
<!-- translation-source-sha256: b6fe62649e9204ef2f91dea39a7c8962432a7cbfb9f6eaaed07c25019081d6ea -->

Sabes qué quieres que haga una aplicación. Quizá deba organizar reservas, ayudar a
las personas a tomar decisiones, gestionar una membresía o seguir el estado de un
trabajo. Puedes explicar quién la usa, qué tiene permitido hacer y cómo es un
resultado correcto. Convertir esa comprensión en software es un reto. Mantenerla
intacta mientras el software cambia es otro.

NeoHaskell empieza por el segundo reto. Reúne un dialecto de Haskell, un framework
de aplicaciones y herramientas de desarrollo en torno a una ambición sencilla:
**deberías poder entender qué significa tu aplicación mientras las personas y los
agentes de IA la construyen y cambian.**

Esa ambición afecta a cómo describes una funcionalidad, cómo la aplicación recuerda
lo ocurrido y cómo decides si el trabajo de un agente está listo para usarse.
Puedes entender la idea antes de aprender un lenguaje de programación o instalar
nada.

## ¿Qué se vuelve importante cuando es más fácil producir código?

Un agente de programación puede convertir una solicitud breve en una cantidad
considerable de código. Puede escribir una pantalla, conectar un servicio y
proponer un cambio mientras tú todavía aclaras lo que querías decir. Eso hace más
accesible experimentar. También hace que una instrucción poco clara tenga
consecuencias muy rápido.

Imagina que pides cambiar la dirección de entrega. Hay varias interpretaciones
razonables: cambiar el valor predeterminado para pedidos futuros, cambiar un pedido
que todavía no se ha enviado o actualizar todos los pedidos asociados a esa
persona. Cada una puede producir código que se ejecuta. Expresan promesas distintas.

Por tanto, la pregunta difícil es más concreta que «¿funciona el código?». Es
«¿qué decisión tomamos, dónde se aplica y cómo podemos saber que la aplicación la
sigue respetando?». Una gran cantidad de código plausible no puede responder por sí
sola.

A esto se refiere *significado* en toda esta documentación. Un número representa
algo. Un estado afirma algo sobre un proceso. Un permiso concede autoridad a una
persona concreta. Un cambio solo es correcto con relación a esas intenciones.

> Cuanto más rápida es la implementación, más valioso resulta un modelo claro:
> hay menos tiempo entre un malentendido y el software construido a partir de él.

## Da una forma compartida a las ideas importantes

NeoHaskell organiza el comportamiento de la aplicación alrededor de algunos
conceptos que también pueden comentarse en lenguaje normal:

- Un **comando** pide que ocurra algo.
- Una **decisión** comprueba si esa solicitud está permitida en la situación actual.
- Un **evento** registra un hecho aceptado.
- Una **entidad** es aquello cuyo estado actual informa la decisión.
- Una **consulta** prepara información para quien necesita leerla.

Todavía no necesitas memorizar esos términos. Imagina una solicitud que llega a un
punto claro de decisión. Si se acepta, se convierte en un hecho registrado. Si se
rechaza, quien llama recibe un motivo y el cambio solicitado no se convierte en un
hecho.

![Una solicitud pasa por comprobaciones de acceso y una decisión basada en el estado actual. La aceptación registra un evento; el rechazo devuelve un motivo sin ese evento.](/diagrams/request-decision-event.svg)

*La aplicación evalúa la intención antes de registrar un cambio. El diagrama
describe el manejo normal de comandos; las políticas de acceso y las reglas de
negocio deben conectarse e implementarse en la aplicación.*

Para el proyecto de práctica de comercio electrónico, «reservar un artículo» es
una solicitud. «Se reservó un artículo» es un hecho aceptado. Confundirlos haría
que una pantalla prometiera stock antes de que la aplicación lo hubiera asegurado
realmente. La misma distinción importa para «aprobar esta solicitud», «reservar
esta cita» o «publicar este documento».

El vocabulario ayuda a localizar un desacuerdo. ¿No está clara la solicitud? ¿Es
incorrecta la regla? ¿Falta un hecho? ¿Muestra la pantalla información equivocada?
Son preguntas más pequeñas y útiles que pedir a un agente que arregle «el sistema».

## Recuerda cómo se formó el presente

Un valor actual suele ser un resumen. Un saldo resume movimientos de dinero. El
estado de una reserva resume una secuencia de solicitudes y decisiones. El nivel
actual de una membresía no explica por sí mismo qué condiciones se aplicaban el año
pasado.

Una aplicación puede conservar solo el último valor o preservar los hechos
significativos de los que se deriva. El framework de NeoHaskell usa el segundo
enfoque, llamado **event sourcing**. Los eventos aceptados forman el historial a
partir del que se reconstruye el estado de la entidad. Los modelos de lectura usan
eventos para preparar vistas útiles.

Esto da una forma visible al cambio. Una corrección puede registrar qué se corrigió;
una cancelación puede conservar el hecho de que algo se aceptó antes. Un informe
nuevo puede interpretar los hechos ya disponibles, en lugar de depender por
completo de lo que una pantalla mostrara en ese momento.

El historial tiene un límite. Si nunca registraste el motivo, el precio, la
identidad o la evidencia pertinentes, la reproducción no puede inventarlos. Elegir
qué hechos importan forma parte del diseño de la aplicación. El capítulo siguiente,
[historia y cambio](/es/start/history-and-change/), trabaja esta idea con pequeños
ejemplos que puedes comprobar a mano.

## Pon el modelo donde las personas puedan hablar de él

El **Modelado de eventos** es una forma de describir la secuencia de solicitudes,
decisiones, hechos aceptados e información que necesitan las personas. Permite que
quien entiende el proceso participe antes de que la implementación quede enterrada
en el código.

Por ejemplo, puedes señalar un paso y preguntar: «¿Qué ocurre si esta solicitud
llega dos veces?» o «¿Quién puede revertir esta decisión?». Puedes observar que un
correo puede fallar después de aceptar un pedido. Puedes exigir que la interfaz
distinga «solicitado» de «confirmado». Son aportaciones útiles aunque no puedas
escribir tú la implementación.

NeoHaskell da a esas ideas estructuras correspondientes en el programa. El IDE de
Neo también ofrece un grafo para explorar el modelo junto al código fuente. Hoy la
sincronización del código actualiza el modelo desde el código; dibujar una caja no
genera una aplicación completa. Puedes usar el grafo para explicar a un agente el
cambio previsto e inspeccionar cómo se conecta su implementación.

Un modelo útil permanece lo bastante cerca del programa como para que la
conversación continúe después de publicar la primera versión. Se convierte en algo
a lo que vuelves al tomar decisiones, investigar un problema o introducir a otra
persona en el proyecto.

## Haz comprensible el alcance de un cambio

Una funcionalidad suele ser más fácil de razonar cuando puedes seguir una pieza
completa de comportamiento: qué la activa, qué regla se aplica, qué registra y qué
puede ver alguien después. Lo llamamos un **slice**.

Un slice da al agente una tarea acotada y te da algo concreto que aceptar. «Permite
que una persona solicite una renovación y muestra si tuvo éxito» tiene un alcance
más claro que «construye la gestión de membresías». En el proyecto de práctica,
crear un carrito es el primer slice; preparar su resumen y conectar el stock son
pasos posteriores.

Los límites estables permiten que un comportamiento nuevo se apoye en hechos
existentes sin depender de cada detalle de la implementación anterior. Pueden
facilitar la revisión de cambios y dividir el trabajo entre personas o agentes. Un
evento compartido sigue creando una dependencia real: cambiar su significado puede
afectar a varios lectores. [Crecer mediante slices](/es/start/growing-by-slices/) explica el beneficio y esa responsabilidad.

## Qué aportan el lenguaje y el framework

El enfoque podría construirse con otros lenguajes. NeoHaskell reúne el vocabulario,
las convenciones y la maquinaria de ejecución para que trabajes dentro de una
estructura coherente.

Los tipos del lenguaje describen relaciones entre valores y operaciones. El
compilador puede rechazar piezas incompatibles antes de que se ejecute el programa.
El framework proporciona ejecución de comandos, almacenamiento de eventos,
reconstrucción de entidades, consultas y mecanismos de integración. La CLI ofrece
un recorrido común para crear, construir, probar e inspeccionar un proyecto.

Esas partes aportan formas distintas de evidencia. Un programa que compila aún
puede implementar un límite de cantidad inadecuado. Un test puede afirmar una
respuesta incorrecta. Un modelo puede omitir un rechazo importante. El valor está
en tener lugares concretos donde expresar y examinar cada preocupación, junto con
herramientas que comprueban tipos concretos de errores.

Tú sigues siendo quien decide para qué sirve la aplicación. Tu agente puede hacer
buena parte del trabajo de implementación, mientras tú aprendes a pedir evidencia
observable de que siguió las reglas previstas. [Trabajar con un agente](/es/start/trusting-your-agent/) muestra cómo evoluciona esa relación.

## El valor práctico que debes buscar

Para quien tiene una idea de aplicación, el beneficio es un camino más claro desde
una intención hasta una funcionalidad que pueda explicar y comprobar. Para un
equipo, es una forma compartida de hablar sobre cambios, conservar historial
importante e incorporar a otra persona al trabajo. Para quien evalúa adoptarlo, es
una base concreta para preguntar cómo seguirá siendo comprensible una aplicación
después de su primera versión.

Son beneficios que debes evaluar en tu propio trabajo. No implican una mejora
universal de velocidad ni que toda aplicación necesite event sourcing. Registrar un
historial útil, conservar su significado y operar un almacenamiento duradero
requiere esfuerzo. Un sitio estático pequeño puede tener pocos motivos para asumir
ese coste; un proceso de larga duración con revisiones, disputas y varias vistas de
la misma actividad puede tener muchos más.

Puedes continuar sin escribir código. Primero, mira [cómo un historial explica el
presente](/es/start/history-and-change/). Después explora [cómo crecen las
funcionalidades](/es/start/growing-by-slices/) y [si las compensaciones encajan con tu
proyecto](/es/start/fit-and-tradeoffs/). Cuando quieras probar el método tú mismo,
[el primer ejercicio de modelado](/es/start/a-shop-on-paper/) empieza con una regla
y algunos ejemplos.
