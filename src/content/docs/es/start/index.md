---
title: "Encuentra tu camino"
description: "Aprende NeoHaskell paso a paso, evalúalo para tu equipo o consulta un problema concreto."
sidebar:
  order: 0
---
<!-- translation-source-sha256: af2cdc964d0cdd2001cd719d0d6411f2e63b82dd588e12801ab137f6d8d5d093 -->

No necesitas aprender los entresijos de un framework antes de decidir si ayuda a
tu aplicación. Tampoco deberías tener que releer una introducción cada vez que
olvides cómo configurar un servicio. Esta documentación sirve para ambos momentos.

## Evalúa antes de construir

Lee [por qué NeoHaskell](/es/start/why-neohaskell/), [historia y cambio](/es/start/history-and-change/), [crecer por slices](/es/start/growing-by-slices/) y [encaje y compromisos](/es/start/fit-and-tradeoffs/). Estos capítulos construyen la explicación mediante ejemplos y diagramas conocidos antes de introducir la implementación. Continúa por las secciones iniciales de las páginas de build, connect y operate. Explican las decisiones y sus consecuencias antes de introducir código. Las páginas avanzadas también empiezan con un problema reconocible de una aplicación.

Puedes terminar este recorrido siendo capaz de hablar con tu equipo sobre los
beneficios, el esfuerzo de implementación, las responsabilidades operativas y las
limitaciones. No necesitas ejecutar un ejemplo para comprender esas decisiones.

Los diagramas resaltan una relación cada vez: una solicitud y su resultado, un
historial y su resumen, o una funcionalidad y el contrato que comparte. Sus pies
explican la misma idea con palabras. Los diagramas se ajustan al ancho de tu
pantalla; selecciona uno para ampliarlo en el mismo sitio. Pulsa Escape o
selecciona el control de cierre para volver al mismo punto de la página.

## Construye con tu agente

La ruta principal es:

1. [Describe el comportamiento de la aplicación](/es/start/event-modeling/) y [acuerda cómo trabajar](/es/start/trusting-your-agent/).
2. [Configura un proyecto](/es/getting-started/) y [explóralo visualmente](/es/getting-started/visual-ide/).
3. [Construye aplicaciones](/es/build/): aprende comandos, estado, consultas y tests mediante ejemplos de carrito y stock.
4. [Conecta sistemas](/es/connect/) y añade funcionalidades de IA cuidadosamente acotadas.
5. [Opera y evoluciona tu aplicación](/es/operate/) con persistencia, comprobaciones de despliegue y recuperación.

El comercio electrónico es el ejemplo recurrente. El proyecto de práctica empieza
siendo pequeño y crece a medida que aprendes, para que veas cómo encajan los
conceptos. Las páginas de temas generales también funcionan por sí solas: puedes
aprender sobre consultas o permisos mientras construyes una aplicación
completamente distinta.

Los primeros ejemplos proporcionan decisiones y comprobaciones. Los ejercicios
posteriores te piden tomar una decisión, explicar su consecuencia o corregir la
propuesta de un agente. El razonamiento sugerido opcional te ayuda a evaluar tu
respuesta. Un agente puede escribir la implementación; tú sigues siendo
responsable de decidir qué significa tener éxito.

## Reconoce lo que promete un ejemplo

Un **ejemplo desarrollado** te proporciona código para añadir a tu propio proyecto
y comprobaciones para ejecutar. Un **fragmento parcial** enseña una parte de una
implementación e identifica el módulo circundante o el cableado de aplicación que
necesita. Un **ejercicio de diseño** te pide elegir e implementar un comportamiento
usando las herramientas que has aprendido.

Creas el proyecto de práctica una sola vez con `neo new` y luego lo evolucionas a
lo largo del recorrido. Los capítulos posteriores siguen usando su carrito, sus
tests, su configuración y su modelo visual. Los ejercicios más avanzados dejan en
tus manos las decisiones de negocio, pero muestran cómo implementar y verificar
los mecanismos que hay detrás.

Para obtener respuestas directas, usa la [guía de capacidades](/es/reference/capabilities/), la [referencia de la CLI](/es/reference/cli/), el [glosario](/es/reference/glossary/) o la [guía de solución de problemas](/es/reference/troubleshooting/). La contribución es una [rama separada](/es/operate/contributing/) que puedes tomar cuando resulte útil.
