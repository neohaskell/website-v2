---
title: Conecta cuentas externas con OAuth2
description: Vincula una cuenta externa manteniendo explícitos el consentimiento, las credenciales y los resultados de la aplicación.
sidebar:
  order: 3
---
<!-- translation-source-sha256: 17a8eb2e9c99df4613009c86e429a7d033d17de068e3960a586f7cd24ebcdffc -->

Una persona quiere que tu aplicación use una cuenta que tiene en otro lugar, como
un calendario, un servicio de documentos o una herramienta de contabilidad. Debe
poder autorizar esa conexión sin entregar a tu aplicación la contraseña del
proveedor. OAuth2 proporciona un flujo de consentimiento y credenciales para el
acceso posterior.

Esto es distinto de iniciar sesión en tu aplicación. La autenticación JWT
identifica a la persona usuaria; los tokens OAuth2 del proveedor autorizan el
acceso a una cuenta externa. Para el proyecto de práctica, considera conectar una
cuenta de contabilidad de prueba. El consentimiento es una parte de esa
funcionalidad; crear facturas o exportar pedidos necesitaría otro adaptador.

Empieza con [control de acceso de la aplicación](/es/build/access-control/) y [resultados de integraciones](/es/connect/). Elige los permisos mínimos del proveedor que necesite la funcionalidad real.

## Da un lugar a la conexión en mug-shop

Continúa en el proyecto creado con `neo new`. Coloca la configuración del proveedor
y los helpers de codificación de callbacks en `src/Shop/Integrations/Accounts.hs`
y conéctalos desde `src/App.hs`. Los módulos OAuth2 y de almacén de secretos
proceden del paquete principal; no necesitas el paquete de integraciones de
proveedores solo para montar las rutas de consentimiento.

Añade primero a un servicio que registre tu aplicación comandos con
`InternalTransport` para los resultados de conectado, fallido y desconectado. Una
consulta debe mostrar el estado de la conexión sin exponer tokens. Son
funcionalidades nuevas de conexión de cuentas; Cart y Stock siguen siendo los
slices iniciales de la aplicación.

## Establece la compatibilidad del proveedor

El núcleo proporciona un flujo configurable de código de autorización con PKCE, no
un preset para proveedores contables. Un `Provider` contiene `name`,
`authorizeEndpoint` y `tokenEndpoint`. Confirma que el proveedor elegido admite el
formato real de intercambio del cliente: los parámetros form incluyen `client_id`,
`client_secret` y el verificador PKCE. Los scopes específicos del proveedor, los
parámetros de autorización adicionales y las operaciones de API necesitan su
propio trabajo de compatibilidad.

El inicio valida los endpoints del proveedor para HTTPS y restricciones de
 direcciones de red, y rechaza nombres duplicados. Construye el URI de callback con
`OAuth2.mkRedirectUri`, gestiona su `Result` y registra ese mismo URI con el
proveedor. Se exige HTTPS salvo en direcciones localhost de desarrollo compatibles.

## Conecta la cuenta

Este es un **constructor parcial de aplicación**. La aplicación envolvente ya debe
registrar su transporte y sus servicios. `identityServerUrl`,
`accountProviderConfig` y `existingSecretStore` son valores que proporcionas tú:

```haskell
    |> Application.withAuth @() (\_ -> identityServerUrl)
    |> Application.withSecretStore @() (\_ -> existingSecretStore)
    |> Application.withOAuth2StateKey "SHOP_OAUTH_STATE_KEY"
    |> Application.withOAuth2Provider @() (\_ -> accountProviderConfig)
```

El ajuste de clave de estado nombra una variable de entorno que contiene un secreto
de al menos 32 bytes. Defínela antes del inicio. `withOAuth2StateKey` debe preceder
al registro del proveedor. Para valores dependientes de la configuración, sustituye
las fábricas `@()` por funciones del tipo de configuración registrado mediante
`Application.withConfig`.

Tanto `withSecretStore` como `withOAuth2Provider` aceptan **funciones fábrica**, no
un registro de almacén o proveedor directamente. Un almacén que necesite trabajo
de inicio debe construirse mediante tu diseño de arranque antes de devolver su
handle desde la fábrica; esta API no acepta un `Task` como resultado de la fábrica.

La configuración del proveedor tiene este **fragmento de construcción de registro**:

```haskell
OAuth2ProviderConfig
  { provider = selectedProvider
  , clientId = registeredClientId
  , clientSecret = registeredClientSecret
  , redirectUri = validatedCallbackUri
  , scopes = requestedScopes
  , onSuccess = encodeConnected
  , onFailure = encodeConnectionFailure
  , onDisconnect = encodeDisconnected
  , successRedirectUrl = connectedPage
  , failureRedirectUrl = failedPage
  }
```

`OAuth2ProviderConfig` está definido en `Auth.OAuth2.Provider`. Los IDs de cliente,
secretos, URI de redirección y scopes usan los tipos de `Auth.OAuth2.Types`; usa sus
constructores inteligentes para secretos y URI de redirección validados. Conserva
las credenciales en la [configuración de secretos](/es/build/configuration/).

## Sigue las tres rutas

| Solicitud prevista | Qué ocurre |
| --- | --- |
| `GET /connect/{provider}` | Autentica a la persona y la redirige al consentimiento del proveedor |
| `GET /callback/{provider}?code=…&state=…` | Comprueba el estado firmado, consume la transacción guardada e intercambia el código |
| `POST /disconnect/{provider}` | Autentica a la persona e intenta borrar el token local |

La ruta de conexión acepta una cabecera bearer y tiene un fallback de token en la
consulta para redirecciones del navegador. Prefiere la cabecera cuando sea posible;
evita que las URL con tokens entren en los logs de la aplicación o del proxy. El
callback usa el estado firmado y la transacción guardada, en lugar de exigir un JWT
de la redirección del proveedor.

El estado caduca después de cinco minutos. Su transacción conserva la identidad de
la persona y el verificador PKCE en el servidor, y se consume una vez. Por tanto,
un intercambio fallido exige iniciar una conexión nueva en lugar de reproducir el
mismo callback.

## Convierte el consentimiento en un resultado de aplicación

Después de un intercambio correcto, los tokens se almacenan antes de que
`onSuccess` reciba el ID de usuario autenticado y un `TokenKey`. Cada callback
devuelve texto JSON en formato `Integration.CommandPayload`; constrúyelo con
`Integration.encodeCommand` alrededor de un comando de aplicación registrado.

`encodeConnected` gestiona `Text -> TokenKey -> Text`;
`encodeConnectionFailure` gestiona `Text -> OAuth2Error -> Text`; y
`encodeDisconnected` gestiona `Text -> Text`. Sus comandos resultantes pueden ser
tipos distintos porque el límite del callback está codificado como texto. Mantén
los tokens sin procesar fuera de las cargas de comandos y los eventos. Deja que el
comando de conexión registre la asociación de la aplicación y una referencia
adecuada, y después expón su resultado mediante una consulta.

No trates la llegada a una URL de éxito como prueba de que funciona la
funcionalidad conectada. Prueba por separado el despacho del comando de callback y
una operación real de API del proveedor. Los errores previos al intercambio y las
redirecciones de denegación de consentimiento que no tienen `code` no llaman
necesariamente a `onFailure`; el callback web actual espera tanto `code` como
`state`.

## Planifica la vida de las credenciales

El almacén de secretos predeterminado está en memoria. Implementa y proporciona
almacenamiento duradero de secretos antes de prometer que las conexiones sobreviven
al reinicio. La aplicación actual también crea un almacén de transacciones en
memoria: reiniciar durante el consentimiento pierde la transacción y varias
instancias necesitan un enrutamiento de callbacks deliberado u otra integración de
almacén de transacciones.

`TokenRefresh.withValidToken` es un helper explícito para autores de adaptadores.
Lee tokens almacenados, ejecuta la acción proporcionada y actualiza el token ante
un error identificado por el predicado no autorizado de quien llama. Guarda los
tokens actualizados y reintenta la acción una vez. No programa de forma preventiva
la actualización a partir de `expiresInSeconds`; sus bloqueos de actualización por
clave son locales al proceso.

Los tokens ausentes, los refresh tokens ausentes o una actualización fallida
necesitan un resultado de reconexión. La desconexión de cuentas intenta actualmente
el borrado local, pero ignora errores de borrado y no llama a un endpoint de
revocación del proveedor. Verifica el borrado e implementa la revocación del
proveedor cuando el producto la necesite; «desconectado» no demuestra la revocación
remota.

## Ejecuta el flujo de conexión localmente

Ejecuta `neo build` y `neo test` desde `mug-shop` después de registrar los comandos
de resultado y la configuración de la cuenta. Inicia `neo run` con las
credenciales de cliente de desarrollo y la clave de estado, usando el callback
localhost registrado en el proveedor. Sigue el consentimiento e inspecciona la
consulta de conexión. Prueba por separado una llamada a la API del proveedor;
llegar a una página de redirección no demuestra el acceso a la API.

## Ejercicio: consentimiento interrumpido

Pide a tu agente que demuestre una conexión, un estado manipulado o reproducido, una
denegación de consentimiento, un reinicio durante el consentimiento, un fallo de
actualización y una desconexión con un almacén de secretos que falla. Después
explica qué ve la persona que conecta su cuenta en cada caso.

Conserva las comprobaciones controladas de rutas y actualización en la suite de
tests de tu proyecto. No certifican un proveedor contable concreto. Registra por
separado la verificación en el sandbox de ese proveedor y después construye el
[adaptador del proveedor](/es/connect/custom-integrations/).

<details>
<summary>Notas sobre el código fuente del framework</summary>

- [Cableado de la aplicación](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Application.hs)
- [Configuración del proveedor](https://github.com/neohaskell/NeoHaskell/blob/main/core/auth/Auth/OAuth2/Provider.hs)
- [Tipos OAuth2 y validación de URI](https://github.com/neohaskell/NeoHaskell/blob/main/core/auth/Auth/OAuth2/Types.hs)
- [Formato de intercambio del cliente](https://github.com/neohaskell/NeoHaskell/blob/main/core/auth/Auth/OAuth2/Client.hs)
- [Ciclo de vida de las rutas](https://github.com/neohaskell/NeoHaskell/blob/main/core/auth/Auth/OAuth2/Routes.hs)
- [Cableado de rutas HTTP](https://github.com/neohaskell/NeoHaskell/blob/main/core/service/Service/Transport/Web.hs)
- [Interfaz del almacén de secretos](https://github.com/neohaskell/NeoHaskell/blob/main/core/auth/Auth/SecretStore.hs)
- [Helper de actualización](https://github.com/neohaskell/NeoHaskell/blob/main/core/auth/Auth/OAuth2/TokenRefresh.hs)
- [Tests de rutas](https://github.com/neohaskell/NeoHaskell/blob/main/core/test/Auth/OAuth2/RoutesSpec.hs)
- [Tests de actualización](https://github.com/neohaskell/NeoHaskell/blob/main/core/test/Auth/OAuth2/TokenRefreshSpec.hs)

</details>
