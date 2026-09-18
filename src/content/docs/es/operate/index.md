---
title: Ejecuta y evoluciona una aplicación
description: Pasa de una demostración funcional a una aplicación que puedas operar con confianza.
sidebar:
  order: 0
---
<!-- translation-source-sha256: 5401f1a6a368f698485734072b0d639da084c866fe8e4d4cbd59b06e3319afc2 -->

Una aplicación debe conservar el trabajo aceptado entre reinicios y ofrecer el
comportamiento previsto después de una versión. Operarla significa convertir esas
expectativas en comprobaciones que puedas repetir. Las comprobaciones adecuadas
dependen de su propósito, ya gestione reservas, documentos, pedidos u otro tipo
de trabajo.

NeoHaskell proporciona almacenamiento de eventos, modelos de lectura, endpoints
de salud, logging y tests. Aun así, tú eliges el entorno de alojamiento,
proteges los datos y decides cómo es un servicio aceptable. Una compilación
correcta genera un tipo de confianza distinto al de un ensayo correcto de
restauración.

## Haz cinco promesas

Para un servicio basado en event sourcing, empieza con estas promesas y
adáptalas a tu aplicación antes de elegir la infraestructura:

| Promesa | Evidencia que necesitarás |
| --- | --- |
| Los cambios aceptados sobreviven a un reinicio | Un almacén de eventos duradero y un test de reinicio |
| Los usuarios ven información precisa | Comprobaciones de readiness y resultados de consultas representativos |
| Una versión sirve la revisión prevista | Identidad de la compilación y un smoke test contra esa revisión |
| Los fallos se pueden diagnosticar | Logs útiles, identificadores y un procedimiento de recuperación |
| Los cambios conservan el historial de negocio existente | Fixtures de eventos antiguos y tests de compatibilidad |

Continúa en el proyecto `mug-shop` que creaste con `neo new`. Sus módulos
`src/Shop/Cart/` y `src/Shop/Stock/` te ofrecen un comportamiento concreto que
operar. Las mismas comprobaciones se aplican a otros dominios. En este punto, el
almacén de eventos en memoria todavía pierde el historial al reiniciar; el
capítulo siguiente cambia eso de forma deliberada.

## Sigue el recorrido operativo

1. [Elige qué sobrevive a un reinicio](/es/operate/persistence/): los eventos, los modelos de lectura, los archivos cargados y las credenciales de proveedores necesitan almacenamientos distintos.
2. [Despliega una revisión](/es/operate/deployment/): construye un ejecutable, proporciona la configuración y admite tráfico solo cuando esté lista.
3. [Observa la aplicación en ejecución](/es/operate/observability/): distingue un proceso que responde de un trabajo de negocio terminado.
4. [Practica la recuperación](/es/operate/recovery/): restaura en un entorno aislado y concilia los efectos externos.
5. [Evoluciona de forma segura](/es/operate/evolution/): conserva el significado de los eventos históricos cuando cambien los requisitos.
6. Revisa [seguridad](/es/operate/security/) y [rendimiento](/es/operate/performance/) antes de aumentar la exposición o el tráfico.

Estos temas están conectados; no son una lista de certificación. Un piloto en un
solo host y un servicio público muy utilizado tienen necesidades de disponibilidad
distintas; ambos necesitan un registro honesto de sus supuestos.

## Dale a tu agente un resultado que demostrar

Para el proyecto de práctica de comercio electrónico:

> “Muéstrame que un carrito y las cantidades aceptadas de sus artículos sobreviven al reinicio de un proceso. Identifica dónde viven sus eventos, muestra el resumen del carrito reconstruido y demuestra que una cantidad rechazada no lo cambió.”

Usa el [IDE visual](/es/getting-started/visual-ide/) para localizar la entidad
relevante y sus consumidores; en este ejemplo, el carrito y su resumen. El grafo
ayuda a explicar la aplicación; los logs del despliegue y los tests establecen lo
que hizo realmente la revisión en ejecución.

Cuando puedas operar y cambiar tu propia aplicación, [contribuir](/es/operate/contributing/) ofrece un camino separado para mejorar NeoHaskell.
