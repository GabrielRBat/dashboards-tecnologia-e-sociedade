import { Injectable } from '@nestjs/common';
import { arredondar, desvioPadrao, media } from '../calculos/calculos';
import {
  CLASSES_COMPRESSAO,
  CLASSES_DENSIDADE,
  CLASSES_RETENCAO,
  FaixaClasse,
  LimiteZona,
  ZONAS_NBR7211,
  classificar,
  moduloFinura,
  regressaoLinear,
  retidaAcumulada,
} from '../calculos/normas';
import { ListarFormulacoesDto } from '../formulacoes/dto/listar-formulacoes.dto';
import { FormulacaoDetalhada } from '../formulacoes/formulacao.mapper';
import { FormulacoesService } from '../formulacoes/formulacoes.service';

const IDADES = [3, 7, 14, 28];

type Itens = FormulacaoDetalhada[];

/**
 * Indicadores agregados do dashboard.
 *
 * O volume de formulações é da ordem de centenas, então agregamos em memória a
 * partir das formulações já mapeadas — assim os campos derivados (médias,
 * densidades, módulos) usam exatamente a mesma implementação da tela de detalhe.
 *
 * **Cada indicador é uma função pura sobre a lista já carregada**, e os métodos
 * públicos só buscam e delegam. É o que permite o `painel()` montar a visão
 * geral inteira com uma leitura só do banco, em vez de uma por gráfico.
 */
@Injectable()
export class IndicadoresService {
  constructor(private readonly formulacoes: FormulacoesService) {}

  private carregar(filtros: ListarFormulacoesDto): Promise<Itens> {
    return this.formulacoes.listarTodas(filtros);
  }

  /* ---------------------------------------------------------------- *
   * Endpoints
   * ---------------------------------------------------------------- */

  /**
   * Tudo o que a visão geral precisa, numa leitura só.
   *
   * A tela mostra dez recortes do mesmo conjunto filtrado. Pedir um endpoint por
   * gráfico faria o banco devolver as mesmas formulações dez vezes — e o custo
   * cresce com o tamanho do laboratório, não com o número de gráficos.
   */
  async painel(filtros: ListarFormulacoesDto) {
    const itens = await this.carregar(filtros);

    return {
      resumo: this.resumoDe(itens),
      evolucao: this.evolucaoMediaDe(itens),
      comparativo: this.comparativo28dDe(itens),
      dispersao: this.dispersaoDe(itens),
      granulometria: this.granulometriaDe(itens),
      classificacao: this.classificacaoDe(itens),
      correlacoes: this.correlacoesDe(itens),
      squeezeFlow: this.squeezeFlowDe(itens),
      dispersaoIdade: this.dispersaoPorIdadeDe(itens),
    };
  }

  async resumo(filtros: ListarFormulacoesDto) {
    return this.resumoDe(await this.carregar(filtros));
  }

  async evolucaoMedia(filtros: ListarFormulacoesDto) {
    return this.evolucaoMediaDe(await this.carregar(filtros));
  }

  async evolucaoPorFormulacao(filtros: ListarFormulacoesDto, limite = 8) {
    return this.evolucaoPorFormulacaoDe(await this.carregar(filtros), limite);
  }

  async comparativo28d(filtros: ListarFormulacoesDto, limite = 12) {
    return this.comparativo28dDe(await this.carregar(filtros), limite);
  }

  async dispersao(filtros: ListarFormulacoesDto) {
    return this.dispersaoDe(await this.carregar(filtros));
  }

  async granulometria(filtros: ListarFormulacoesDto, limite = 6) {
    return this.granulometriaDe(await this.carregar(filtros), limite);
  }

  async classificacao(filtros: ListarFormulacoesDto) {
    return this.classificacaoDe(await this.carregar(filtros));
  }

  async correlacoes(filtros: ListarFormulacoesDto) {
    return this.correlacoesDe(await this.carregar(filtros));
  }

  async squeezeFlow(filtros: ListarFormulacoesDto) {
    return this.squeezeFlowDe(await this.carregar(filtros));
  }

  async dispersaoPorIdade(filtros: ListarFormulacoesDto) {
    return this.dispersaoPorIdadeDe(await this.carregar(filtros));
  }

  /**
   * Zonas granulométricas da NBR 7211, sem depender de filtro.
   *
   * É constante, mas mora na API para a norma não ficar duplicada no frontend.
   */
  zonasGranulometricas(): LimiteZona[] {
    return ZONAS_NBR7211;
  }

  /* ---------------------------------------------------------------- *
   * Cálculo dos indicadores — funções puras sobre a lista carregada
   * ---------------------------------------------------------------- */

  private resumoDe(itens: Itens) {
    const porTipoProjeto = agrupar(itens, (f) => f.tipoProjeto).map(
      ([tipoProjeto, total]) => ({ tipoProjeto, total }),
    );
    const porOrigem = agrupar(itens, (f) => f.origem).map(([origem, total]) => ({
      origem,
      total,
    }));

    return {
      totalFormulacoes: itens.length,
      totalComEnsaios: itens.filter((f) => f.calculados.completude > 0).length,
      compressao28dMedia: arredondar(
        media(itens.map((f) => f.calculados.compressao28d)),
        2,
      ),
      flexao28dMedia: arredondar(
        media(itens.map((f) => f.calculados.flexao28d)),
        2,
      ),
      retencaoAguaMedia: arredondar(
        media(itens.map((f) => f.calculados.retencaoAgua)),
        1,
      ),
      densidadeFrescoMedia: arredondar(
        media(itens.map((f) => f.calculados.densidadeFresco)),
        0,
      ),
      completudeMedia: Math.round(
        media(itens.map((f) => f.calculados.completude)) ?? 0,
      ),
      porTipoProjeto,
      porOrigem,
    };
  }

  /** Média de resistência por idade, no conjunto filtrado. */
  private evolucaoMediaDe(itens: Itens) {
    return IDADES.map((idade) => {
      const compressoes = itens.flatMap((f) =>
        f.resistencias
          .filter((r) => r.tipo === 'COMPRESSAO' && r.idadeDias === idade)
          .map((r) => r.media),
      );
      const flexoes = itens.flatMap((f) =>
        f.resistencias
          .filter((r) => r.tipo === 'FLEXAO' && r.idadeDias === idade)
          .map((r) => r.media),
      );

      return {
        idadeDias: idade,
        compressao: arredondar(media(compressoes), 2),
        flexao: arredondar(media(flexoes), 2),
        amostras: compressoes.filter((v) => v !== null).length,
      };
    });
  }

  /** Curvas de evolução por formulação — para comparar formulações selecionadas. */
  private evolucaoPorFormulacaoDe(itens: Itens, limite: number) {
    return itens
      .filter((f) =>
        f.resistencias.some((r) => r.tipo === 'COMPRESSAO' && r.media !== null),
      )
      .slice(0, limite)
      .map((f) => ({
        formulacaoId: f.id,
        nomenclatura: f.nomenclatura,
        pontos: IDADES.map((idade) => ({
          idadeDias: idade,
          compressao:
            f.resistencias.find(
              (r) => r.tipo === 'COMPRESSAO' && r.idadeDias === idade,
            )?.media ?? null,
          flexao:
            f.resistencias.find(
              (r) => r.tipo === 'FLEXAO' && r.idadeDias === idade,
            )?.media ?? null,
        })),
      }));
  }

  /** Ranking de formulações por resistência à compressão aos 28 dias. */
  private comparativo28dDe(itens: Itens, limite = 12) {
    return itens
      .filter((f) => f.calculados.compressao28d !== null)
      .sort(
        (a, b) =>
          (b.calculados.compressao28d ?? 0) - (a.calculados.compressao28d ?? 0),
      )
      .slice(0, limite)
      .map((f) => ({
        formulacaoId: f.id,
        nomenclatura: f.nomenclatura,
        numeracao: f.numeracao,
        compressao28d: f.calculados.compressao28d,
        flexao28d: f.calculados.flexao28d,
        tipoProjeto: f.tipoProjeto,
      }));
  }

  /** Dispersão relação água/ligante x resistência aos 28 dias. */
  private dispersaoDe(itens: Itens) {
    return itens
      .filter(
        (f) =>
          f.calculados.relacaoAguaLigante !== null &&
          f.calculados.compressao28d !== null,
      )
      .map((f) => ({
        formulacaoId: f.id,
        nomenclatura: f.nomenclatura,
        relacaoAguaLigante: f.calculados.relacaoAguaLigante,
        compressao28d: f.calculados.compressao28d,
        densidadeFresco: f.calculados.densidadeFresco,
        retencaoAgua: f.calculados.retencaoAgua,
        tipoProjeto: f.tipoProjeto,
      }));
  }

  /**
   * Curvas granulométricas das formulações filtradas.
   *
   * Devolve a frequência retida e a **retida acumulada**, que é a forma em que a
   * curva é publicada e a única comparável com as zonas da NBR 7211. As zonas
   * vão junto, para o gráfico desenhar as faixas sem uma segunda requisição.
   */
  private granulometriaDe(itens: Itens, limite = 6) {
    const curvas = itens
      .filter((f) => f.granulometria.length > 0)
      .slice(0, limite)
      .map((f) => ({
        formulacaoId: f.id,
        nomenclatura: f.nomenclatura,
        moduloFinura: arredondar(moduloFinura(f.granulometria), 2),
        pontos: retidaAcumulada(f.granulometria).map((p) => ({
          peneiraMm: p.peneiraMm,
          rotulo: p.peneiraMm === 0 ? 'Fundo' : `${p.peneiraMm} mm`,
          frequencia: p.frequencia,
          acumulada: p.acumulada,
        })),
      }));

    return { curvas, zonas: ZONAS_NBR7211 };
  }

  /**
   * Distribuição das formulações nas classes da NBR 13281.
   *
   * Três famílias — resistência à compressão (P), densidade no estado fresco (D)
   * e retenção de água (U). Toda classe da norma aparece, mesmo com zero
   * formulações: um degrau vazio é informação, e sumir com ele deformaria a
   * leitura da distribuição.
   */
  private classificacaoDe(itens: Itens) {
    const familia = (
      faixas: FaixaClasse[],
      valorDe: (f: FormulacaoDetalhada) => number | null,
    ) => {
      const contagem = new Map<string, number>(faixas.map((c) => [c.codigo, 0]));
      let semDado = 0;

      for (const item of itens) {
        const classe = classificar(valorDe(item), faixas);
        if (classe === null) semDado += 1;
        else contagem.set(classe, (contagem.get(classe) ?? 0) + 1);
      }

      return {
        classes: faixas.map((c) => ({
          codigo: c.codigo,
          min: c.min,
          max: c.max,
          total: contagem.get(c.codigo) ?? 0,
        })),
        semDado,
      };
    };

    return {
      compressao: familia(CLASSES_COMPRESSAO, (f) => f.calculados.compressao28d),
      densidade: familia(CLASSES_DENSIDADE, (f) => f.calculados.densidadeFresco),
      retencao: familia(CLASSES_RETENCAO, (f) => f.calculados.retencaoAgua),
    };
  }

  /**
   * Correlações entre ensaios, com reta de mínimos quadrados e R².
   *
   * São os dois pares que a literatura da área usa para conferir a coerência de
   * um conjunto: flexão × compressão e módulo de elasticidade dinâmico ×
   * compressão (o módulo vem de ultrassom, ensaio não destrutivo).
   */
  private correlacoesDe(itens: Itens) {
    const moduloDe = (f: FormulacaoDetalhada): number | null =>
      f.endurecidos.find((e) => e.idadeDias === 28)?.moduloMedio ?? null;

    const montar = (
      x: (f: FormulacaoDetalhada) => number | null,
      y: (f: FormulacaoDetalhada) => number | null,
    ) => {
      const pontos = itens
        .map((f) => ({
          formulacaoId: f.id,
          nomenclatura: f.nomenclatura,
          tipoProjeto: f.tipoProjeto,
          x: x(f),
          y: y(f),
        }))
        .filter((p) => p.x !== null && p.y !== null);

      const r = regressaoLinear(pontos);

      return {
        pontos,
        regressao: r
          ? {
              a: arredondar(r.a, 4),
              b: arredondar(r.b, 4),
              r2: arredondar(r.r2, 3),
              n: r.n,
            }
          : null,
      };
    };

    return {
      flexaoCompressao: montar(
        (f) => f.calculados.compressao28d,
        (f) => f.calculados.flexao28d,
      ),
      moduloCompressao: montar((f) => f.calculados.compressao28d, moduloDe),
    };
  }

  /**
   * Squeeze-flow: carga × deslocamento de cada formulação (NBR 15839).
   *
   * A planilha registra três repetições do ensaio, com o par carga/deslocamento
   * de cada uma — **não** a curva completa. Por isso o gráfico é de pontos, e não
   * a curva de três estágios (elástico, plástico, enrijecimento) que aparece na
   * literatura: essa exigiria os dados brutos do equipamento, que não são
   * registrados hoje.
   */
  private squeezeFlowDe(itens: Itens) {
    return itens
      .filter(
        (f) =>
          f.calculados.squeezeDeslocamentoMedio !== null &&
          f.calculados.squeezeCargaMedia !== null,
      )
      .map((f) => ({
        formulacaoId: f.id,
        nomenclatura: f.nomenclatura,
        tipoProjeto: f.tipoProjeto,
        deslocamento: f.calculados.squeezeDeslocamentoMedio,
        carga: f.calculados.squeezeCargaMedia,
        retencaoAgua: f.calculados.retencaoAgua,
        repeticoes: [
          { deslocamento: f.squeezeDeslocamento1, carga: f.squeezeCarga1 },
          { deslocamento: f.squeezeDeslocamento2, carga: f.squeezeCarga2 },
          { deslocamento: f.squeezeDeslocamento3, carga: f.squeezeCarga3 },
        ].filter((r) => r.deslocamento !== null && r.carga !== null),
      }));
  }

  /**
   * Resistência por idade com a dispersão entre corpos de prova.
   *
   * Alimenta o gráfico de média com barra de erro — a leitura padrão de um
   * conjunto de ensaios, em que a média sozinha esconde a variabilidade. O
   * desvio é calculado sobre os CPs de todas as formulações do filtro.
   */
  private dispersaoPorIdadeDe(itens: Itens) {
    const valoresDe = (tipo: string, idade: number): number[] =>
      itens.flatMap((f) =>
        f.resistencias
          .filter((r) => r.tipo === tipo && r.idadeDias === idade)
          .flatMap((r) => r.valores),
      );

    return IDADES.map((idade) => {
      const compressoes = valoresDe('COMPRESSAO', idade);
      const flexoes = valoresDe('FLEXAO', idade);

      return {
        idadeDias: idade,
        compressao: arredondar(media(compressoes), 2),
        compressaoDesvio: arredondar(desvioPadrao(compressoes), 3),
        flexao: arredondar(media(flexoes), 2),
        flexaoDesvio: arredondar(desvioPadrao(flexoes), 3),
        corposCompressao: compressoes.length,
        corposFlexao: flexoes.length,
      };
    });
  }
}

function agrupar<T>(
  itens: T[],
  chave: (item: T) => string | null,
): [string, number][] {
  const mapa = new Map<string, number>();
  for (const item of itens) {
    const k = chave(item);
    if (!k) continue;
    mapa.set(k, (mapa.get(k) ?? 0) + 1);
  }
  return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
}
