
# Mercadito Daniela

Guía para ejecutar el proyecto en un entorno de desarrollo.

## 1. Requisitos

Tener instalados:

- Docker Desktop
- Node.js 24 y npm (para utilizar Prisma Studio localmente)

Antes de comenzar, asegurarse de que Docker Desktop esté encendido.

## 2. Configurar las variables de entorno

### Archivo .env de la raíz

Crear un archivo `.env` en la raíz del proyecto:

```env
POSTGRES_DB=name_db
POSTGRES_USER=user_example
POSTGRES_PASSWORD=TU_CONTRASENA

DATABASE_URL=postgresql://user_example:TU_CONTRASENA@postgres:5432/name_db?schema=public
SEED_USER_PASSWORD=CAMBIAR_POR_UNA_CONTRASENA_SEGURA
```

Reemplazar `TU_CONTRASENA` por la contraseña compartida por el equipo. `SEED_USER_PASSWORD` es la contraseña para las cuentas de demostración que crea el seed; configúrala antes de ejecutarlo. El seed almacena su hash con bcrypt. Para usuarios que ya existen, actualiza su estado activo y conserva el hash de contraseña existente. No uses credenciales de demostración en producción y nunca subas un archivo `.env` real a GitHub.

## 3. Levantar el proyecto

Desde la raíz del proyecto ejecutar:

```bash
docker compose up -d --build
```

Este comando construye e inicia:

- Frontend: Next.js
- Backend: NestJS
- Base de datos: PostgreSQL

Comprobar que los contenedores están funcionando:

```bash
docker compose ps
```

## 4. Configurar Prisma

En una instalación nueva, aplicar las migraciones existentes:

```bash
docker compose exec backend npx prisma migrate deploy
```

Generar Prisma Client:

```bash
docker compose exec backend npx prisma generate
```

Reiniciar el backend después de generar el cliente:

```bash
docker compose restart backend
```

No es necesario ejecutar `prisma init` ni crear una nueva migración.

## 5. Acceder al proyecto

Una vez levantados los contenedores:

| Servicio | Dirección |
|---|---|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:3001 |
| PostgreSQL | localhost:5433 |
| Prisma Studio | http://localhost:5555 |

La API de autenticación se documenta en [http://localhost:3001/api/docs](http://localhost:3001/api/docs); su documento OpenAPI JSON está en `http://localhost:3001/api/docs-json`. Antes de iniciar por primera vez, aplica también la migración `auth_sessions` con `docker compose exec backend npx prisma migrate deploy` y genera Prisma Client. Las sesiones usan cookies HttpOnly y vencen tras 30 minutos de inactividad.

El endpoint de usuarios autorizados lista cuentas activas y no incluye hashes. El esquema actual no registra parentescos, por lo que la API no puede identificar cuáles cuentas pertenecen a familiares.

El seed carga también los demás datos de demostración del proyecto, así que ejecútalo únicamente en una base de desarrollo. Para cargarlos después de configurar `.env` y aplicar las migraciones, ejecuta desde `backend`:

```bash
npx prisma db seed
```

El seed necesita `SEED_USER_PASSWORD` en el `.env` de la raíz.

Prisma Studio requiere iniciarse por separado.

## 6. Abrir Prisma Studio

Prisma Studio permite visualizar y administrar los registros de PostgreSQL desde el navegador.

Primero, instalar las dependencias locales del backend si todavía no están instaladas:

```bash
cd backend
npm ci
```

Después ejecutar:

```bash
npx prisma studio --port 5555
```

Abrir en el navegador:

http://localhost:5555

La conexión se obtiene automáticamente desde `backend/.env`.

**No es necesario escribir DATABASE_URL en la consola.**

Mantener abierta la terminal de Prisma Studio mientras se utiliza.

## 7. Comandos de Docker

Todos estos comandos se ejecutan desde la raíz del proyecto.

### Iniciar los contenedores

```bash
docker compose up -d
```

### Detener los contenedores

```bash
docker compose down
```

### Reiniciar el backend

```bash
docker compose restart backend
```

### Reconstruir los contenedores

```bash
docker compose up -d --build
```

### Ver los contenedores activos

```bash
docker compose ps
```

### Ver logs del backend

```bash
docker compose logs -f backend
```

### Ver logs del frontend

```bash
docker compose logs -f frontend
```

## 8. Comandos de Prisma

Ejecutar desde la raíz del proyecto.

### Validar el esquema

```bash
docker compose exec backend npx prisma validate
```

### Formatear el esquema

```bash
docker compose exec backend npx prisma format
```

### Generar Prisma Client

```bash
docker compose exec backend npx prisma generate
```

### Aplicar migraciones existentes

```bash
docker compose exec backend npx prisma migrate deploy
```

### Crear una nueva migración

Solo cuando se modifique `schema.prisma`:

```bash
docker compose exec backend npx prisma migrate dev --name nombre_migracion
```

Las nuevas migraciones deben incluirse en Git.

## 9. Pruebas de autenticación con PostgreSQL aislado

La suite HTTP existente usa un Prisma simulado. Para comprobar persistencia real, la suite `backend/test/auth.postgres.e2e-spec.ts` requiere una base de datos independiente cuyo nombre incluya `test`; nunca la apuntes a la base principal. Con PostgreSQL de Docker iniciado, crea una base vacía dedicada desde la raíz:

```bash
docker compose exec postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "CREATE DATABASE gestion_empresa_test;"'
```

Luego, en PowerShell desde `backend`, configura una URL con el usuario, contraseña y puerto local de tu PostgreSQL (codifica caracteres especiales de la contraseña en formato URL), aplica las migraciones y corre las pruebas:

```powershell
$env:AUTH_TEST_DATABASE_URL = "postgresql://USUARIO:CONTRASENA@localhost:5433/gestion_empresa_test?schema=public"
$env:DATABASE_URL = $env:AUTH_TEST_DATABASE_URL
npx prisma migrate deploy
npx prisma generate
npm run test:e2e
```

La suite real solo se activa cuando `AUTH_TEST_DATABASE_URL` está configurada y el nombre de la base contiene `test`. Crea una cuenta temporal con nombre único y elimina únicamente esa cuenta y sus sesiones al finalizar. La suite comprueba la persistencia del hash del token, `/auth/yo`, `/users/authorized`, logout y rechazo de una sesión expirada. Sin esa variable, el caso de PostgreSQL se marca como omitido; los demás tests e2e siguen ejecutándose.

## 10. Solución de problemas

### El puerto 5432 está ocupado

El proyecto utiliza el puerto 5433 de Windows para PostgreSQL y el 5432 dentro de Docker.

Verificar que `docker-compose.yml` conserve:

```yaml
ports:
  - "127.0.0.1:5433:5432"
```

### Prisma Studio no abre

Verificar que:

1. PostgreSQL esté funcionando.
2. Exista `backend/.env`.
3. DATABASE_URL utilice `localhost:5433`.
4. Se haya ejecutado `npm ci` dentro de backend.
5. Prisma Studio siga ejecutándose en la terminal.

### El backend presenta errores

Revisar los logs:

```bash
docker compose logs --tail=100 backend
```

Si falta Prisma Client:

```bash
docker compose exec backend npx prisma generate
docker compose restart backend
```

## 11. Recomendaciones

- No subir archivos `.env` a GitHub.
- No eliminar el volumen de PostgreSQL si se desea conservar la información.
- No ejecutar `docker compose down -v` salvo que se quiera eliminar también los volúmenes.
- Cuando se descarguen nuevas migraciones del repositorio, ejecutar `prisma migrate deploy`.
- Mantener las versiones de Prisma y las dependencias sincronizadas entre los colaboradores.
