---
title: Mide el rendimiento de la aplicación
description: Investiga latencia, reproducción, contención y presupuestos de base de datos con cargas representativas de la aplicación.
sidebar:
  order: 7
---
<!-- translation-source-sha256: 428c5d9ce9bb07f4c23abfa7a27b03d7060923cc91a6997f3bc51ccecbe8e9be -->

Una aplicación que parece rápida con pocos datos puede comportarse de otro modo a
medida que crecen el historial y la actividad concurrente. El trabajo de rendimiento
empieza por elegir qué experiencia debe seguir siendo aceptable: enviar un cambio,
leer su resultado o reiniciar después de un despliegue. Una venta concurrida en el
proyecto de práctica de comercio electrónico nos da una carga concreta que examinar.

La arquitectura de NeoHaskell da a estas operaciones trabajos distintos. Mídelas
por separado antes de cambiar tamaños de pool o añadir paralelismo.

## Elige un presupuesto observable

Escribe juntos un objetivo y una carga de trabajo. Para el ejemplo de comercio
electrónico, «la disponibilidad de stock aparece dentro del tiempo acordado mientras
varios clientes reservan las últimas tazas» se puede probar. «El framework es
rápido» no.

Mide al menos:

- El tiempo de respuesta del comando, incluidos los rechazos.
- El tiempo hasta que la consulta pertinente refleja un evento aceptado.
- El tiempo de inicio hasta `/health` y, por separado, hasta `/ready`.
- La duración del proveedor externo y la antigüedad del trabajo pendiente.
- Las conexiones de base de datos, el uso de recursos y la tasa de fallos durante la prueba.

Conserva junto al resultado la revisión de la aplicación, el tamaño del conjunto de
datos, el tamaño de la máquina y la carga de trabajo. Una medición solo del carrito
no predice la latencia de una integración de pagos posterior.

## Entiende la contención en una entidad

Los comandos concurrentes pueden competir por cambiar la misma entidad. En el
ejemplo de comercio electrónico, dos clientes pueden intentar reservar la última
taza de la misma entidad de stock. La concurrencia optimista detecta escrituras en
conflicto y el ejecutor de comandos puede volver a obtener el estado y repetir la
decisión.

El ejecutor actual tiene un máximo de 10 reintentos de conflicto, usando backoff
exponencial con jitter y un retraso limitado. Es un mecanismo de conflicto acotado,
no una garantía de que todas las solicitudes tengan éxito bajo contención ilimitada.
Mantén deterministas las decisiones de negocio y deja los efectos externos fuera
de una decisión que pueda ejecutarse de nuevo.

Pregunta si una entidad contiene actividad no relacionada de forma innecesaria.
Separar actividad independiente —por ejemplo, el stock de productos distintos—
puede reducir la contención, pero dividir un invariante de negocio indivisible puede
hacer más difícil la corrección. Conserva la regla que intentas hacer cumplir.

## Presupuesta las conexiones de base de datos en todo el despliegue

Los almacenes de eventos Postgres, los almacenes de consultas, los almacenes de
estado de archivos y los listeners contribuyen a la demanda de conexiones. Los
tamaños predeterminados de pool son 6 para `PostgresEventStore` y 4 para
`PostgresQueryObjectStoreConfig`; esas cifras no son una recomendación universal de
capacidad.

Haz inventario de los pools reales que crea tu cableado, sus límites, las conexiones
listener y el número de procesos. Incluye los procesos antiguos y nuevos activos
durante el despliegue, además del margen para operaciones y mantenimiento. Las
suscripciones por stream pueden añadir demanda por encima de un total de pool fijo
simple.

Aumentar un pool puede trasladar el cuello de botella a Postgres. Mide las colas,
la duración de las consultas y los fallos antes y después de un cambio.

## Prueba la reproducción a medida que crece el historial

Usa una base de datos Postgres desechable configurada mediante [persistencia](/es/operate/persistence/). Crea carritos y adiciones aceptadas representativos mediante las rutas HTTP de tu aplicación, registra los resultados esperados del carrito y el stock y detén la aplicación. Desde el mismo directorio `mug-shop` y contra la misma base de datos, vuelve a iniciarla:

```sh
LOG_LEVEL=info neo --ci run
```

En otro terminal, comprueba las dos señales por separado:

```sh
curl -i http://127.0.0.1:8080/health
curl -i http://127.0.0.1:8080/ready
```

Registra cuándo cada una tiene éxito y compara los resultados de las consultas con
tus valores esperados. Repite con un historial conocido mayor. Usa sustitutos
controlados para cualquier efecto externo, de modo que un experimento de
reproducción no pueda enviar notificaciones reales ni repetir acciones de
proveedor. El almacén inicial en memoria no puede medir la recuperación del
historial entre reinicios.

Conserva escenarios de solicitudes reutilizables bajo `tests/` y ejecuta `neo test`
para las comprobaciones de corrección. Mide por separado los tiempos de solicitud y
readiness de la aplicación y el tiempo de compilación de la CLI. Un resultado
incorrecto rápido es un test fallido.

## Ejercicio: las dos últimas tazas

En el proyecto de práctica de comercio electrónico, ejecuta intentos simultáneos de
reserva para las dos últimas tazas según la política que implementaste. Decide el
número de éxitos esperados antes de ejecutar el test.

<details>
<summary>Qué comparar</summary>

Comprueba el número de reservas aceptadas, los rechazos explícitos, el stock final
y los estados de stock visibles. Después compara los tiempos de respuesta con una
carga distribuida entre muchos productos. La diferencia ayuda a aislar la
contención de la capacidad general del servidor.

</details>

Usa [observabilidad](/es/operate/observability/) para convertir un cuello de botella medido en evidencia sobre la que pueda actuar tu agente.
