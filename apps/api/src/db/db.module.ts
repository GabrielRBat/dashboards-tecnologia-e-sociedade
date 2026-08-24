import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { NodePgDatabase, drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { obterDatabaseUrl } from '../config/ambiente';
import * as schema from './schema';

export const DB = Symbol('DB');
export const DB_POOL = Symbol('DB_POOL');

export type Database = NodePgDatabase<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: DB_POOL,
      useFactory: (): Pool =>
        new Pool({ connectionString: obterDatabaseUrl(), max: 10 }),
    },
    {
      provide: DB,
      inject: [DB_POOL],
      useFactory: (pool: Pool): Database => drizzle(pool, { schema }),
    },
  ],
  exports: [DB, DB_POOL],
})
export class DbModule implements OnModuleDestroy {
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
