import { Controller, Get, Inject, Module } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DB, Database } from '../db/db.module';

@Controller('saude')
export class SaudeController {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Verificação simples de aplicação e banco. */
  @Get()
  async verificar() {
    try {
      await this.db.execute(sql`select 1`);
      return { status: 'ok', banco: 'conectado' };
    } catch (e) {
      return {
        status: 'degradado',
        banco: 'indisponível',
        detalhe: e instanceof Error ? e.message : String(e),
      };
    }
  }
}

@Module({ controllers: [SaudeController] })
export class SaudeModule {}
