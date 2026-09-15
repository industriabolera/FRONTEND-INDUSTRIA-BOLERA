# Pruebas locales del módulo de contacto

Esta guía usa una MariaDB local en Docker exclusivamente para `contact_messages`.
No toca reservas, `BoleraContext`, MongoDB Atlas ni ningún entorno de producción.

## 1. Configurar y levantar la base local

Requisitos: Docker Compose, Node.js 20.x y npm.

Desde `ilb-react/`:

```bash
npm run contact:db:up
npm run contact:db:status
```

El archivo `ilb-react/.env.contact.local` ya está creado con las claves listas y
permisos `0600`. Si no existiera, créalo con `cp .env.example .env.contact.local`
y descomenta/ajusta las claves de contacto según la plantilla. El usuario solo
debe completar `MYSQL_USER`, `MYSQL_PASSWORD`, `MARIADB_ROOT_PASSWORD`,
`RESEND_API_KEY`, `CONTACT_FROM_EMAIL` y `CONTACT_TO_EMAIL`. `MONGODB_URI` debe
permanecer vacío en local para proteger Atlas de reservas.

El servicio `contact-db` usa MariaDB 11.8, publica **solo** `127.0.0.1:3307` hacia
el puerto `3306` del contenedor y persiste en el volumen nombrado
`ilb_contact_mariadb_local_data`. El estado esperado es `healthy`.

`CONTACT_DB_TARGET`, `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD` y
`MYSQL_DATABASE` son obligatorias para el backend local. No configures un socket;
la conexión debe ser TCP a `127.0.0.1:3307`. Deja `MONGODB_URI` vacío durante las
pruebas de contacto y no invoques endpoints de reservas o pagos.

`RESEND_API_KEY`, `CONTACT_FROM_EMAIL` y `CONTACT_TO_EMAIL` se completan
manualmente; usa un remitente verificado por Resend. Para probar únicamente
la persistencia sin envío real, el backend tolera esas variables vacías, pero no
introduzcas sus valores en el repositorio ni en este documento.

**Nunca uses en local la configuración de Hostinger.** El backend exige
`CONTACT_DB_TARGET=local`, conexión TCP a un host loopback y rechaza destinos
remotos. La configuración `CONTACT_DB_TARGET=hostinger` pertenece exclusivamente
al entorno de producción administrado fuera del repositorio.

## 2. Arrancar backend y frontend

En dos terminales, desde `ilb-react/`:

```bash
npm run contact:dev:server
npm run dev
```

Los scripts de base y backend cargan explícitamente `--env-file .env.contact.local`
y fallan con un mensaje claro si el archivo no existe.

La inicialización de la tabla es tolerante a SQL detenido: Express arranca y
`POST /api/contact` responde un error controlado si no puede persistir.

## 3. Enviar una prueba ficticia

Con MariaDB healthy y el backend activo, este payload no contiene datos reales:

```bash
curl -i -X POST http://localhost:3001/api/contact \
  -H 'Content-Type: application/json' \
  --data '{"nombre":"Prueba Local","apellido":"Contacto","email":"prueba@example.invalid","asunto":"Prueba local","mensaje":"Mensaje ficticio para validar MariaDB sin envío real.","terminosAceptados":true}'
```

Con las variables de Resend vacías, la respuesta sigue confirmando la recepción
porque el mensaje se persiste, y la fila queda con `email_status = 'failed'` y un
error controlado. No se realiza ninguna llamada a Resend.

Verifica la tabla usando el cliente dentro del contenedor:

```bash
docker compose --env-file .env.contact.local -f docker-compose.contact.local.yml exec -T contact-db \
  sh -c 'mariadb --protocol=tcp -u"$MARIADB_USER" -p"$MARIADB_PASSWORD" \
  -D"$MARIADB_DATABASE" -e "SELECT id, nombre, email_status FROM contact_messages ORDER BY id DESC LIMIT 5;"'
```

Para probar la forma de la petición Resend sin envío, usa `new ResendAdapter({
fetchImpl })` con un mock inyectable que compruebe URL, método, payload,
`Authorization`, `Idempotency-Key` y `signal`. El adaptador usa el `fetch` nativo
de Node 20 cuando no se inyecta un mock, aplica timeout y no expone el cuerpo de
errores del proveedor.

## 4. Apagar o eliminar únicamente el entorno local

Esto detiene el contenedor y conserva los datos:

```bash
npm run contact:db:down
```

Para eliminar **solo** el contenedor (y la red efímera), conservando el volumen:

```bash
docker compose --env-file .env.contact.local -f docker-compose.contact.local.yml down --remove-orphans
```

No uses `-v` sobre un volumen persistente existente. Solo si creaste un volumen
exclusivamente para una prueba desechable y aceptas perder sus datos ficticios,
puedes ejecutar el mismo comando con `-v`.

No ejecutes estos comandos con otro archivo Compose ni sobre Hostinger. MongoDB
Atlas y el módulo de reservas no forman parte de este entorno.
