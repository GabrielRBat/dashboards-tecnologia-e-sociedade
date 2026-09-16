import { Workbook } from 'exceljs';
import { Database } from '../db/db.module';
import { ImportacaoService } from './importacao.service';
import {
  ABA_ALIMENTACAO,
  COL,
  PRIMEIRA_LINHA_DADOS,
} from './layout-planilha';

describe('ImportacaoService — pré-validação', () => {
  const service = new ImportacaoService({} as Database);

  it('gera um template aceito pela própria validação', async () => {
    const template = await service.gerarTemplate();
    const resultado = await service.validar(template, 'template.xlsx');

    expect(resultado.prontoParaImportar).toBe(true);
    expect(resultado.bloqueios).toHaveLength(0);
    expect(resultado.linhasLidas).toBe(1);
    expect(resultado.linhasIgnoradas).toBe(1);
  });

  it('bloqueia valores incompatíveis com o layout atual', async () => {
    const workbook = new Workbook();
    const aba = workbook.addWorksheet(ABA_ALIMENTACAO);
    const linha = PRIMEIRA_LINHA_DADOS;

    aba.getCell(linha, COL.numeracao).value = 1;
    aba.getCell(linha, COL.nomenclatura).value = 'Argamassa deslocada';
    aba.getCell(linha, COL.densAparenteMassa).value = 19.8;
    aba.getCell(linha, COL.densAparenteVolume).value = 2.5;
    aba.getCell(linha, COL.squeezeDeslocamento[0]).value = 678.9;

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const resultado = await service.validar(buffer, 'deslocada.xlsx');

    expect(resultado.prontoParaImportar).toBe(false);
    expect(resultado.bloqueios?.length).toBeGreaterThan(0);
    expect(resultado.bloqueios?.map((b) => b.coluna)).toEqual(
      expect.arrayContaining([
        'Densidade aparente — massa',
        'Densidade aparente — volume',
        'Squeeze-flow — deslocamento 1',
      ]),
    );
  });
});
