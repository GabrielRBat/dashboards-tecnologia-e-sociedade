import {
  Body,
  Controller,
  Delete,
  Get,
  Module,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { FormulacoesModule } from '../formulacoes/formulacoes.module';
import { ListarFormulacoesDto } from '../formulacoes/dto/listar-formulacoes.dto';
import { TipoPainel } from './catalogo';
import { DashboardsService, PainelConfig } from './dashboards.service';

interface CorpoDashboard {
  nome: string;
  descricao?: string;
  paineis?: PainelConfig[];
}

@Controller('dashboards')
export class DashboardsController {
  constructor(private readonly service: DashboardsService) {}

  /** Métricas, tipos de gráfico e agregações — alimenta o construtor. */
  @Get('catalogo')
  catalogo() {
    return this.service.catalogo();
  }

  /** Diz se um cruzamento faz sentido, antes de salvar. */
  @Get('validar')
  validar(
    @Query('tipo') tipo: TipoPainel,
    @Query('metricaX') metricaX: string,
    @Query('metricaY') metricaY?: string,
  ) {
    return this.service.validar(tipo, metricaX, metricaY);
  }

  /** Prévia de um painel ainda não salvo. */
  @Post('previa')
  previa(
    @Body() corpo: { painel: PainelConfig; filtros?: ListarFormulacoesDto },
  ) {
    return this.service.previa(corpo.painel, corpo.filtros ?? {});
  }

  @Get()
  listar() {
    return this.service.listar();
  }

  @Get(':id')
  obter(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.obter(id);
  }

  /** Dados calculados de todos os painéis, respeitando os filtros da tela. */
  @Get(':id/dados')
  dados(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() filtros: ListarFormulacoesDto,
  ) {
    return this.service.dados(id, filtros);
  }

  @Post()
  criar(@Body() corpo: CorpoDashboard) {
    return this.service.criar(corpo);
  }

  @Put(':id')
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() corpo: Partial<CorpoDashboard>,
  ) {
    return this.service.atualizar(id, corpo);
  }

  @Delete(':id')
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remover(id);
  }
}

@Module({
  imports: [FormulacoesModule],
  controllers: [DashboardsController],
  providers: [DashboardsService],
})
export class DashboardsModule {}
