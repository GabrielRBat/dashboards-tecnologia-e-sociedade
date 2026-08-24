import { Controller, Get, Module, Query } from '@nestjs/common';
import { FormulacoesModule } from '../formulacoes/formulacoes.module';
import { ListarFormulacoesDto } from '../formulacoes/dto/listar-formulacoes.dto';
import { IndicadoresService } from './indicadores.service';

@Controller('indicadores')
export class IndicadoresController {
  constructor(private readonly service: IndicadoresService) {}

  /** Tudo o que a visão geral precisa, com uma leitura só do banco. */
  @Get('painel')
  painel(@Query() filtros: ListarFormulacoesDto) {
    return this.service.painel(filtros);
  }

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

  /** Zonas da NBR 7211 sozinhas — a tela de detalhe usa só isso. */
  @Get('zonas-granulometricas')
  zonas() {
    return this.service.zonasGranulometricas();
  }

  @Get('classificacao')
  classificacao(@Query() filtros: ListarFormulacoesDto) {
    return this.service.classificacao(filtros);
  }

  @Get('correlacoes')
  correlacoes(@Query() filtros: ListarFormulacoesDto) {
    return this.service.correlacoes(filtros);
  }

  @Get('squeeze-flow')
  squeezeFlow(@Query() filtros: ListarFormulacoesDto) {
    return this.service.squeezeFlow(filtros);
  }

  @Get('dispersao-idade')
  dispersaoPorIdade(@Query() filtros: ListarFormulacoesDto) {
    return this.service.dispersaoPorIdade(filtros);
  }
}

@Module({
  imports: [FormulacoesModule],
  controllers: [IndicadoresController],
  providers: [IndicadoresService],
})
export class IndicadoresModule {}
