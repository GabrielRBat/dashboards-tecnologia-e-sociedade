import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListarFormulacoesDto } from './listar-formulacoes.dto';

describe('ListarFormulacoesDto — filtro ids', () => {
  it('aceita até 5 ids separados por vírgula', async () => {
    const dto = plainToInstance(ListarFormulacoesDto, {
      ids: 'a,b,c,d,e',
    });
    const erros = await validate(dto);
    expect(erros).toHaveLength(0);
    expect(dto.ids).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('recusa mais de 5 ids', async () => {
    const dto = plainToInstance(ListarFormulacoesDto, {
      ids: 'a,b,c,d,e,f',
    });
    const erros = await validate(dto);
    const doCampo = erros.find((e) => e.property === 'ids');
    expect(doCampo).toBeDefined();
    expect(Object.values(doCampo?.constraints ?? {}).join(' ')).toMatch(
      /máximo 5/i,
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

describe('ListarFormulacoesDto — ensaioRegistrado', () => {
  it.each(['sim', 'nao'])('aceita o valor %s', async (ensaioRegistrado) => {
    const dto = plainToInstance(ListarFormulacoesDto, { ensaioRegistrado });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('recusa valor desconhecido', async () => {
    const dto = plainToInstance(ListarFormulacoesDto, {
      ensaioRegistrado: 'talvez',
    });
    const erros = await validate(dto);
    expect(erros.some((e) => e.property === 'ensaioRegistrado')).toBe(true);
  });
});
