import 'dotenv/config';
import {defineConfig} from 'drizzle-kit'

export default defineConfig({
  schema: './src/infrastructure/db/drizzle/drizzle.schema.ts',
  dialect: 'postgresql',
  out: './src/infrastructure/db/drizzle/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL!
  }
});