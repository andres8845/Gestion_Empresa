
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '../.env') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not configured');
}

const url = new URL(databaseUrl);

if (process.platform === 'win32' && url.hostname === 'postgres') {
  url.hostname = 'localhost';
  url.port = '5433';
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: url.toString(),
  },
});
