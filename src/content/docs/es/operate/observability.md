---
title: Observa una aplicación en ejecución
description: Conecta la salud del proceso, el progreso de las proyecciones y los resultados de negocio sin exponer datos privados.
sidebar:
  order: 3
---
<!-- translation-source-sha256: c337ef545bf196d00e1483a4dd0a4c655482fe36b09d9954aa84f30bf0465f45 -->

Una persona informa de que un cambio aceptado no es visible. Necesitas distinguir
una solicitud rechazada, una vista retrasada, una cuenta incorrecta y un fallo
externo. «El servidor está activo» responde solo a una parte pequeña de la pregunta.
En el proyecto de práctica de comercio electrónico, el informe podría ser «añadí un
artículo, pero mi carrito no ha cambiado».

Observa la aplicación por capas: proceso, hechos almacenados, vistas y resultados
externos. Da a cada alerta una pregunta sobre la que una persona pueda actuar.

## Empieza con las dos señales integradas

Para una aplicación que use el cableado web predeterminado en el puerto 8080:

```sh
curl -i http://127.0.0.1:8080/health
curl -i http://127.0.0.1:8080/ready
```

La respuesta de readiness es un estado agregado:

```json
{"status":"ready"}
```

Durante la actualización devuelve `{"status":"rebuilding"}` con HTTP `503`.
Un fallo también devuelve `503`, con `status` establecido en `failed` y un
`reason`. La respuesta HTTP actual no es un panel con valores de retraso por
consulta.

Un proceso sano puede estar reconstruyendo consultas. Un proceso listo todavía
puede encontrarse con una interrupción del proveedor externo. Supervisa por
separado la operación de negocio.

## Lee los logs de la aplicación

El módulo `Log` escribe registros JSON en la salida estándar con `time`, `level` y
`message`, además de información del punto de llamada y campos de ámbito del
framework cuando están disponibles. Tu host debe recopilar, conservar y hacer
buscables esos registros.

Para una ejecución de diagnóstico local:

```sh
LOG_LEVEL=debug neo run
```

El nivel predeterminado es `Info`; la implementación reconoce las grafías debug,
info, warn, error y critical en minúsculas, con inicial mayúscula o en mayúsculas.
Cambiar el entorno requiere un proceso nuevo. `neo --verbose` controla la
verbosidad de la CLI; `LOG_LEVEL` controla los logs de la aplicación.

Los logs del framework identifican el progreso y los fallos de reproducción de
consultas. Los mensajes de progreso incluyen `events_replayed`, `lag_from_head` y
`duration_seconds` dentro del texto del mensaje. No supongas que se exportan como
métricas separadas. El test de inicio en frío verifica los mensajes de progreso y
comprueba que los logs de fallo incluyan la identidad y la posición de la consulta
sin filtrar la carga del evento.

[Inspecciona la implementación de logging](https://github.com/neohaskell/NeoHaskell/blob/main/core/core/Log.hs) y [la verificación de inicio en frío](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/scripts/cold-start-readiness.sh).

## Sigue una operación por el sistema

Registra la revisión, la hora aproximada y un identificador seguro de la operación
o entidad. Conserva el identificador del carrito devuelto por tu solicitud de
`mug-shop`. Después pregunta:

1. ¿El comando tuvo éxito o informó de un rechazo?
2. ¿El historial persistido contiene el hecho esperado?
3. ¿La consulta relevante se ha puesto al día y la persona lectora está autorizada a verlo?
4. Si se esperaba una integración, ¿qué resultado informó?
5. ¿El resultado se convirtió en el siguiente hecho de negocio o el seguimiento sigue pendiente?

Usa el [grafo del IDE](/es/getting-started/visual-ide/) para encontrar el comando,
evento, consulta e integración responsables. Explica las relaciones del código
fuente; no muestra el historial vivo de la base de datos ni sustituye la
monitorización de producción.

Elige identificadores de diagnóstico seguros. Las direcciones personales, tokens
de acceso, documentos cargados y respuestas completas de proveedores normalmente
no pertenecen a los logs habituales. Redactar un campo de configuración tipado no
redacta el texto arbitrario que registres después.

## Ejercicio: un proceso verde con un resultado pendiente

Después de añadir una integración externa a `mug-shop`, diseña un escenario de
staging en el que el cambio que la activa se acepte pero la confirmación externa se
retrase. Describe el estado visible para el cliente y la señal visible para quien
opera antes de ejecutarlo.

<details>
<summary>Razonamiento sugerido</summary>

Health puede mantenerse en verde mientras la confirmación está pendiente. La vista
correspondiente debe comunicar honestamente ese estado intermedio. Quien opera
necesita la duración de la espera y un identificador de correlación seguro. Reiniciar
repetidamente un proceso sano probablemente no resolverá una interrupción del
proveedor y puede complicar el diagnóstico.

</details>

Usa [recuperación](/es/operate/recovery/) cuando el diagnóstico identifique trabajo interrumpido o infraestructura perdida.
