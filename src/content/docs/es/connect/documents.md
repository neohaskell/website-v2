---
title: Extrae texto de documentos y transcribe audio
description: Convierte adjuntos en información revisable sin tratar el texto extraído como un hecho.
sidebar:
  order: 6
---
<!-- translation-source-sha256: b8c5cb4e9e1fac8c5d9b28ae670333b4fd76a8683059f6fc2b6461d5210b60fa -->

Un PDF o una grabación de audio contiene información que quieres usar en una
aplicación. La extracción puede convertirla en texto que se pueda buscar o en un
borrador revisable, mientras el adjunto original sigue siendo la evidencia. Decidir
si el resultado es suficientemente preciso es un paso distinto.

NeoHaskell incluye extracción local de texto PDF, extracción de documentos asistida
por IA y transcripción de audio. La extracción local mantiene ese procesamiento en
tu servidor. Las rutas de IA envían el contenido del archivo a un proveedor externo
y añaden consideraciones de coste, latencia y precisión.

Requisitos previos: [cargas de archivos](/es/connect/files/), [ciclo de vida de integraciones](/es/connect/) y un comando de resultados para registrar los resultados. Para practicar, usa un PDF de muestra que describa tazas y extrae de él información de catálogo en borrador.

## Continúa con tu archivo cargado

Usa la configuración de cargas de `mug-shop` de [archivos](/es/connect/files/) y
completa la [configuración de integraciones](/es/connect/#prepare-your-project). Coloca un helper como `src/Shop/Integrations/ExtractArtworkText.hs` junto a las demás integraciones de tu aplicación. Recibe el `FileRef` ya aceptado por tu comando de adjuntos.

Declara el comando de resultado del procesamiento con `InternalTransport` y
añádelo al servicio responsable antes de conectar el manejador saliente en
`src/App.hs`. El resultado necesita un identificador de intento de procesamiento
para que una respuesta tardía no sustituya silenciosamente un intento más nuevo.
La solicitud siguiente es la parte de extracción de ese flujo.

## Empieza con un PDF digital

Este **constructor parcial** solicita las dos primeras páginas. `attachment`,
`recordExtraction` y `recordFailure` son valores de tu aplicación. Los dos
callbacks producen un único tipo de comando registrado.

```haskell
Integration.outbound PdfExtract.Request
  { fileRef = attachment
  , config = PdfExtract.defaultConfig
      { PdfExtract.layout = PdfExtract.PreserveLayout
      , PdfExtract.pageRange = Just (1, 2)
      }
  , onSuccess = recordExtraction
  , onError = recordFailure
  }
```

Registra el manejador envolvente como se muestra en [flujos de trabajo](/es/connect/workflows/). La instancia de ejecución actual vive en `Integration.Pdf.ExtractText.Internal`; conserva esa dependencia en el helper completo.

Instala `pdftotext` y `pdfinfo` en el entorno de ejecución de la aplicación. La
integración recupera los bytes del archivo, escribe un PDF temporal, ejecuta esas
herramientas y devuelve el texto junto con el número de páginas y metadatos
opcionales. `PreserveLayout` conserva el posicionamiento, `RawText` elimina esa
preferencia de distribución y `Table` usa una opción de extracción de anchura fija.
El resultado es texto, no registros analizados como productos o entradas de
documento.

Si falla la extracción de metadatos pero la de texto tiene éxito, la implementación
actual puede devolver un recuento de páginas `0` y metadatos `Nothing`. Eso
significa que los metadatos no están disponibles, no necesariamente que el
documento tenga cero páginas.

Una página escaneada puede no tener texto seleccionable. La extracción local de PDF
no es OCR. Comprueba la salida vacía antes de tratar la extracción como un resultado
útil para la aplicación.

## Usa IA cuando el contenido necesite interpretación

`Integration.Ocr.Ai.Request` toma `fileRef`, `mimeType`, `model`, `config`,
`onSuccess` y `onError`. Su instancia de ejecución vive en
`Integration.Ocr.Ai.Internal`.

La configuración ofrece los modos de extracción `FullText`, `Summary` y
`Structured`. `Structured` cambia el prompt; no convierte el `Text` devuelto en
datos de aplicación validados. Analiza el resultado y aplica las mismas reglas que
aplicarías a una entrada humana; en el ejemplo, esas son las reglas de producto.

Elige un modelo compatible actualmente con tu tipo de archivo y proporciona
`OPENROUTER_API_KEY`. El adaptador envía el archivo completo como adjunto.
`maxPages` es una instrucción del prompt, no un mecanismo de truncado de la carga ni
un límite de gasto estricto. La implementación actual devuelve `Nothing` tanto para
`pageCount` como para `confidence`.

## Añade audio solo cuando resuelva una necesidad real

Para notas grabadas, `Integration.Audio.Transcribe.Request` usa el mismo patrón de
referencia de archivo. Su instancia de ejecución vive en
`Integration.Audio.Transcribe.Internal`. Su configuración incluye una sugerencia de
idioma y `maxDurationSeconds`; este último pide al modelo que limite la
transcripción, pero sigue cargando el archivo completo.

El resultado actual proporciona el texto transcrito, mientras que `duration`,
`confidence` y `language` son todos `Nothing`. Esta implementación no tiene
transcripción por fragmentos ni streaming. Verifica que el proveedor y el modelo
elegidos acepten la codificación y el tipo multimedia del adjunto real antes de
construir un flujo alrededor de ellos.

## Presupuesta la operación completa

El tiempo de espera predeterminado del dispatcher de integraciones es de 30
segundos. OCR usa por defecto un tiempo de espera de solicitud de 120 segundos y
audio de 180 segundos. Un tiempo de espera de solicitud más largo por sí solo no
puede ampliar el tiempo de procesamiento del evento envolvente.

Este **fragmento de cableado de aplicación** da cuatro minutos al trabajo total del
evento; ajústalo al comportamiento medido y a las necesidades de concurrencia:

```haskell
    |> Application.withDispatcherConfig @()
        (\_ -> Dispatcher.defaultConfig
          { Dispatcher.eventProcessingTimeoutMs = Just 240000 })
```

Algunos fallos de preparación —cargas desactivadas, archivos ausentes o un
ejecutable PDF inexistente— generan errores de integración antes del callback de
resultado. Supervisa los fallos del runtime además de los comandos de resultado;
de lo contrario, un documento puede quedar en «procesando» indefinidamente.

## Comprueba la extracción en el proyecto en ejecución

Después de añadir el comando de resultado y el manejador, ejecuta `neo build` y
`neo test` desde `mug-shop`. Inicia `neo run` en un entorno con los ejecutables PDF
necesarios. Carga un PDF pequeño propio, envía su referencia mediante el comando de
adjuntos e inspecciona tanto el estado del procesamiento como el texto extraído.
Conserva fixtures en `tests/` para la salida vacía y los metadatos no disponibles,
además del texto útil.

## Ejercicio: una dimensión de producto incorrecta

Amplía el proyecto de práctica con un flujo en el que las dimensiones extraídas
necesiten revisión antes de publicarse. Interpreta ambos papeles: carga el
documento de muestra y después inspecciona los valores propuestos antes de
aprobarlos.

<details>
<summary>Comprobaciones sugeridas</summary>

Comprueba un PDF digital limpio, un escaneo, una extracción vacía, un archivo
inexistente, un ejecutable no disponible, un timeout, texto estructurado
malformado y una dimensión plausible pero incorrecta. Conserva el adjunto original
y la identidad del intento de procesamiento. Aprobar un borrador debe ser un
comando separado con sus propias reglas; la confianza del modelo no está
disponible en estos adaptadores.

</details>

Siguiente: [usa IA para funcionalidades de aplicación](/es/connect/ai/) manteniendo la misma separación entre una sugerencia generada y los datos de aplicación aceptados.

<details>
<summary>Notas sobre el código fuente del framework</summary>

- [integrations/Integration/Pdf/ExtractText.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Pdf/ExtractText.hs)
- [integrations/Integration/Pdf/ExtractText/Internal.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Pdf/ExtractText/Internal.hs)
- [integrations/Integration/Ocr/Ai.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Ocr/Ai.hs)
- [integrations/Integration/Ocr/Ai/Internal.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Ocr/Ai/Internal.hs)
- [integrations/Integration/Audio/Transcribe.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Audio/Transcribe.hs)
- [integrations/Integration/Audio/Transcribe/Internal.hs](https://github.com/neohaskell/NeoHaskell/blob/main/integrations/Integration/Audio/Transcribe/Internal.hs)
- [core/service/Service/Application.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Application.hs)
- [core/service/Service/Integration/Dispatcher.hs](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Integration/Dispatcher.hs)
- [testbed/src/Testbed/Examples/PdfExtraction.hs](https://github.com/neohaskell/NeoHaskell/blob/main/testbed/src/Testbed/Examples/PdfExtraction.hs)

</details>
