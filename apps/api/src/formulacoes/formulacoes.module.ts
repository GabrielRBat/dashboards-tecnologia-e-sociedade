import { Module } from '@nestjs/common';
import { FormulacoesController } from './formulacoes.controller';
import { FormulacoesService } from './formulacoes.service';

@Module({
  controllers: [FormulacoesController],
  providers: [FormulacoesService],
  exports: [FormulacoesService],
})
export class FormulacoesModule {}
