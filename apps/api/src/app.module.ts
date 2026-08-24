import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { FormulacoesModule } from './formulacoes/formulacoes.module';
import { IndicadoresModule } from './indicadores/indicadores.module';
import { ImportacaoModule } from './importacao/importacao.module';
import { MateriaisModule } from './materiais/materiais.module';
import { SaudeModule } from './saude/saude.module';

@Module({
  imports: [
    DbModule,
    SaudeModule,
    MateriaisModule,
    FormulacoesModule,
    IndicadoresModule,
    ImportacaoModule,
  ],
})
export class AppModule {}
