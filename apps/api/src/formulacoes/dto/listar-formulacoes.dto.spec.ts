import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListarFormulacoesDto } from './listar-formulacoes.dto';

describe('ListarFormulacoesDto — filtro ids', () => {
  it('aceita até 3 ids separados por vírgula', async () => {
    const dto = plainToInstance(ListarFormulacoesDto, {
      ids: 'a,b,c',
    });
    const erros = await validate(dto);
    expect(erros).toHaveLength(0);
    expect(dto.ids).toEqual(['a', 'b', 'c']);
  });

  it('recusa mais de 3 ids', async () => {
    const dto = plainToInstance(ListarFormulacoesDto, {
      ids: 'a,b,c,d',
    });
    const erros = await validate(dto);
    const doCampo = erros.find((e) => e.property === 'ids');
    expect(doCampo).toBeDefined();
    expect(Object.values(doCampo?.constraints ?? {}).join(' ')).toMatch(
      /máximo 3/i,
    );
  });
});

describe('ListarFormulacoesDto — campoBusca', () => {
  it('aceita os campos de busca conhecidos', async () => {
    const dto = plainToInstance(ListarFormulacoesDto, {
      busca: 'Revestimento',
      campoBusca: 'nomenclatura',
    });
    const erros = await validate(dto);
    expect(erros).toHaveLength(0);
  });

  it('recusa campo de busca desconhecido', async () => {
    const dto = plainToInstance(ListarFormulacoesDto, {
      busca: 'Revestimento',
      campoBusca: 'avaliador',
    });
    const erros = await validate(dto);
    expect(erros.some((e) => e.property === 'campoBusca')).toBe(true);
  });
});
