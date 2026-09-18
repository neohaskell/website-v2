---
title: Despliega una revisión que puedas identificar
description: Construye y supervisa un ejecutable NeoHaskell, configura sondas y verifica la revisión nueva.
sidebar:
  order: 2
---
<!-- translation-source-sha256: f4e8162eabb9115e8838e9a1afd3ac78aa2cc8dde8a4ef4d56d736825aec86af -->

Una versión tiene éxito cuando la revisión prevista sirve el comportamiento
correcto, no simplemente cuando termina un comando de despliegue. En un servicio
basado en event sourcing, mantén el tráfico alejado de un proceso nuevo mientras
sus modelos de lectura se ponen al día con el historial. La misma regla se aplica a
una vista de reservas, una cola de documentos o el resumen del carrito del proyecto
de práctica.

NeoHaskell proporciona una aplicación ejecutable y endpoints HTTP de sondas. Tu
entorno de alojamiento proporciona el supervisor de procesos, el enrutamiento del
tráfico, los secretos, el almacenamiento persistente y la política de reinicio. La
CLI actual no tiene ningún comando `neo deploy`.

## Prepara la misma aplicación para un host

Continúa con tu proyecto `mug-shop`, incluidos `neo.json`, `src/Shop/Cart/`,
`src/Shop/Stock/` y sus tests. Completa [persistencia](/es/operate/persistence/)
antes de prometer que los cambios aceptados sobreviven a un reinicio. La
configuración inicial de `SimpleEventStore` está intencionadamente en memoria.

Una ruta concreta es un host Linux con la CLI Neo, Nix y Git instalados para la
cuenta que ejecuta la aplicación. Coloca allí una revisión probada de **tu
aplicación**, conserva su pin del framework y sus archivos de bloqueo, y construye
en ese host o en otro host de compilación compatible. Proporciona los valores de
entorno `DB_*` de staging descritos en [persistencia](/es/operate/persistence/)
antes de ejecutar estas comprobaciones contra una base de datos de staging aislada:

```sh
neo --ci build
neo --ci test
```

El comando de test crea estado real de la aplicación e inicia su propio servidor.
No lo ejecutes contra la base de datos de producción ni mientras otro proceso ocupe
el puerto 8080. Configura la base de datos de producción solo después de que pasen
las comprobaciones de staging.

Desde el directorio de la aplicación, esto inicia el servidor sin salida
interactiva:

```sh
neo --ci run
```

Para un despliegue pequeño alojado, configura el supervisor de procesos con ese
comando de inicio y el directorio del proyecto como directorio de trabajo. Este es
un **template de unidad systemd** para una aplicación instalada en `/opt/mug-shop`.
Sustituye la ruta de Neo por la salida de `command -v neo` para la cuenta del
servicio y asegúrate de que su `PATH` contenga los ejecutables de Nix y Git de esa
cuenta:

```ini
[Unit]
Description=Mug shop application
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=mug-shop
WorkingDirectory=/opt/mug-shop
EnvironmentFile=/etc/mug-shop.env
Environment=PATH=/home/mug-shop/.nix-profile/bin:/nix/var/nix/profiles/default/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=/usr/local/bin/neo --ci run
Restart=on-failure
RestartSec=5
KillMode=control-group

[Install]
WantedBy=multi-user.target
```

La cuenta necesita acceso al proyecto y a los directorios de build generados. Crea
`/etc/mug-shop.env` mediante el mecanismo de configuración protegido del host y
usa los campos de abajo. Guarda la unidad adaptada como
`/etc/systemd/system/mug-shop.service` y después usa la cuenta administrativa del
host:

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now mug-shop
sudo journalctl -u mug-shop -f
```

Esta ruta de inicio sigue reconciliando y construyendo mediante la CLI en cada
reinicio; necesita la toolchain y puede necesitar acceso de red. No es una imagen
mínima de runtime precompilada. Mantén fija la revisión y sus dependencias,
preconstruye antes de admitir tráfico y prueba el comportamiento de parada y
reinicio. Un empaquetado más especializado es una decisión de despliegue; la CLI no
produce un contenedor de aplicación listo ni un entorno cloud.

## Proporciona los recursos de runtime

Antes de iniciar la revisión, establece:

- Los campos `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_POOL_SIZE`, `DB_SSL_MODE` y `DB_SSL_ROOT_CERT` conectados en [persistencia](/es/operate/persistence/), además de una base de datos accesible.
- Un volumen de cargas duradero si usas el almacén local de blobs.
- Las credenciales de proveedores y la configuración de autenticación proporcionadas mediante el mecanismo de secretos del despliegue.
- El puerto HTTP que se pasa realmente al transporte.
- Un identificador de revisión registrado por tu sistema de versiones junto a los logs y resultados de smoke tests.

Inspecciona el cableado además de la declaración de configuración. Un campo de
puerto declarado no tiene efecto si la aplicación no lo usa para configurar el
servidor.

## Separa inicio, liveness y readiness

Con el cableado web y de aplicación estándar:

| Solicitud | Significado | Respuesta habitual |
| --- | --- | --- |
| `GET /health` | El proceso HTTP responde | `200` |
| `GET /ready` | Las proyecciones de consulta registradas se han puesto al día | `200` cuando está listo, `503` mientras se reconstruye o ha fallado |

Health no demuestra que funcione un proveedor de pagos. Readiness no certifica
cada flujo de negocio. Un cableado personalizado puede cambiar u omitir estas
rutas; verifica la revisión real.

Para Kubernetes, este es un **fragmento ilustrativo de sondas**, no un manifiesto de
despliegue completo:

```yaml
startupProbe:
  httpGet:
    path: /health
    port: 8080
  periodSeconds: 5
  failureThreshold: 12
  timeoutSeconds: 2
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  periodSeconds: 10
  failureThreshold: 3
  timeoutSeconds: 2
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  periodSeconds: 5
  failureThreshold: 3
  timeoutSeconds: 2
```

El presupuesto de inicio del ejemplo es `5 × 12 = 60` segundos. Ajústalo a la
inicialización acotada del proceso y la base de datos. La reproducción histórica de
consultas ocurre después de registrar la suscripción en vivo y no debe retrasar el
enlace HTTP; readiness permanece en `503` hasta que la reproducción y los eventos
vivos superpuestos se hayan drenado. Una sonda de inicio evita que la política de
liveness del estado estable mate repetidamente la inicialización.

## Admite tráfico deliberadamente

1. Inicia la revisión sin enviarle tráfico de usuarios.
2. Observa `/health` y después espera a que `/ready` devuelva `200`.
3. Ejecuta smoke tests representativos contra la **identidad de la nueva revisión**.
4. Admite tráfico y supervisa fallos, latencia y resultados de negocio.

Un ingress compartido todavía puede llegar a una revisión antigua. Su respuesta
correcta por sí sola no demuestra que la revisión nueva funcione.

Para `mug-shop`, crea un carrito, añade una cantidad permitida, observa los
resultados de sus consultas de carrito y stock y después verifica que cero se
rechaza. Reutiliza las formas de solicitud de [HTTP y frontend](/es/build/http-and-frontend/) contra la revisión nueva. Comprueba un resultado externo solo si has implementado esa integración, usando un entorno controlado de proveedor. Las sondas integradas establecen hechos más limitados. Esta guía no proporciona ni certifica un despliegue cloud, de pagos o de IA de extremo a extremo.

Para una instancia local en el puerto 8080:

```sh
curl -i http://127.0.0.1:8080/health
curl -i http://127.0.0.1:8080/ready
```

## Ten en cuenta los límites operativos actuales

Los clientes de Postgres usan pools acotados. Las conexiones listener de
`LISTEN/NOTIFY` requieren una conexión directa que conserve la sesión; no las
canalices mediante PgBouncer en modo transacción. La compatibilidad con endpoints
separados pooled/directo y el escalado a cero de Neon se siguen en la
[incidencia #857](https://github.com/neohaskell/NeoHaskell/issues/857).

La cancelación mediante SIGTERM y el vaciado de puntos de control durante una
reconstrucción activa siguen registrados en la [incidencia #662](https://github.com/neohaskell/NeoHaskell/issues/662). No amplíes indefinidamente el tiempo de gracia de terminación para esperar a la reproducción. Practica la interrupción y el reinicio en staging, y usa el contrato de readiness para controlar el tráfico.

A continuación, aprende [qué observar](/es/operate/observability/) y ensaya la [recuperación](/es/operate/recovery/).
