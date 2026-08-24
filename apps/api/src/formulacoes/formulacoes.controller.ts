import { Controller, Get, Param, Query } from '@nestjs/common';
import { ListarFormulacoesDto } from './dto/listar-formulacoes.dto';
import { FormulacoesService } from './formulacoes.service';

@Controller('formulacoes')
export class FormulacoesController {
  constructor(private readonly service: FormulacoesService) {}

  @Get()
  listar(@Query() filtros: ListarFormulacoesDto) {
    return this.service.listar(filtros);
  }

  @Get('opcoes')
  opcoes() {
    return this.service.opcoesDeFiltro();
  }

  @Get(':id')
  buscar(@Param('id') id: string) {
    return this.service.buscarPorId(id);
  }
}
