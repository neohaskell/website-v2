---
title: Contribuye con lo que has aprendido
description: Pasa de mejorar un ejemplo a cambiar el comportamiento público de NeoHaskell con evidencia reproducible.
sidebar:
  order: 8
---
<!-- translation-source-sha256: dbefca9b371fec0dec055ab38c00e49b1bd762675bdbabd9570e13cc17768571 -->

No necesitas entender todo el framework para mejorarlo. Un paso de instalación
confuso, un caso límite que falta o un ejemplo que ya no compila son buenos puntos
de partida. Tu experiencia aprendiendo NeoHaskell o construyendo una aplicación
es una señal de dónde puede atascarse el próximo lector.

La contribución nace del recorrido de la aplicación. Operar tu aplicación con
confianza no exige convertirte en mantenedor del framework.

## Empieza con una mejora acotada

Un buen primer informe incluye qué intentabas conseguir, la reproducción mínima,
el comportamiento esperado, el resultado real y la versión pertinente. Elimina
las credenciales y los datos privados antes de compartirlo.

En un cambio de documentación, conserva el recorrido de aprendizaje gradual:
explica primero la situación, proporciona un ejemplo correcto y di cómo puede el
lector verificar el resultado. Para un bug, añade un caso de regresión que falle
por el motivo indicado antes de cambiar la implementación.

## Encuentra el componente responsable

| Tema | Área del repositorio |
| --- | --- |
| Vocabulario del lenguaje y framework de servicios | `core/` |
| Ejemplos ejecutables de carrito/stock y tests de aceptación HTTP | `testbed/` |
| Integraciones de proveedores | `integrations/` |
| CLI de Rust e IDE visual incluido | `neo/` |
| Documentación para personas | `website/` |
| Decisiones arquitectónicas | `docs/decisions/` |

Lee el [README para contribuidores](https://github.com/neohaskell/NeoHaskell/blob/main/README.md) y el [mapa de capacidades](https://github.com/neohaskell/NeoHaskell/blob/main/codemap/README.md). El mapa conecta un concepto con su implementación y sus tests, de modo que una corrección pequeña no se convierta en una investigación ilimitada del repositorio.

## Trabaja con la toolchain del repositorio

Desde un checkout del repositorio NeoHaskell, los comandos `./dev` entran en el
entorno fijado cuando es necesario:

```sh
./dev watch
```

Mantén ese watcher ejecutándose mientras editas. En otro terminal:

```sh
./dev check
./dev test "EventStore" nhcore-test-service
./dev lint
```

`./dev test "EventStore" nhcore-test-service` es un ejemplo de selección de tests
enfocada. Elige los tests que establezcan tu cambio; una selección no relacionada
con el bug no aporta evidencia. Los tests de servicios pueden requerir
PostgreSQL y los tests de aceptación HTTP requieren sus fixtures reales. El README
para contribuidores describe la configuración.

Estos comandos del repositorio son distintos de `neo build` y `neo test`, que
operan sobre aplicaciones generadas. Los cambios de la CLI de Rust y del IDE
tienen sus propias instrucciones acotadas y capas de tests bajo `neo/`.

## Propón el comportamiento público antes de una implementación amplia

El repositorio usa especificaciones de cambios y pull requests en borrador para
los cambios gobernados. Una especificación explica la diferencia de API prometida
y nombra los tests que demuestran cada criterio. La revisión del mantenedor de
esa propuesta ocurre antes de la implementación mayor; la revisión final evalúa
el resultado implementado y su verificación.

Lee el [contrato de contribución actual del repositorio](https://github.com/neohaskell/NeoHaskell/blob/main/AGENTS.md) para conocer el alcance exacto, el flujo de ramas/stack, las puertas de revisión y las excepciones. No cambies las expectativas de tests existentes solo para convertir un fallo en un resultado verde. Explica qué cambió en el comportamiento visible para el usuario y obtén la revisión del mantenedor requerida.

## Profundiza cuando el cambio lo requiera

La arquitectura de servicios del núcleo separa decisiones de comandos,
persistencia de eventos, reconstrucción de entidades, consultas, transportes e
integraciones. Un cambio en un evento público puede afectar a varios de estos
componentes. Sigue los tests y las decisiones arquitectónicas responsables, y
verifica la aplicación de referencia pública además de la unidad local.

Un cambio en la CLI también puede cambiar cada aplicación generada a partir de
ese momento. El starter incluido y las comprobaciones de compatibilidad entre el
starter y el framework forman parte de esa responsabilidad.

**Prueba una primera contribución:** elige un momento confuso del recorrido de
aprendizaje o de tu propio proyecto. Escribe la explicación que necesitabas,
identifica la fuente pública que la respalda y pide a otra persona que la siga.
Eso ya es una mejora concreta antes de tocar los entresijos del framework.
