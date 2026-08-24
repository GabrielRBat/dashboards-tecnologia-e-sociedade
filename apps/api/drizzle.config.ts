import type { Config } from 'drizzle-kit';
import { carregarAmbiente } from './src/config/ambiente';

carregarAmbiente();

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5432/argamassas',
  },
  verbose: true,
  strict: true,
} satisfies Config;
