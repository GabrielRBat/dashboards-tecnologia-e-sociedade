import { Controller, Get, Inject, Module } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { Publico } from '../auth/guards';
import { DB, Database } from '../db/db.module';

@Controller('saude')
export class SaudeController {
  constructor(@Inject(DB) private readonly db: Database) {}

  /**
   * Verificação simples de aplicação e banco.
   *
   * Pública de propósito: é o que o monitoramento e o script de subida
   * consultam, e exigir credencial aqui impediria descobrir que a API caiu.
   * Não devolve nada além de "está no ar" e "o banco responde".
   */
  @Publico()
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
