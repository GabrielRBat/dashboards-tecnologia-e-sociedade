import { Controller, Get, Inject, Injectable, Module, Query } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DB, Database } from '../db/db.module';
import { materiais } from '../db/schema';

@Injectable()
export class MateriaisService {
  constructor(@Inject(DB) private readonly db: Database) {}

  listar(categoria?: string) {
    const consulta = this.db.select().from(materiais);
    const filtrada = categoria
      ? consulta.where(
          eq(
            materiais.categoria,
            categoria as (typeof materiais.categoria.enumValues)[number],
          ),
        )
      : consulta;

    return filtrada.orderBy(
      asc(materiais.categoria),
      asc(materiais.ordem),
      asc(materiais.nome),
    );
  }
}

@Controller('materiais')
export class MateriaisController {
  constructor(private readonly service: MateriaisService) {}

  @Get()
  listar(@Query('categoria') categoria?: string) {
    return this.service.listar(categoria);
  }
}

@Module({
  controllers: [MateriaisController],
  providers: [MateriaisService],
  exports: [MateriaisService],
})
export class MateriaisModule {}
