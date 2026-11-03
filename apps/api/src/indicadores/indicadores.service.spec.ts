import { IndicadoresService } from './indicadores.service';
import { FormulacoesService } from '../formulacoes/formulacoes.service';
import { FormulacaoDetalhada } from '../formulacoes/formulacao.mapper';

function criarFormulacaoMock(
  id: string,
  nomenclatura: string,
  teorAgua: number | null,
  compressao28d: number | null,
  densidadeMedia28d: number | null = null,
): FormulacaoDetalhada {
  return {
    id,
    numeracao: 1,
    nomenclatura,
    tipoProjeto: 'NP',
    desenvolvedor: 'Dev',
    alimentador: 'Alim',
    avaliador: 'Aval',
    data: '2026-08-01T00:00:00.000Z',
    origem: 'LABORATORIO',
    comentarios: null,
    teorAgua,
    massaAgua: 400,
    densAparenteMassa: null,
    densAparenteVolume: null,
    retencaoM0: null,
    retencaoM1: null,
    retencaoM2: null,
    densFrescoMassa: null,
    densFrescoVolume: null,
    squeezeDeslocamento1: null,
    squeezeDeslocamento2: null,
    squeezeDeslocamento3: null,
    squeezeCarga1: null,
    squeezeCarga2: null,
    squeezeCarga3: null,
    componentes: [],
    granulometria: [],
    resistencias: [],
    endurecidos:
      densidadeMedia28d !== null
        ? [
            {
              idadeDias: 28,
              corpos: [],
              densidadeMedia: densidadeMedia28d,
              moduloMedio: null,
            },
          ]
        : [],
    variacoes: [],
    ultimaImportacao: null,
    calculados: {
      temEnsaioRegistrado: true,
      relacaoAguaLigante: 0.5,
      teorFinos: 30,
      densidadeAparente: null,
      retencaoAgua: null,
      densidadeFresco: null,
      squeezeDeslocamentoMedio: null,
      squeezeCargaMedia: null,
      moduloFinura: null,
      compressao28d,
      flexao28d: null,
      completude: 50,
    },
  };
}

describe('IndicadoresService — correlações', () => {
  it('calcula a correlação compressaoTeorAgua com reta e R²', async () => {
    const dadosMock: FormulacaoDetalhada[] = [
      criarFormulacaoMock('1', 'Formulacao 1', 18.0, 12.0),
      criarFormulacaoMock('2', 'Formulacao 2', 20.0, 10.0),
      criarFormulacaoMock('3', 'Formulacao 3', 22.0, 8.0),
      criarFormulacaoMock('4', 'Formulacao 4', null, 9.0), // Sem teor de água
      criarFormulacaoMock('5', 'Formulacao 5', 24.0, null), // Sem resistência aos 28d
    ];

    const formulacoesServiceMock = {
      listarTodas: jest.fn().mockResolvedValue(dadosMock),
    } as unknown as FormulacoesService;

    const service = new IndicadoresService(formulacoesServiceMock);
    const resultado = await service.correlacoes({});

    expect(resultado.compressaoTeorAgua).toBeDefined();
    expect(resultado.compressaoTeorAgua.pontos).toHaveLength(3);
    expect(resultado.compressaoTeorAgua.pontos[0]).toEqual({
      formulacaoId: '1',
      nomenclatura: 'Formulacao 1',
      tipoProjeto: 'NP',
      x: 18.0,
      y: 12.0,
    });

    // Relação linear perfeita y = -x + 30 -> R² deve ser 1
    expect(resultado.compressaoTeorAgua.regressao).not.toBeNull();
    expect(resultado.compressaoTeorAgua.regressao?.n).toBe(3);
    expect(resultado.compressaoTeorAgua.regressao?.a).toBe(-1);
    expect(resultado.compressaoTeorAgua.regressao?.b).toBe(30);
    expect(resultado.compressaoTeorAgua.regressao?.r2).toBe(1);
  });

  it('calcula a correlação compressaoDensidadeEndurecida com reta e R²', async () => {
    const dadosMock: FormulacaoDetalhada[] = [
      criarFormulacaoMock('1', 'Formulacao 1', 18.0, 10.0, 1400),
      criarFormulacaoMock('2', 'Formulacao 2', 20.0, 15.0, 1500),
      criarFormulacaoMock('3', 'Formulacao 3', 22.0, 20.0, 1600),
      criarFormulacaoMock('4', 'Formulacao 4', 20.0, null, 1700), // Sem resistência
      criarFormulacaoMock('5', 'Formulacao 5', 20.0, 18.0, null), // Sem densidade
    ];

    const formulacoesServiceMock = {
      listarTodas: jest.fn().mockResolvedValue(dadosMock),
    } as unknown as FormulacoesService;

    const service = new IndicadoresService(formulacoesServiceMock);
    const resultado = await service.correlacoes({});

    expect(resultado.compressaoDensidadeEndurecida).toBeDefined();
    expect(resultado.compressaoDensidadeEndurecida.pontos).toHaveLength(3);
    expect(resultado.compressaoDensidadeEndurecida.pontos[0]).toEqual({
      formulacaoId: '1',
      nomenclatura: 'Formulacao 1',
      tipoProjeto: 'NP',
      x: 1400,
      y: 10.0,
    });

    // Relação linear perfeita y = 0.05*x - 60 -> R² deve ser 1
    expect(resultado.compressaoDensidadeEndurecida.regressao).not.toBeNull();
    expect(resultado.compressaoDensidadeEndurecida.regressao?.n).toBe(3);
    expect(resultado.compressaoDensidadeEndurecida.regressao?.r2).toBe(1);
  });

  it('inclui as novas correlações na visão unificada do painel', async () => {
    const dadosMock: FormulacaoDetalhada[] = [
      criarFormulacaoMock('1', 'F1', 18, 12, 1500),
      criarFormulacaoMock('2', 'F2', 20, 10, 1600),
      criarFormulacaoMock('3', 'F3', 22, 8, 1700),
    ];

    const formulacoesServiceMock = {
      listarTodas: jest.fn().mockResolvedValue(dadosMock),
    } as unknown as FormulacoesService;

    const service = new IndicadoresService(formulacoesServiceMock);
    const painel = await service.painel({});

    expect(painel.correlacoes.compressaoTeorAgua).toBeDefined();
    expect(painel.correlacoes.compressaoTeorAgua.pontos).toHaveLength(3);
    expect(painel.correlacoes.compressaoDensidadeEndurecida).toBeDefined();
    expect(painel.correlacoes.compressaoDensidadeEndurecida.pontos).toHaveLength(3);
  });
});
