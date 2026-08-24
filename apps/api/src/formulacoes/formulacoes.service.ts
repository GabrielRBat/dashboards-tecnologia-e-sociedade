import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  SQL,
  and,
  asc,
  count,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  lte,
  max,
  min,
  or,
  sql,
} from 'drizzle-orm';
import { DB, Database } from '../db/db.module';
import { formulacoes } from '../db/schema';
import { ListarFormulacoesDto } from './dto/listar-formulacoes.dto';
import { mapFormulacao } from './formulacao.mapper';

/** Relações sempre carregadas junto da formulação. */
const COM_RELACOES = {
  componentes: { with: { material: true } },
  granulometria: true,
  resistencias: true,
  corpos: true,
} as const;

@Injectable()
export class FormulacoesService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Monta a cláusula WHERE a partir dos parâmetros de consulta. */
  private montarWhere(filtros: ListarFormulacoesDto): SQL | undefined {
    const condicoes: SQL[] = [];

    if (filtros.busca?.trim()) {
      const termo = `%${filtros.busca.trim()}%`;
      const alternativas: SQL[] = [
        ilike(formulacoes.nomenclatura, termo),
        ilike(formulacoes.comentarios, termo),
        ilike(formulacoes.desenvolvedor, termo),
      ];

      const numero = Number(filtros.busca.trim());
      if (Number.isInteger(numero)) {
        alternativas.push(eq(formulacoes.numeracao, numero));
      }

      const combinado = or(...alternativas);
      if (combinado) condicoes.push(combinado);
    }

    if (filtros.tipoProjeto?.length) {
      condicoes.push(
        inArray(
          formulacoes.tipoProjeto,
          filtros.tipoProjeto as (typeof formulacoes.tipoProjeto.enumValues)[number][],
        ),
      );
    }

    if (filtros.origem?.length) {
      condicoes.push(
        inArray(
          formulacoes.origem,
          filtros.origem as (typeof formulacoes.origem.enumValues)[number][],
        ),
      );
    }

    if (filtros.desenvolvedor?.length) {
      condicoes.push(inArray(formulacoes.desenvolvedor, filtros.desenvolvedor));
    }

    if (filtros.dataInicio) {
      condicoes.push(gte(formulacoes.data, new Date(filtros.dataInicio)));
    }
    if (filtros.dataFim) {
      condicoes.push(lte(formulacoes.data, new Date(filtros.dataFim)));
    }

    return condicoes.length > 0 ? and(...condicoes) : undefined;
  }

  async listar(filtros: ListarFormulacoesDto) {
    const pagina = filtros.pagina ?? 1;
    const porPagina = filtros.porPagina ?? 25;
    const where = this.montarWhere(filtros);

    const [itens, totalLinhas] = await Promise.all([
      this.db.query.formulacoes.findMany({
        where,
        with: COM_RELACOES,
        orderBy: [asc(formulacoes.numeracao)],
        limit: porPagina,
        offset: (pagina - 1) * porPagina,
      }),
      this.db.select({ valor: count() }).from(formulacoes).where(where),
    ]);

    return {
      itens: itens.map(mapFormulacao),
      total: Number(totalLinhas[0]?.valor ?? 0),
      pagina,
      porPagina,
    };
  }

  /** Todas as formulações que atendem ao filtro, sem paginação (uso dos gráficos). */
  async listarTodas(filtros: ListarFormulacoesDto) {
    const itens = await this.db.query.formulacoes.findMany({
      where: this.montarWhere(filtros),
      with: COM_RELACOES,
      orderBy: [asc(formulacoes.numeracao)],
    });
    return itens.map(mapFormulacao);
  }

  async buscarPorId(id: string) {
    const formulacao = await this.db.query.formulacoes.findFirst({
      where: eq(formulacoes.id, id),
      with: COM_RELACOES,
    });

    if (!formulacao) {
      throw new NotFoundException(`Formulação ${id} não encontrada`);
    }

    return mapFormulacao(formulacao);
  }

  /** Valores distintos usados para popular os filtros da interface. */
  async opcoesDeFiltro() {
    const [desenvolvedores, avaliadores, periodo] = await Promise.all([
      this.db
        .selectDistinct({ valor: formulacoes.desenvolvedor })
        .from(formulacoes)
        .where(isNotNull(formulacoes.desenvolvedor))
        .orderBy(asc(formulacoes.desenvolvedor)),
      this.db
        .selectDistinct({ valor: formulacoes.avaliador })
        .from(formulacoes)
        .where(isNotNull(formulacoes.avaliador))
        .orderBy(asc(formulacoes.avaliador)),
      this.db
        .select({
          dataMin: min(formulacoes.data),
          dataMax: max(formulacoes.data),
        })
        .from(formulacoes),
    ]);

    const paraIso = (v: unknown): string | null => {
      if (!v) return null;
      const d = v instanceof Date ? v : new Date(String(v));
      return Number.isNaN(d.getTime()) ? null : d.toISOString();
    };

    return {
      desenvolvedores: desenvolvedores
        .map((d) => d.valor)
        .filter((d): d is string => Boolean(d)),
      avaliadores: avaliadores
        .map((a) => a.valor)
        .filter((a): a is string => Boolean(a)),
      dataMin: paraIso(periodo[0]?.dataMin),
      dataMax: paraIso(periodo[0]?.dataMax),
    };
  }

  /** Total de formulações cadastradas (usado em verificações e health check). */
  async total(): Promise<number> {
    const linhas = await this.db
      .select({ valor: sql<number>`count(*)::int` })
      .from(formulacoes);
    return Number(linhas[0]?.valor ?? 0);
  }
}
