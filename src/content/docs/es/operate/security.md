---
title: Protege a las personas, los datos y las acciones
description: Convierte las reglas de acceso, los secretos, el transporte de base de datos y los límites de integración en comprobaciones concretas.
sidebar:
  order: 6
---
<!-- translation-source-sha256: 86870c6f535cd8add11952759265ae8bdc0fb26e8d3741d1dad52c2b666369e0 -->

Personas distintas necesitan accesos distintos a una aplicación. Decide qué
acciones puede realizar cada rol, qué registros puede ver y qué se publica
deliberadamente. Estas decisiones se aplican tanto a herramientas internas como a
servicios públicos. El proyecto de práctica de comercio electrónico las ilustra con
carritos de clientes, acceso del personal y un catálogo público.

NeoHaskell proporciona bloques de construcción de autenticación y autorización. Tu
aplicación sigue definiendo quién puede hacer qué, conecta el proveedor de
autenticación y prueba los límites. El framework no puede inferir tus roles ni tus
reglas de propiedad.

## Separa identidad y permisos

La autenticación establece quién hace una solicitud. La autorización decide si esa
identidad puede realizar una acción o ver un resultado.

Las consultas tienen dos puntos de decisión útiles:

- `canAccess`: ¿puede esta persona acceder en absoluto a este tipo de consulta?
- `canView`: ¿puede esta persona ver este resultado concreto?

Los helpers de `Service.AccessControl` incluyen `authenticatedAccess`,
`requirePermission`, `ownerOnly`, `tenantOnly`, `publicAccess` y `publicView`. El
acceso público es una elección explícita; reservarlo para información de catálogo
es una política de dominio de ejemplo, no una regla universal del framework.

En el ejemplo de comercio electrónico, estas son **expresiones de política para
una consulta de carrito**, no un módulo ejecutable completo:

```haskell
AccessControl.authenticatedAccess
AccessControl.ownerOnly (\cart -> cart.ownerId)
```

La segunda expresión supone que la consulta de ejemplo tiene un campo de propiedad
`Text` llamado `ownerId`, cuyo valor coincide con el sujeto autenticado. Añadir
simplemente un campo llamado «propietario» no impone la propiedad. Conecta las
expresiones en `src/Shop/Cart/Queries/CartSummary.hs` como se muestra en [control
de acceso](/es/build/access-control/) y pruébalas.

Los permisos de comandos son independientes: poder leer un registro no concede
automáticamente permiso para cambiarlo. En el ejemplo del carrito, el acceso de
lectura no concede el derecho a añadir artículos. Configura `Application.withAuth`
en el límite web: sin cableado de autenticación, la ruta de comandos Web actual usa
`trustedContext` y omite la puerta de acceso del comando. Añadir solo una política
de comando es insuficiente. Sigue [control de acceso](/es/build/access-control/)
para el cableado real y [testing](/es/build/testing/) para las comprobaciones de
comportamiento.

## Prueba con más de una identidad

Crea una matriz de acceso compacta para tu aplicación. Esta política de ejemplo
usa los roles de cliente, personal y público del proyecto de práctica:

| Persona que llama | Carrito propio | Carrito de otro cliente | Catálogo público |
| --- | --- | --- | --- |
| Anónima | Denegado | Denegado | Permitido si se publica deliberadamente |
| Cliente | Permitido | Denegado | Permitido |
| Personal | Según el permiso asignado | Según el permiso asignado | Permitido |

Prueba tanto las rutas de colecciones como las de resultados individuales.
Comprueba también credenciales ausentes, credenciales no válidas y una persona
legítima sin permisos suficientes. Una solicitud correcta de administrador es una
evidencia débil de aislamiento entre usuarios normales. Conserva estos casos en el
directorio `tests/` de tu proyecto y ejecuta `neo test` con una base de datos
desechable después de activar la persistencia.

## Mantén los secretos fuera de la salida normal

Declara la configuración sensible con `Config.secret`, como hace el campo de
contraseña de base de datos en [persistencia](/es/operate/persistence/). Eso
proporciona gestión a nivel de configuración; no limpia cadenas arbitrarias,
cuerpos de solicitudes ni respuestas de proveedores que registres después.

Las conexiones persistentes con proveedores también necesitan un almacén de
secretos configurado adecuadamente. El almacén de secretos en memoria
predeterminado dura lo que dura el proceso. Trata el almacenamiento elegido y sus
controles de acceso como parte del diseño de despliegue.

Para Postgres, `SslModeUnset` deja activa la negociación predeterminada subyacente.
La configuración admite modos explícitos, incluidos `SslModeRequire`,
`SslModeVerifyCa` y `SslModeVerifyFull`, además de una ruta opcional a la CA raíz.
Conecta los ajustes previstos en **cada** subsistema de base de datos pertinente y
verifica la conectividad en staging. Un ajuste TLS aplicado solo al almacén de
eventos no configura un almacén de archivos o consultas creado de forma
independiente.

## Mantén local el IDE de desarrollo

`neo ide` enlaza `127.0.0.1:2323` de forma predeterminada. Pasar `--host 0.0.0.0`
hace que sea accesible en otras interfaces. Es un cambio de exposición deliberado
para una herramienta que opera sobre tu proyecto; el comando no es un portal de
usuarios de producción.

## Ejercicio: cuestiona la propuesta del agente

En el proyecto de práctica, tu agente propone hacer públicas todas las consultas de
carritos para simplificar un error del frontend. Pídele que identifique el límite
de autorización fallido, conserve la política prevista y demuestre una solicitud
correcta de un cliente junto a una solicitud denegada de otro cliente.

El resultado útil es una regla de acceso explicada con evidencia. Que un error
desaparezca después de ampliar el acceso no basta.

Siguiente, evalúa el [rendimiento](/es/operate/performance/) con esas mismas reglas de negocio y acceso.
