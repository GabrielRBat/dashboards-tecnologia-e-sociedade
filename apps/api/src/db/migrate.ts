/**
 * Aplica as migrações geradas pelo drizzle-kit (pasta `drizzle/`).
 * Uso: `npm run db:migrate` (na raiz ou em apps/api).
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { carregarAmbiente, obterDatabaseUrl, explicarErro } from '../config/ambiente';

carregarAmbiente();

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: obterDatabaseUrl() });
  const db = drizzle(pool);

  console.log('Aplicando migrações...');
  await migrate(db, { migrationsFolder: `${__dirname}/../../drizzle` });
  console.log('Migrações aplicadas.');

  await pool.end();
}

main().catch((e: unknown) => {
  console.error(explicarErro(e));
  process.exit(1);
});
