import { Controller, Get, Module, Query } from '@nestjs/common';
import { FormulacoesModule } from '../formulacoes/formulacoes.module';
import { ListarFormulacoesDto } from '../formulacoes/dto/listar-formulacoes.dto';
import { IndicadoresService } from './indicadores.service';

@Controller('indicadores')
export class IndicadoresController {
  constructor(private readonly service: IndicadoresService) {}

  @Get('resumo')
  resumo(@Query() filtros: ListarFormulacoesDto) {
    return this.service.resumo(filtros);
  }

  @Get('evolucao-media')
  evolucaoMedia(@Query() filtros: ListarFormulacoesDto) {
    return this.service.evolucaoMedia(filtros);
  }

  @Get('evolucao')
  evolucao(@Query() filtros: ListarFormulacoesDto) {
    return this.service.evolucaoPorFormulacao(filtros);
  }

  @Get('comparativo')
  comparativo(@Query() filtros: ListarFormulacoesDto) {
    return this.service.comparativo28d(filtros);
  }

  @Get('dispersao')
  dispersao(@Query() filtros: ListarFormulacoesDto) {
    return this.service.dispersao(filtros);
  }

  @Get('granulometria')
  granulometria(@Query() filtros: ListarFormulacoesDto) {
    return this.service.granulometria(filtros);
  }
}

@Module({
  imports: [FormulacoesModule],
  controllers: [IndicadoresController],
  providers: [IndicadoresService],
})
export class IndicadoresModule {}
