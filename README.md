
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
```

Reemplazar `TU_CONTRASENA` por la contraseña compartida por el equipo.

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

## 9. Solución de problemas

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

## 10. Recomendaciones

- No subir archivos `.env` a GitHub.
- No eliminar el volumen de PostgreSQL si se desea conservar la información.
- No ejecutar `docker compose down -v` salvo que se quiera eliminar también los volúmenes.
- Cuando se descarguen nuevas migraciones del repositorio, ejecutar `prisma migrate deploy`.
- Mantener las versiones de Prisma y las dependencias sincronizadas entre los colaboradores.
