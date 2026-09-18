---
title: Fundamentos del lenguaje
description: Lee el vocabulario de NeoHaskell que usa tu agente, un concepto práctico cada vez.
sidebar:
  order: 11
---
<!-- translation-source-sha256: d7e73e71cf08a666e6c613de23c3929c90ccaf54b7923fe5542f912d968e2628 -->

Puedes dirigir el comportamiento de una aplicación sin memorizar un manual de
lenguaje. Aun así, un vocabulario pequeño te permite inspeccionar la propuesta de
un agente y hacer preguntas más precisas: ¿puede faltar este valor?, ¿puede fallar
esta operación?, ¿esta función toma una decisión o realiza una acción externa?

Usa esta página como compañera de lectura. Los ejemplos se basan en el proyecto de
práctica de comercio electrónico y en tareas habituales de gestión de datos. Son
expresiones pequeñas o funciones parciales para un módulo NeoHaskell configurado,
no una segunda aplicación que haya que instalar.

## Lee una canalización de izquierda a derecha

NeoHaskell suele pasar un valor por pasos con nombre usando `|>`:

```haskell
cart.items |> Array.length
```

Esto significa «toma las entradas del carrito y después cuéntalas». Usaste esta
expresión en `src/Shop/Cart/Queries/CartSummary.hs`. Los nombres cualificados,
como `Array.length`, indican qué módulo proporciona la operación.

`Core` proporciona el vocabulario predeterminado. Estos fragmentos didácticos
omiten las cabeceras de módulo y las listas de imports; los puntos de control
descargables contienen los archivos completos. Neo gestiona los ajustes del
lenguaje, por lo que los archivos de aplicación no necesitan pragmas de lenguaje.
Un registro contiene campos con nombre; `cart.ownerId` lee uno y
`cart {ownerId = newOwner}` produce un valor de registro actualizado. Producir ese
valor por sí solo no persiste un evento.

## Distingue ausencia, fallo y trabajo

| Tipo | Pregunta que hace explícita | Ejemplo |
| --- | --- | --- |
| `Maybe value` | ¿Hay un valor presente? | La búsqueda de un carrito puede producir `Nothing` o `Just cart`. |
| `Result error value` | ¿Tuvo éxito un cálculo? | La decodificación JSON puede producir `Err message` u `Ok value`. |
| `Task error value` | ¿Qué trabajo producirá un resultado y cómo puede fallar? | Leer un archivo o hacer una solicitud HTTP. |
| `Decision event` | ¿Qué hechos de negocio deben aceptarse? | Aceptar la adición de un artículo o rechazar su cantidad. |

`case` enumera las posibilidades que gestionas. Este **helper parcial adaptado**
muestra una comprobación de entrada pura:

```haskell
validateQuantity :: Int -> Result Text Int
validateQuantity quantity =
  if quantity > 0
    then Ok quantity
    else Err "Quantity must be positive"
```

`Task.yield` produce el resultado correcto de una tarea; `Task.throw` produce un
error de tarea. `Task.mapError` traduce un tipo de error en un límite y
`Task.asResult` permite inspeccionar un error como valor. No sustituyas un fallo
significativo por un valor predeterminado solo para que el código continúe: quien
llama puede necesitar saber que la acción no terminó.

`do` secuencia pasos, `<-` recibe el resultado de un paso y `let` da nombre a un
valor local. Por eso la orquestación de la aplicación puede leerse de arriba abajo
sin meter cada rama en una sola función enorme.

## Colecciones e identificadores

Usa `Array` para valores ordenados y `Map` para valores indexados por un
identificador. `Array.map` transforma entradas; `Array.takeIf` conserva las que
coinciden; `Array.reduce` combina entradas en un resultado. `Map.get` devuelve
`Maybe` porque una clave puede estar ausente.

`Uuid.fromText` también devuelve `Maybe`: el texto de una URL no tiene por qué ser
un identificador válido. Que un ID se analice correctamente establece su formato,
no que quien llama pueda acceder al registro correspondiente.

`Text` es el tipo de cadena habitual. El formato como
`[fmt|Cart #{cartId}|]` mantiene legible la interpolación. Usa tipos de dominio y
campos de registro con nombres para que la implementación del agente conserve las
distinciones del modelo de eventos.

## Importes y dinero

Los valores numéricos necesitan unidades, límites y reglas de redondeo definidos.
El dinero del proyecto de práctica nos da un ejemplo útil: un precio necesita tanto
un importe como una divisa. El tipo `Decimal` proporciona almacenamiento de punto
fijo con cuatro posiciones decimales. Se serializa a JSON como una cadena, por
ejemplo, `"12.5000"`.

Estas **expresiones basadas en el código fuente** ilustran la construcción y el
formato:

```haskell
Decimal.fromCents 1250 |> Decimal.formatDecimal
-- "12.5000"

Decimal.divide (Decimal.fromCents 1250) Decimal.zero
-- Nothing
```

Para una divisa con dos posiciones decimales de unidad menor, `fromCents` construye
a partir de unidades menores enteras. `toCents` trunca la precisión más fina; no
es una política implícita de redondeo. `roundTo2` es una operación explícita y la
división devuelve `Maybe` porque la división por cero no tiene valor.

La implementación almacena un `Int64`, por lo que los importes necesitan límites.
Su parser de texto pasa actualmente por una conversión de coma flotante; no lo
describas como un parser financiero de precisión arbitraria. Prefiere unidades
menores enteras validadas cuando encajen con tu política monetaria y prueba el
redondeo y los importes máximos. `Decimal` no asocia una divisa ni decide las
reglas fiscales por ti.

## Qué aportan los traits y marcadores

Un trait describe el comportamiento que admite un tipo. `Mappable` permite
transformar valores contenidos, `Default` proporciona un valor inicial y los
traits de serialización conectan valores con JSON. Una restricción en la firma de
una función te indica qué comportamiento necesita.

Los helpers `deriveEvent`, `deriveCommand`, `deriveEntity`, `deriveQuery` y
`deriveOutboundIntegration` proceden de `Core` y generan instancias comunes.
Reducen el cableado repetitivo, mientras que la decisión, la actualización del
estado y la proyección siguen siendo lógica de negocio que puedes inspeccionar.
Consulta [comandos y eventos](/es/build/commands-and-events/) para conocer el orden
de sus declaraciones y [consultas](/es/build/queries/#derive-and-register-the-view) para el orden específico de las consultas.

## Ejercicio: revisa un helper «seguro»

En el proyecto de práctica, un agente analiza una cantidad no válida y sustituye
una para que la solicitud siempre tenga éxito. Explica por qué eso podría infringir
el comportamiento solicitado y después propone una comprobación observable.

<details>
<summary>Razonamiento y comprobaciones sugeridos</summary>

Una taza es una cantidad válida, pero puede no ser la que pidió el cliente.
Conserva la entrada no válida como error y permite que la interfaz pida una
corrección. Verifica un valor positivo normal, una entrada malformada, cero y la
cantidad máxima permitida por la política del ejercicio. Prueba también en sus
límites cualquier conversión a representaciones numéricas o monetarias más
pequeñas. La comprobación de tipos ayuda a distinguir categorías; no elige los
valores de negocio aceptables por ti.

</details>

Siguiente: [integraciones](/es/connect/) aplica estas ideas al trabajo fuera del
modelo principal. Vuelve al [resumen de build](/es/build/) para consultar la
secuencia de aprendizaje.

Fuentes públicas: [Result](https://github.com/neohaskell/NeoHaskell/blob/main/core/core/Result.hs), [Task](https://github.com/neohaskell/NeoHaskell/blob/main/core/core/Task.hs), [Decimal](https://github.com/neohaskell/NeoHaskell/blob/main/core/decimal/Decimal.hs) y [Mappable](https://github.com/neohaskell/NeoHaskell/blob/main/core/traits/Mappable.hs).
