---
title: "¿NeoHaskell encaja con tu equipo?"
description: "Evalúa el valor, los costes y las responsabilidades de adoptarlo mediante un flujo de trabajo representativo."
sidebar:
  order: 4
---
<!-- translation-source-sha256: 5bb75ac6c014d9c9413cab28122fc00902e59e0da2b45add4f355c2ae567cb30 -->

Un framework se gana su lugar ayudando a tu equipo a resolver el trabajo que
importa. Para algunas aplicaciones eso significa explicar cómo se alcanzó una
decisión. Para otras, significa cambiar las reglas sin perder el significado de
los registros existentes o coordinar acciones con servicios que pueden fallar de
forma independiente.

Vale la pena evaluar NeoHaskell cuando estas preocupaciones dan forma a tu
aplicación. Su enfoque conecta las solicitudes de negocio, las decisiones
explícitas, los hechos aceptados y las vistas que utilizan las personas. Eso
proporciona a las personas y a los agentes de programación una estructura
compartida para construir y hablar sobre el comportamiento. La pregunta de
adopción es si esa estructura resuelve suficientes problemas como para justificar
aprenderla y operarla.

Empieza con un flujo de trabajo representativo y decide qué evidencia te daría la
confianza suficiente para continuar.

## Busca valor desde varias perspectivas

**Para la persona que construye la aplicación**, los comandos, eventos y consultas
con nombre ofrecen lugares donde colocar responsabilidades distintas. Puedes
pedir a un agente que implemente un comportamiento acotado, inspeccionar sus
decisiones y probar sus resultados. Esto resulta útil cuando entiendes mejor el
proceso que cada línea de código. Aun así necesitas comprenderlo lo suficiente
para reconocer una regla incorrecta y pedir evidencia significativa.

**Para especialistas de producto y dominio**, un modelo de eventos facilita hablar
de los pasos que faltan antes de que la implementación los fije por accidente.
«Una solicitud fue aceptada» y «el trabajo se completó» pueden aparecer como
hechos diferentes. Puedes preguntar qué ocurre entre ambos, quién tiene autoridad
y qué ve alguien cuando el progreso se detiene. El modelo se convierte en material
para una conversación, no en una especificación que solo su autor pueda interpretar.

**Para quien evalúa**, los límites explícitos ofrecen algo concreto que inspeccionar.
Elige una regla, síguela hasta su implementación y sus tests, y pide un cambio.
Evalúa si el equipo puede explicar las consecuencias y mantener el resultado. La
adaptabilidad es un resultado que debes demostrar en tu contexto, no una promesa
de productividad que aceptar sin evidencia.

**Para quienes operan el sistema**, separar el historial aceptado de las vistas
construidas a partir de él ayuda a plantear preguntas de recuperación. ¿Qué se ha
aceptado de forma duradera? ¿Qué vistas todavía se están poniendo al día? ¿Qué
ocurrió fuera de esta aplicación? Estas distinciones ayudan al diagnóstico, pero
operar el sistema sigue requiriendo almacenamiento, copias de seguridad,
monitorización y procedimientos de recuperación ensayados.

## Ajusta el enfoque al dominio

El modelo de aplicaciones basado en eventos de NeoHaskell merece especial
atención allí donde las cosas tienen ciclos de vida significativos:

- Una membresía se solicita, aprueba, renueva, suspende o termina.
- Una reserva se solicita, confirma, cambia o cancela.
- Una solicitud de subvención se presenta, evalúa, aprueba y sigue.
- Un pedido se prepara, acepta, satisface o corrige.

En cada caso, el último estado responde solo a una parte de la pregunta. También
puede ser necesario saber qué ocurrió antes o construir varias vistas de la misma
actividad. Un historial explícito puede cubrir esas necesidades cuando modelas
los hechos relevantes.

Un sitio de contenido estático, un script desechable o una pequeña herramienta de
consulta pueden ganar poco con esta estructura. Un producto especializado puede
necesitar paquetes de dominio maduros más que una nueva forma de modelar el cambio.
Por ejemplo, quien necesite una plataforma de comercio electrónico lista para usar
debe evaluar el trabajo de proporcionar pagos, envíos, impuestos y el resto del
comportamiento requerido. El proyecto de práctica de comercio electrónico enseña
conceptos del framework; no proporciona un producto comercial completo.

Usa la [guía de capacidades](/es/reference/capabilities/) para distinguir los
bloques de construcción disponibles del trabajo específico de la aplicación.
Evalúa directamente cada proveedor y entorno de despliegue necesarios.

## Trata el historial como un compromiso de diseño

Conservar hechos aceptados permite distinguir una acción anterior de una
corrección posterior. Eso puede ayudar a explicar disputas, reconstruir el estado
y crear vistas nuevas. También compromete a las versiones futuras de la aplicación
a comprender el historial que conservas.

Un compilador puede ayudar a detectar cambios incompatibles en el código. Los datos
históricos necesitan sus propias comprobaciones de compatibilidad. Renombrar un
campo, cambiar la interpretación de un importe o imponer un requisito nuevo a los
registros antiguos puede requerir una migración o reglas de interpretación
deliberadas. Incluye ese trabajo en el coste del cambio.

El historial también contiene solo lo que elegiste registrar. Un hecho que indique
que una solicitud fue rechazada no explica el motivo a menos que lo conserves.
Registrar un motivo no demuestra que fuera justo o correcto. Distingue una
observación, el juicio de una persona y una recomendación automatizada cuando esa
distinción sea importante para una revisión posterior.

## Decide quién puede actuar, preguntar y corregir

Las decisiones explícitas hacen visibles las preguntas de gobernanza. ¿Quién puede
cambiar una regla? ¿Quién puede solicitar una excepción? ¿Qué acciones puede
realizar un sistema automatizado y cuáles necesitan aprobación humana? ¿Cómo puede
alguien cuestionar un resultado?

Responde a estas preguntas como decisiones de la aplicación. Las comprobaciones
de permisos, la evidencia de apoyo, los pasos de revisión y los comandos de
corrección deben diseñarse y probarse. El historial de eventos no conserva
automáticamente a la persona responsable, la versión de la regla ni la evidencia
considerada.

Elige con el mismo cuidado qué conservar. Copiar solicitudes completas al
historial retenido puede conservar información personal innecesaria. Decide qué
contexto hace falta, dónde deben estar los detalles sensibles, quién puede leerlos
y cómo afectan al diseño los requisitos de conservación y borrado. Estas decisiones
pertenecen al comienzo de un piloto, cuando cambiar el modelo todavía es manejable.

## Cuenta los costes de aprendizaje y operación

Tu equipo aprenderá un lenguaje, una toolchain y una forma de modelar el
comportamiento de las aplicaciones. Prueba la [configuración compatible](/es/getting-started/) en las máquinas que usa el equipo y reserva tiempo para comprender la primera compilación y sus mensajes de error. Evalúa si alguien además de la persona autora inicial puede mantener el resultado.

Las consultas se actualizan por separado de los comandos aceptados, por lo que una
pantalla puede mostrar brevemente una vista anterior. Las acciones externas
introducen fallos parciales y reintentos. La operación duradera necesita decisiones
sobre bases de datos y despliegue, gestión de secretos y tests de restauración.
Son responsabilidades concretas que debes explorar en [operar una aplicación](/es/operate/), no detalles que posponer hasta el lanzamiento.

Considera también el ecosistema del que dependes: cobertura de integraciones,
trabajo de actualización, recursos para solucionar problemas y quién puede ayudar
cuando un problema cruza los límites del framework y la aplicación. Usa el piloto
para estimar estas responsabilidades.

## Ejecuta un piloto que pueda hacerte cambiar de opinión

Elige un flujo de trabajo con una regla real, un posible rechazo y un resultado
visible. Para una herramienta de reservas, reserva un lugar solo mientras quede
capacidad. Para el proyecto de práctica, añade una cantidad positiva a un carrito
existente. Escribe los resultados esperados de éxito, rechazo y límite antes de
implementar.

Después reúne evidencia que responda a tus preguntas de adopción:

1. Pide a otra persona que explique el comportamiento a partir del modelo y encuentre sus comprobaciones.
2. Introduce una regla deliberadamente incorrecta y observa si las comprobaciones la revelan.
3. Solicita una variación pequeña y examina qué contratos y tests deben cambiar.
4. Lee un historial antiguo representativo con la aplicación modificada.
5. Si la durabilidad importa, reinicia y ensaya la restauración usando los almacenes elegidos.
6. Si las integraciones importan, provoca un fallo del proveedor y explica el estado resultante.

Registra la confusión y las capacidades que faltan con el mismo cuidado que el
éxito. Compara el resultado con una alternativa conocida usando el mismo flujo de
trabajo y las mismas expectativas. Puedes continuar, reducir el uso previsto o
decidir que otro enfoque encaja mejor.

Una decisión útil nombra la evidencia, las responsabilidades sin resolver y el
siguiente experimento. Continúa con [el proyecto de práctica sobre el papel](/es/start/a-shop-on-paper/) cuando estés listo para probar el enfoque.
