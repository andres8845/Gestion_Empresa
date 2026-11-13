
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';
import { resolve } from 'node:path';

// Cargar el .env de la raíz del proyecto
config({ path: resolve(process.cwd(), '../.env') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL no está configurada');
}

const url = new URL(databaseUrl);

// Prisma ejecutado desde Windows
if (process.platform === 'win32' && url.hostname === 'postgres') {
  url.hostname = 'localhost';
  url.port = '5433';
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: url.toString(),
  },
});
