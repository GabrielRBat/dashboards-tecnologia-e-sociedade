import { Injectable } from '@nestjs/common';
import { arredondar, media } from '../calculos/calculos';
import { ListarFormulacoesDto } from '../formulacoes/dto/listar-formulacoes.dto';
import { FormulacaoDetalhada } from '../formulacoes/formulacao.mapper';
import { FormulacoesService } from '../formulacoes/formulacoes.service';

const IDADES = [3, 7, 14, 28];

/**
 * Indicadores agregados do dashboard.
 *
 * O volume de formulações é da ordem de centenas, então agregamos em memória a
 * partir das formulações já mapeadas — assim os campos derivados (médias,
 * densidades, módulos) usam exatamente a mesma implementação da tela de detalhe.
 */
@Injectable()
export class IndicadoresService {
  constructor(private readonly formulacoes: FormulacoesService) {}

  private carregar(filtros: ListarFormulacoesDto): Promise<FormulacaoDetalhada[]> {
    return this.formulacoes.listarTodas(filtros);
  }

  async resumo(filtros: ListarFormulacoesDto) {
    const itens = await this.carregar(filtros);

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
  async evolucaoMedia(filtros: ListarFormulacoesDto) {
    const itens = await this.carregar(filtros);

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
  async evolucaoPorFormulacao(filtros: ListarFormulacoesDto, limite = 8) {
    const itens = await this.carregar(filtros);

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
  async comparativo28d(filtros: ListarFormulacoesDto, limite = 12) {
    const itens = await this.carregar(filtros);

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
  async dispersao(filtros: ListarFormulacoesDto) {
    const itens = await this.carregar(filtros);

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

  /** Curvas granulométricas das formulações filtradas. */
  async granulometria(filtros: ListarFormulacoesDto, limite = 6) {
    const itens = await this.carregar(filtros);

    return itens
      .filter((f) => f.granulometria.length > 0)
      .slice(0, limite)
      .map((f) => ({
        formulacaoId: f.id,
        nomenclatura: f.nomenclatura,
        pontos: f.granulometria.map((p) => ({
          peneiraMm: p.peneiraMm,
          rotulo: p.peneiraMm === 0 ? 'Fundo' : `${p.peneiraMm} mm`,
          frequencia: p.frequencia,
        })),
      }));
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
