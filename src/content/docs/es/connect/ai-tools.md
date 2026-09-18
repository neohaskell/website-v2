---
title: Restringe las herramientas de IA
description: Permite que un modelo proponga una acción estructurada mientras la aplicación controla las reglas.
sidebar:
  order: 8
---
<!-- translation-source-sha256: 303adcc973af9939e5f428e90a83d37e040b68f56ba2051b875ff15b9d03b74e -->

Un modelo puede traducir una solicitud en lenguaje normal a una propuesta
estructurada: añadir un artículo, programar una tarea o actualizar un borrador. Tu
aplicación sigue decidiendo qué objeto puede cambiar, si los valores propuestos son
válidos y si la persona debe confirmar la acción.

La integración de agentes de NeoHaskell describe las herramientas mediante
esquemas de comandos y decodifica los argumentos devueltos en un comando. Esto da
estructura al traspaso. No hace confiables los argumentos generados por el modelo
ni concede al modelo la identidad de la persona usuaria. Practicaremos con «Quiero
dos tazas azules» en el ejemplo de comercio electrónico.

Requisitos previos: [solicitudes de IA](/es/connect/ai/), [comandos](/es/build/commands-and-events/) y [permisos](/es/build/access-control/).

## Amplía el mismo proyecto mug-shop

Completa la [configuración de integraciones](/es/connect/#prepare-your-project).
Coloca el helper de solicitudes del modelo en
`src/Shop/Integrations/CartAssistant.hs` y define su comando de propuesta bajo
`src/Shop/Cart/Commands/`. Registra ese comando en el servicio Cart con
`InternalTransport` antes de añadir el manejador en `src/App.hs`.

El comando es comportamiento nuevo de la aplicación. No expongas el `AddItem`
existente como herramienta del modelo suponiendo que su comprobación de cantidad
positiva es una política de propiedad. Empieza con una propuesta que la persona
compradora pueda inspeccionar antes de que una acción autorizada por separado
cambie el carrito.

## Empieza con un comando de propuesta

Empieza con un comando que registre una propuesta para revisión. Para el carrito de
práctica, mantén fuera de su alcance el checkout, los pagos y las acciones
irreversibles. El servidor debe vincular por sí mismo el contexto confiable del
carrito y del usuario, en lugar de aceptar afirmaciones de propiedad generadas por
el modelo.

`Agent.commandTool @YourCommand` obtiene el nombre de red desde `NameOf`, una
descripción desde `Documented` y el esquema JSON desde `ToSchema`. Usa el marcador
de comandos y las [convenciones de comandos](/es/build/commands-and-events/) establecidas; proporciona las instancias de esquema y documentación que requiera la ruta de derivación real de tu comando.

Lo siguiente es una **expresión parcial de solicitud**, no una implementación
completa de comando:

```haskell
Agent.agent
  customerMessage
  [proposalTool]
  modelName
  recordProposalFailure
  |> Integration.outbound
```

`proposalTool` es un `CommandTool`, normalmente vinculado una vez mediante
`Agent.commandTool`. El tipo `command` de la solicitud debe admitir codificación y
decodificación JSON, además de un nombre de comando. Su callback de error devuelve
ese mismo tipo, por lo que el tipo necesita una forma deliberada de representar el
fallo y la propuesta correcta.

La instancia de ejecución actual vive en `Integration.Agent.Internal`. Aunque la
descripción de la API es neutral respecto al proveedor, esta implementación envía
las solicitudes mediante OpenRouter usando `OPENROUTER_API_KEY`.

## Entiende exactamente qué se ejecuta

La implementación actual:

1. Rechaza una lista vacía de herramientas mediante el callback de error.
2. Envía una solicitud sin streaming con la elección de herramienta obligatoria.
3. Lee la primera llamada de herramienta de la primera elección.
4. Comprueba que el nombre de herramienta devuelto esté entre los nombres permitidos.
5. Decodifica sus argumentos como el único tipo `Request command`.
6. Emite ese comando para el dispatcher de la aplicación.

No ejecuta un bucle de planificación de varios pasos ni ejecuta todas las llamadas
de herramientas de una respuesta.

**Varias descripciones de herramientas no distribuyen automáticamente a distintos
tipos de comandos Haskell.** Todas las formas de argumentos devueltas deben
poder decodificarse en el único tipo destino de `Request`. Un diseño de suma o
envoltorio necesita un decodificador explícito y probado; empieza con una única
forma de herramienta compatible.

## Conserva la autoridad en la aplicación

El dispatcher de integraciones usa un contexto de sistema confiable para los
comandos emitidos. Eso omite la puerta de acceso externa; no es el contexto de
solicitud autenticado de la persona original. Las reglas de negocio del comando
siguen importando, pero debes diseñar explícitamente el límite de identidad y
autoridad.

Para un asistente que actúa sobre solicitudes de usuarios, un diseño inicial seguro
es registrar una propuesta vinculada a información de solicitud confiable, mostrársela
a la persona y exigir un comando de confirmación normal y autorizado. Trata como
entrada no confiable cualquier ID de entidad o afirmación de permisos generados por
el modelo.

Una lista permitida de nombres de herramientas impide aceptar un nombre no
registrado. No demuestra que los argumentos de un nombre permitido sean seguros.
Del mismo modo, un prompt de sistema guía al modelo, pero no es un mecanismo de
autorización.

## Prueba el límite de la propuesta

Ejecuta `neo build` para comprobar el comando de propuesta nuevo y los tipos de
solicitud del modelo. Añade respuestas fijas de llamadas de herramientas a tu suite
de `tests/` y ejecuta `neo test`, especialmente una respuesta que nombre otro
carrito. Con `neo run` y credenciales de desarrollo, realiza una solicitud en vivo
e inspecciona la propuesta antes de confirmarla. El resumen normal del carrito solo
debería cambiar mediante la acción de seguimiento autorizada.

## Ensaya un malentendido

> **Jess:** «La persona compradora pidió dos tazas. ¿Por qué la propuesta menciona otro carrito?»
>
> **Agente:** «El modelo incluyó ese identificador de carrito».
>
> **Jess:** «Vincula la propuesta al carrito de la solicitud autenticada y rechaza los identificadores que entren en conflicto. Muéstrame el test».

Comprueba herramientas vacías, nombres desconocidos, argumentos malformados,
ausencia de llamada de herramienta, varias llamadas devueltas, cantidades no
válidas, el identificador de otra persona y un prompt aparentemente inocuo que pide
al modelo ignorar sus restricciones. Inspecciona por separado la propuesta y el
resultado confirmado final.

**Ejercicio:** decide si un nombre de producto ambiguo debe crear una propuesta o
pedir a la persona compradora que aclare. Escribe el resultado esperado antes de
pedirle nada al modelo. La regla de aceptación debe permanecer estable aunque
cambies de modelo.

Si necesitas un comportamiento de proveedor distinto o un bucle de ejecución más
completo, continúa con [integraciones personalizadas](/es/connect/custom-integrations/).

<details>
<summary>Notas sobre el código fuente del framework</summary>

- [integrations/Integration/Agent.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Agent.hs)
- [integrations/Integration/Agent/Types.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Agent/Types.hs)
- [integrations/Integration/Agent/Internal.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Agent/Internal.hs)
- [integrations/test/Integration/Agent/CompileSpec.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/test/Integration/Agent/CompileSpec.hs)
- [core/service/Service/Integration/Dispatcher.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Integration/Dispatcher.hs)

</details>
