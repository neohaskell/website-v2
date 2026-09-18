---
title: Integraciones
description: Conecta eventos de la aplicación, servicios externos y comandos de seguimiento.
sidebar:
  order: 0
---
<!-- translation-source-sha256: 2705c3a7804826cbc75c44a424d78178f2d211d1dd19a6756d2bafe6ecd535e2 -->

Guardar un cambio y completar el trabajo que le sigue son cosas distintas. Un
documento puede guardarse antes de generar su vista previa; un mensaje puede
registrarse antes de enviar su notificación. Tu aplicación necesita representar
tanto el cambio aceptado como el trabajo que queda pendiente.

Una **integración** conecta un hecho de tu aplicación con otra pieza de trabajo.
NeoHaskell permite describir la solicitud y convertir su resultado de nuevo en un
comando. Tú sigues decidiendo qué significa el éxito, cómo se muestran los fallos
a las personas y qué operaciones se pueden repetir de forma segura.

Antes de implementar integraciones, familiarízate con [comandos y eventos](/es/build/commands-and-events/) y [consultas](/es/build/queries/). Los ejemplos amplían el proyecto de práctica de comercio electrónico, pero el mismo ciclo de vida de integración se aplica a otras aplicaciones. Quienes evalúan el enfoque pueden seguir la introducción y las secciones de decisión sin implementar los ejemplos.

Continúa en el proyecto `mug-shop` que creaste con `neo new`, con sus módulos
`src/Shop/Cart/` y `src/Shop/Stock/` y el registro de `src/App.hs`. Completa
primero [stock y checkout](/es/build/stock-and-checkout/) y conserva los tests
existentes mientras añades efectos. Todos los comandos de esta sección se ejecutan
desde ese directorio del proyecto.

## Prepara tu proyecto

El proyecto generado por `neo new` ya incluye las bibliotecas de núcleo e
integraciones de NeoHaskell. `Integration.Command` e `Integration.Timer`, junto
con los módulos HTTP, de correo electrónico, documentos e IA usados abajo, están
disponibles sin añadir un paquete para cada proveedor.

Conserva `neo.json` como configuración del proyecto. Las integraciones integradas
no necesitan una entrada nueva en la lista de dependencias. Si un adaptador
personalizado necesita otra biblioteca, usa los ajustes de dependencias descritos
en la [referencia de la CLI](/es/reference/cli/); deja que Neo gestione los
archivos de build generados.

Añade el código de la aplicación bajo `src/Shop/`, registra los manejadores y
servicios en `src/App.hs` y coloca las comprobaciones bajo `tests/`. Desde la raíz
del proyecto, usa:

```sh
neo build
neo test
neo run
```

Detén el servidor en ejecución antes de iniciar un reemplazo. Conserva otro
terminal para las solicitudes HTTP y el IDE. Las credenciales de los proveedores
pertenecen a la [configuración](/es/build/configuration/) del proceso en ejecución;
instalar una biblioteca no proporciona una cuenta, credenciales ni un flujo de
trabajo terminado.

Los fragmentos de código se centran en la regla o solicitud que se enseña. Los
módulos de implementación usan `import Core`; aquí se omiten las cabeceras de
módulo y otros imports. El [punto de control completo de integraciones](/examples/mug-shop-connect.tar.gz) contiene archivos ejecutables para coordinación, cargas y el ejercicio del temporizador. Aplícalo sobre tu proyecto existente cuando quieras comprobar el cableado completo.

Empieza por la [coordinación Cart–Stock](/es/connect/workflows/), que no necesita
ningún servicio externo. Los capítulos posteriores colocan constructores de
proveedores en tu proyecto e identifican los comandos y callbacks nuevos que debes
definir antes de conectarlos.

## Sigue un evento a través de una integración

Para el proyecto de práctica, considera la confirmación de un pedido. El flujo de
trabajo es un diseño de aplicación construido con estas primitivas de integración:

1. Un comando acepta el pedido y registra un evento de pedido realizado.
2. Un manejador saliente reconoce ese evento y describe una solicitud de correo electrónico.
3. La integración ejecuta la solicitud fuera de la función de decisión del pedido.
4. Su callback produce un comando que registra la aceptación o el fallo del proveedor.
5. Una consulta hace visible el estado resultante.

El cuarto paso es deliberadamente un **comando**: la información nueva sigue
entrando mediante las reglas de la aplicación. Llamar a un proveedor no edita
directamente una entidad ni una consulta.

Una integración **saliente** reacciona a eventos de la aplicación. Una integración
**entrante** empieza fuera de ese flujo de eventos, por ejemplo con un temporizador,
y envía un comando.

## Lee el pequeño vocabulario

Dos operaciones pequeñas organizan el trabajo dentro de un manejador:

```haskell
batch :: Array Action -> Outbound
none :: Outbound
```

`Integration.outbound` convierte un registro de solicitud compatible en una acción.
`Integration.batch` reúne las acciones que se ejecutarán para un evento.
`Integration.none` indica que este manejador no tiene trabajo para ese evento. Un
lote es una colección, no una transacción que abarque sistemas externos.

El tipo de solicitud concreto determina los campos disponibles. La mayoría de las
integraciones de proveedores ofrecen `onSuccess` y `onError`. Ambos callbacks deben
producir el **mismo tipo de comando**. Un comando con alternativas de éxito y fallo
es una opción; dos tipos de comando no relacionados no satisfarán una única
`Request command`.

## Registra ambos extremos

Definir un manejador no lo registra. La aplicación debe registrar el manejador
saliente y el servicio que contiene cada comando que puede emitir.

Los comandos emitidos deben declarar `InternalTransport`: el dispatcher de
integraciones recopila esos comandos por separado de los endpoints HTTP públicos.
Un comando no puede mezclar transportes internos y públicos. Cuando las personas y
las integraciones necesitan la misma regla, usa puntos de entrada separados que
compartan la lógica de decisión, como muestra el [ejemplo del temporizador](/es/connect/timers/). Añade el manejador completo Cart–Stock a tu propio proyecto en [flujos de trabajo](/es/connect/workflows/).

Un manejador de callback ausente queda registrado por el dispatcher. No demuestra
que la operación externa original haya fallado: el proveedor puede haberla
aceptado ya.

## De dónde sale la confianza

Prueba tres límites por separado:

- **Selección:** ¿el evento previsto produce una acción y un evento no relacionado produce ninguna?
- **Traducción:** ¿un resultado del proveedor produce el comando correcto, incluidos resultados malformados y rechazos?
- **Finalización:** ¿ese comando llega al servicio registrado y produce el estado de consulta esperado?

El runtime de integración usa workers por entidad y colas acotadas. Incluye gestión
de errores y tiempos de espera configurables. Esos mecanismos no establecen una
entrega duradera ni una ejecución exactamente una vez entre un fallo del proceso y
un proveedor externo. El trabajo importante que quede pendiente necesita un diseño
de recuperación a nivel de aplicación.

Los manejadores tipados reconstruyen la entidad a partir de su stream al procesar;
no reciben una instantánea garantizada tomada en el evento disparador. Coloca en el
evento la información que deba describir esa ocurrencia concreta.

## Elige la siguiente necesidad

- [Coordinar trabajo entre entidades](/es/connect/workflows/).
- [Llamar a una API HTTP externa](/es/connect/http-and-payments/).
- [Conectar una cuenta externa](/es/connect/provider-accounts/) mediante consentimiento OAuth explícito.
- [Enviar correo electrónico](/es/connect/email/).
- [Adjuntar archivos](/es/connect/files/) y [extraer contenido de documentos o audio](/es/connect/documents/).
- [Añadir asistencia de IA](/es/connect/ai/) y [restringir herramientas de IA](/es/connect/ai-tools/).
- [Programar trabajo periódico](/es/connect/timers/).
- [Construir una integración reutilizable](/es/connect/custom-integrations/).

**Prueba esto:** describe qué debería mostrar la aplicación de práctica cuando
exista un pedido pero la solicitud de correo agote el tiempo de espera. Incluye un
estado para un resultado desconocido del proveedor. Después identifica una entrega
similar en una aplicación que quieras construir y explica qué partes del modelo se
pueden reutilizar.

<details>
<summary>Notas sobre el código fuente del framework</summary>

- [Plantilla del proyecto Neo](https://github.com/neohaskell/NeoHaskell/blob/main/neo/assets/templates/project.cabal.j2)
- [core/service/Integration.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Integration.hs)
- [core/service/Service/Application/Integrations.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Application/Integrations.hs)
- [core/service/Service/Integration/Dispatcher.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Integration/Dispatcher.hs)

</details>
