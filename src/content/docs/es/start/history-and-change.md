---
title: El historial da significado al cambio
description: Entiende por qué los valores actuales son resúmenes, cómo las correcciones conservan el contexto y qué permite explicar un historial significativo.
sidebar:
  order: 2
---
<!-- translation-source-sha256: a2c5a277e67ec13d6109666beb338dfd2fc858b2b5b927b91b2267d3167573a6 -->

Abres una aplicación y ves que una solicitud fue rechazada. Eso te dice su estado
actual, pero deja sin respuesta las preguntas que realmente te importan. ¿Qué se
solicitó? ¿Qué regla se aplicó? ¿Faltaba información? ¿Alguien corrigió después la
decisión?

La misma brecha aparece en un saldo, una dirección de entrega o el indicador de
progreso de un proyecto. Un valor actual puede ser perfectamente exacto y, aun
así, decirte muy poco sobre cómo llegó a ser así. Cuando las personas dependen de
una aplicación para explicar decisiones, cambiar sus reglas o resolver errores,
ese contexto ausente importa.

NeoHaskell se construye alrededor de eventos significativos: los hechos que una
aplicación acepta y conserva sobre lo ocurrido. Para entender por qué, empieza
con un número conocido.

## El saldo es la respuesta a una pregunta

Imagina el registro simplificado de una cuenta bancaria. Empieza con 100 €, y su
propietario retira 30 €. El saldo actual es de 70 €.

Si la aplicación conserva solo el saldo actual, puede responder «¿Cuánto hay
ahora?». No puede responder «¿Por qué ese es el saldo?» basándose únicamente en
ese número. Los mismos 70 € podrían proceder de muchos historiales distintos.

Imagina en cambio que conserva el importe inicial y la retirada. La aplicación
calcula el saldo actual a partir de esas entradas: 100 € menos 30 € son 70 €. El
número útil sigue ahí, pero los hechos que lo explican también están disponibles.

![Un importe inicial de 100 € y una retirada de 30 € permanecen en el historial y producen un saldo actual de 70 €.](/diagrams/history-and-summary.svg)

El historial conserva las dos entradas significativas. El saldo resume su efecto;
mostrar 70 € no exige sustituir ninguna de las dos entradas.

Este es un ejemplo conceptual, no una funcionalidad bancaria proporcionada por
NeoHaskell. Su lección se aplica allí donde un valor presente resume una secuencia:
el estado de una membresía, el número de plazas disponibles o si un documento ha
sido aprobado.

El **event sourcing** convierte esa secuencia conservada en la base para
reconstruir el estado de la aplicación. La respuesta actual sigue siendo útil.
Además se puede explicar mediante los hechos que la produjeron.

## Una corrección puede decir la verdad sobre el error

Ahora supón que la retirada de 30 € se registró por accidente dos veces. El saldo
calculado pasa a ser de 40 €, aunque solo debería contar una retirada.

Cambiar directamente el número a 70 € repara lo que se muestra. Pero no explica
por sí solo qué entrada era incorrecta ni por qué estaba justificada la corrección.
Una persona que lo lea después ve la respuesta correcta sin el razonamiento
necesario para confiar en ella.

En el historial conservado, la aplicación puede registrar una reversión explícita
de la retirada duplicada. Las entradas originales permanecen y la corrección
contribuye con 30 € al saldo calculado.

![La retirada duplicada reduce el saldo registrado a 40 €; una reversión explícita añade 30 € y restaura los 70 € mientras conserva la entrada equivocada.](/diagrams/correction-history.svg)

La reversión identifica la entrada duplicada que corrige. El saldo resultante es de
70 € y el historial explica tanto el error como su reparación.

Esto requiere una operación diseñada. Alguien solicita la reversión; la aplicación
comprueba si esa entrada puede revertirse y si ya se corrigió. Si se acepta, la
reversión se convierte en otro hecho. La detección de duplicados y esas reglas son
responsabilidades del modelo de la aplicación.

Para un agente de IA, esta distinción es importante. «Haz que el número sea
correcto» es una instrucción incompleta. «Corrige este duplicado mediante la
operación de reversión permitida y muestra después el historial resultante»
describe una acción cuyo propósito y efecto se pueden comprobar.

## Una preferencia nueva no debe reescribir un acuerdo antiguo

Piensa en el proyecto de práctica de comercio electrónico que usamos en toda esta
documentación. Imagina que le añadimos pedidos y preferencias de dirección del
cliente.

Un cliente realiza un pedido para entregarlo en Ereván. Más tarde cambia su
dirección preferida a Lisboa. Ambas afirmaciones pueden seguir siendo ciertas: el
pedido anterior se hizo para Ereván y la preferencia actual es Lisboa.

Si el pedido antiguo muestra cualquier dirección que aparezca hoy en el perfil del
cliente, puede parecer que Lisboa siempre fue el destino acordado. Actualizar una
preferencia ha cambiado por accidente el significado de una transacción anterior.

Un modelo explícito da a estos hechos hogares separados. El pedido registra su
destino de entrega acordado. El perfil registra la preferencia para solicitudes
futuras. Si se permite cambiar un pedido existente, esa es otra operación con sus
propias reglas: quizá se pueda cambiar la entrega antes de enviarlo, pero después
haga falta otro proceso.

El framework no puede inferir esta distinción a partir de un campo llamado
«dirección». Tú y tu agente debéis identificar qué significa el valor y cuándo pasa
a formar parte de un acuerdo. El mismo razonamiento se aplica a un presupuesto
aprobado, una versión de documento aceptada o una elegibilidad evaluada según una
política anterior.

## El historial hace posibles preguntas nuevas

Una aplicación rara vez conoce todas las preguntas que sus usuarios acabarán
haciendo. Hoy pueden necesitar el estado actual. Más adelante querrán entender
cuánto dura un proceso, qué pasos se corrigen con frecuencia o dónde se atasca el
trabajo.

Los eventos conservados pueden servir para crear vistas nuevas de la misma
actividad. Una vista presenta el estado actual; otra explica la secuencia a quien
investiga un problema. En NeoHaskell, las **consultas** preparan información para
los lectores, mientras las entidades reconstruyen el estado usado para decidir qué
puede ocurrir después. Explorarás ambas cosas en los [capítulos de build](/es/build/).

Las preguntas disponibles dependen de la información registrada realmente. Un
informe nuevo no puede recuperar el motivo de un rechazo que nunca se conservó. La
marca de tiempo de un evento almacenado no demuestra automáticamente cuándo
ocurrió algo fuera de la aplicación. Si esa distinción importa, modela de forma
explícita el hecho externo y su hora.

Esta es una conversación útil antes de implementar: «¿Qué pregunta lamentaríamos
no poder responder?». La respuesta ayuda a elegir hechos y contexto significativos
sin intentar conservarlo todo.

## Los eventos, los logs de auditoría y las copias de seguridad tienen trabajos distintos

Una copia de seguridad ayuda a recuperar información almacenada después de una
pérdida. Los logs operativos ayudan a diagnosticar la ejecución. Un mecanismo de
auditoría puede conservar cambios y sus actores. Son herramientas valiosas, y las
aplicaciones que almacenan el estado actual pueden mantener historiales excelentes
mediante un diseño de auditoría deliberado.

El event sourcing sitúa los hechos de dominio aceptados en el camino que produce el
estado. «El pedido se canceló» tiene un significado que la aplicación entiende y
aplica. Un rastro técnico como «el campo cambió de 2 a 3» necesita interpretación
adicional para explicar el mismo resultado.

Eso no convierte automáticamente un historial de eventos en un registro de
auditoría completo. Un evento de cancelación puede establecer que hubo una
cancelación y omitir el motivo, la evidencia o la autoridad que la respaldan. Esos
detalles deben modelarse donde importen. Los metadatos de eventos de NeoHaskell
ofrecen lugares para identificadores y relaciones; los campos opcionales no se
rellenan solos con todas las explicaciones que necesitará una persona revisora en
el futuro.

Las copias de seguridad siguen siendo necesarias para el historial que prometes
conservar. Reconstruir el estado funciona con los eventos disponibles para la
aplicación; no puede reconstruir hechos perdidos a partir de un almacén vacío.

## Conserva el significado deliberadamente

Elegir un historial también significa elegir qué pertenece a él. Un evento útil
captura suficiente contexto para conservar su significado. No necesita copiar
cada campo de una solicitud ni guardar indefinidamente cada detalle sensible.

Decide qué debe seguir siendo explicable, quién puede inspeccionarlo y qué puede
eliminarse o almacenarse por separado. Si los detalles tienen una vida más corta
que el hecho al que apoyan, diseña explícitamente esa relación. Los cambios de
retención pueden afectar a la reconstrucción y los informes; comprueba qué sigue
siendo comprensible después.

El código futuro también debe interpretar fielmente los eventos anteriores. Cambiar
mañana el límite de cantidad no debe hacer desaparecer la solicitud aceptada de
ayer. [Evolucionar una aplicación](/es/operate/evolution/) desarrolla el trabajo de
compatibilidad que hay detrás de ese principio.

## Qué puedes pedir ahora a tu agente

Elige un valor en la aplicación que quieres construir. Pide a tu agente que
explique la pregunta a la que responde, los hechos que lo producen y cómo se
corregiría un cambio equivocado. Pregunta después qué contexto seguiría disponible
para quien revisara la decisión más adelante.

Para un ejercicio breve, usa el ejemplo de la dirección: una preferencia cambia
después de realizar un pedido y una solicitud independiente intenta cambiar ese
pedido después de enviarlo. Decide qué puede hacer cada operación antes de pedir
código.

<details>
<summary>Razonamiento sugerido</summary>

La nueva preferencia puede aplicarse a pedidos futuros, mientras el pedido anterior
conserva su destino acordado. Cambiar ese pedido requiere otra regla. Prueba un
cambio permitido, uno rechazado después del límite elegido y la misma solicitud de
cambio enviada dos veces. El historial debe explicar los cambios aceptados sin
convertir silenciosamente un rechazo en éxito.

</details>

NeoHaskell da a estas distinciones una estructura ejecutable. Sus garantías son más
estrechas que conocer la política correcta: una decisión bien tipada y rastreable
aún puede ser errónea. El beneficio es contar con una base más clara para
reconocerla, cuestionarla y corregirla mientras conservas el significado de lo
anterior.

A continuación, explora [crecer por slices](/es/start/growing-by-slices/) para ver cómo estos hechos conectan capacidades nuevas. Para conocer el método práctico de modelado, continúa con [modelado de eventos](/es/start/event-modeling/).

Fundamentos de implementación pública: [reconstrucción de entidades](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Entity/Core.hs), [definiciones de consultas](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Query/Core.hs), [metadatos de eventos](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Event/EventMetadata.hs) y [operaciones del almacén de eventos](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/EventStore/Core.hs).
