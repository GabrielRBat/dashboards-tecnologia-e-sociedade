import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Workbook, Worksheet } from 'exceljs';
import { DB, Database } from '../db/db.module';
import {
  componentesFormulacao,
  corposDeProvaEndurecidos,
  ensaiosResistencia,
  formulacoes,
  materiais,
  pontosGranulometricos,
} from '../db/schema';
import {
  ABA_ALIMENTACAO,
  COL,
  COMPRESSAO_PLANILHA,
  ENDURECIDO_PLANILHA,
  FLEXAO_PLANILHA,
  GRANULOMETRIA_PLANILHA,
  MATERIAIS_PLANILHA,
  PRIMEIRA_LINHA_DADOS,
  normalizarOrigem,
  normalizarTipoProjeto,
} from './layout-planilha';

export interface ErroImportacao {
  linha: number;
  coluna: string | null;
  mensagem: string;
}

export interface ResultadoImportacao {
  arquivo: string;
  linhasLidas: number;
  linhasImportadas: number;
  linhasIgnoradas: number;
  erros: ErroImportacao[];
}

@Injectable()
export class ImportacaoService {
  private readonly logger = new Logger(ImportacaoService.name);

  constructor(@Inject(DB) private readonly db: Database) {}

  /**
   * Importa a planilha de alimentação.
   *
   * Regras:
   * - linhas sem numeração ou sem nomenclatura são ignoradas (linhas de template);
   * - células de erro do Excel (#DIV/0!, #NAME?) são tratadas como vazias;
   * - as colunas calculadas da planilha são ignoradas — a API recalcula tudo;
   * - a gravação é por `numeracao` (upsert), então reimportar atualiza a formulação.
   */
  async importar(
    buffer: Buffer,
    nomeArquivo: string,
  ): Promise<ResultadoImportacao> {
    const workbook = new Workbook();
    try {
      // O tipo Buffer do @types/node e o esperado pelo exceljs divergem apenas
      // na assinatura genérica; o valor em tempo de execução é o mesmo.
      await workbook.xlsx.load(buffer as unknown as Parameters<
        typeof workbook.xlsx.load
      >[0]);
    } catch {
      throw new BadRequestException(
        'Não foi possível ler o arquivo. Envie a planilha no formato .xlsx.',
      );
    }

    const aba = this.encontrarAba(workbook);
    if (!aba) {
      throw new BadRequestException(
        `A planilha não tem a aba "${ABA_ALIMENTACAO}".`,
      );
    }

    const mapaMateriais = await this.garantirMateriais();
    const erros: ErroImportacao[] = [];
    let linhasLidas = 0;
    let linhasImportadas = 0;

    for (let linha = PRIMEIRA_LINHA_DADOS; linha <= aba.rowCount; linha++) {
      const numeracao = this.numero(aba, linha, COL.numeracao);
      const nomenclatura = this.texto(aba, linha, COL.nomenclatura);

      if (numeracao === null && !nomenclatura) continue;
      linhasLidas++;

      if (numeracao === null) {
        erros.push({
          linha,
          coluna: 'Numeração',
          mensagem: 'Numeração ausente ou não numérica — linha ignorada.',
        });
        continue;
      }
      if (!nomenclatura) {
        erros.push({
          linha,
          coluna: 'Nomenclatura',
          mensagem: 'Nomenclatura ausente — linha ignorada.',
        });
        continue;
      }

      try {
        await this.gravarLinha(
          aba,
          linha,
          numeracao,
          nomenclatura,
          mapaMateriais,
          erros,
        );
        linhasImportadas++;
      } catch (e) {
        const mensagem = e instanceof Error ? e.message : String(e);
        this.logger.error(`Erro na linha ${linha}: ${mensagem}`);
        erros.push({ linha, coluna: null, mensagem });
      }
    }

    return {
      arquivo: nomeArquivo,
      linhasLidas,
      linhasImportadas,
      linhasIgnoradas: linhasLidas - linhasImportadas,
      erros,
    };
  }

  private encontrarAba(workbook: Workbook): Worksheet | undefined {
    const alvo = this.normalizar(ABA_ALIMENTACAO);
    return workbook.worksheets.find((w) => this.normalizar(w.name) === alvo);
  }

  private normalizar(texto: string): string {
    return texto
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  /** Garante que os materiais da planilha existam no cadastro. */
  private async garantirMateriais(): Promise<Map<number, string>> {
    const porColuna = new Map<number, string>();

    for (const [i, m] of MATERIAIS_PLANILHA.entries()) {
      const [material] = await this.db
        .insert(materiais)
        .values({
          nome: m.nome,
          categoria: m.categoria as (typeof materiais.categoria.enumValues)[number],
          ordem: i,
        })
        .onConflictDoUpdate({
          target: materiais.nome,
          set: { ordem: i },
        })
        .returning({ id: materiais.id });

      if (material) porColuna.set(m.coluna, material.id);
    }

    return porColuna;
  }

  private async gravarLinha(
    aba: Worksheet,
    linha: number,
    numeracao: number,
    nomenclatura: string,
    mapaMateriais: Map<number, string>,
    erros: ErroImportacao[],
  ): Promise<void> {
    const tipoProjetoBruto = this.texto(aba, linha, COL.tipoProjeto);
    const tipoProjeto = tipoProjetoBruto
      ? normalizarTipoProjeto(tipoProjetoBruto)
      : null;
    if (tipoProjetoBruto && !tipoProjeto) {
      erros.push({
        linha,
        coluna: 'Tipo de Projeto',
        mensagem: `Tipo de projeto "${tipoProjetoBruto}" não reconhecido — gravado como vazio.`,
      });
    }

    const origemBruta = this.texto(aba, linha, COL.origem);
    const origem = origemBruta ? normalizarOrigem(origemBruta) : null;
    if (origemBruta && !origem) {
      erros.push({
        linha,
        coluna: 'Origem',
        mensagem: `Origem "${origemBruta}" não reconhecida — gravada como vazia.`,
      });
    }

    const dados = {
      nomenclatura,
      tipoProjeto: tipoProjeto as (typeof formulacoes.tipoProjeto.enumValues)[number] | null,
      desenvolvedor: this.texto(aba, linha, COL.desenvolvedor),
      alimentador: this.texto(aba, linha, COL.alimentador),
      avaliador: this.texto(aba, linha, COL.avaliador),
      data: this.data(aba, linha, COL.data),
      origem: origem as (typeof formulacoes.origem.enumValues)[number] | null,
      comentarios: this.texto(aba, linha, COL.comentarios),
      teorAgua: this.numero(aba, linha, COL.teorAgua),
      massaAgua: this.numero(aba, linha, COL.massaAgua),
      densAparenteMassa: this.numero(aba, linha, COL.densAparenteMassa),
      densAparenteVolume: this.numero(aba, linha, COL.densAparenteVolume),
      retencaoM0: this.numero(aba, linha, COL.retencaoM0),
      retencaoM1: this.numero(aba, linha, COL.retencaoM1),
      retencaoM2: this.numero(aba, linha, COL.retencaoM2),
      densFrescoMassa: this.numero(aba, linha, COL.densFrescoMassa),
      densFrescoVolume: this.numero(aba, linha, COL.densFrescoVolume),
      squeezeDeslocamento1: this.numero(aba, linha, COL.squeezeDeslocamento[0]),
      squeezeDeslocamento2: this.numero(aba, linha, COL.squeezeDeslocamento[1]),
      squeezeDeslocamento3: this.numero(aba, linha, COL.squeezeDeslocamento[2]),
      squeezeCarga1: this.numero(aba, linha, COL.squeezeCarga[0]),
      squeezeCarga2: this.numero(aba, linha, COL.squeezeCarga[1]),
      squeezeCarga3: this.numero(aba, linha, COL.squeezeCarga[2]),
      atualizadoEm: new Date(),
    };

    await this.db.transaction(async (tx) => {
      const [formulacao] = await tx
        .insert(formulacoes)
        .values({ numeracao, ...dados })
        .onConflictDoUpdate({ target: formulacoes.numeracao, set: dados })
        .returning({ id: formulacoes.id });

      if (!formulacao) {
        throw new Error('Falha ao gravar a formulação.');
      }
      const formulacaoId = formulacao.id;

      // Regrava as relações para que a reimportação seja idempotente.
      await tx
        .delete(componentesFormulacao)
        .where(eq(componentesFormulacao.formulacaoId, formulacaoId));
      await tx
        .delete(pontosGranulometricos)
        .where(eq(pontosGranulometricos.formulacaoId, formulacaoId));
      await tx
        .delete(ensaiosResistencia)
        .where(eq(ensaiosResistencia.formulacaoId, formulacaoId));
      await tx
        .delete(corposDeProvaEndurecidos)
        .where(eq(corposDeProvaEndurecidos.formulacaoId, formulacaoId));

      const componentes = MATERIAIS_PLANILHA.map((m) => ({
        formulacaoId,
        materialId: mapaMateriais.get(m.coluna) as string,
        teor: this.numero(aba, linha, m.coluna),
      })).filter(
        (c): c is { formulacaoId: string; materialId: string; teor: number } =>
          c.materialId !== undefined && c.teor !== null && c.teor > 0,
      );
      if (componentes.length > 0) {
        await tx.insert(componentesFormulacao).values(componentes);
      }

      const granulometria = GRANULOMETRIA_PLANILHA.map((g) => ({
        formulacaoId,
        peneiraMm: g.peneiraMm,
        frequencia: this.numero(aba, linha, g.coluna),
      })).filter(
        (
          g,
        ): g is { formulacaoId: string; peneiraMm: number; frequencia: number } =>
          g.frequencia !== null,
      );
      if (granulometria.length > 0) {
        await tx.insert(pontosGranulometricos).values(granulometria);
      }

      const resistencias = [
        ...FLEXAO_PLANILHA.map((f) => ({ tipo: 'FLEXAO' as const, ...f })),
        ...COMPRESSAO_PLANILHA.map((c) => ({ tipo: 'COMPRESSAO' as const, ...c })),
      ]
        .map((r) => ({
          formulacaoId,
          tipo: r.tipo,
          idadeDias: r.idadeDias,
          valores: r.colunas
            .map((c) => this.numero(aba, linha, c))
            .filter((v): v is number => v !== null),
        }))
        .filter((r) => r.valores.length > 0);
      if (resistencias.length > 0) {
        await tx.insert(ensaiosResistencia).values(resistencias);
      }

      const corpos = ENDURECIDO_PLANILHA.flatMap((bloco) =>
        bloco.corpos.map((cp) => {
          const [l1, l2, h1, h2, c1, c2] = cp.dimensoes.map((col) =>
            this.numero(aba, linha, col),
          );
          const [v1, v2, v3] = cp.velocidades.map((col) =>
            this.numero(aba, linha, col),
          );
          return {
            formulacaoId,
            idadeDias: bloco.idadeDias,
            indice: cp.indice,
            l1: l1 ?? null,
            l2: l2 ?? null,
            h1: h1 ?? null,
            h2: h2 ?? null,
            c1: c1 ?? null,
            c2: c2 ?? null,
            massa: this.numero(aba, linha, cp.massa),
            v1: v1 ?? null,
            v2: v2 ?? null,
            v3: v3 ?? null,
          };
        }),
      ).filter((cp) => cp.l1 !== null || cp.massa !== null || cp.v1 !== null);
      if (corpos.length > 0) {
        await tx.insert(corposDeProvaEndurecidos).values(corpos);
      }
    });
  }

  /** Lê uma célula tratando fórmulas e erros do Excel. */
  private valor(aba: Worksheet, linha: number, coluna: number): unknown {
    const celula = aba.getCell(linha, coluna);
    const v = celula.value;
    if (v === null || v === undefined) return null;

    if (v instanceof Date) return v;

    if (typeof v === 'object') {
      const obj = v as unknown as Record<string, unknown>;
      // Célula de erro: { error: '#DIV/0!' }
      if ('error' in obj) return null;
      // Fórmula: { formula, result }
      if ('result' in obj) {
        const r = obj.result as unknown;
        if (r && typeof r === 'object' && 'error' in (r as object)) return null;
        return r ?? null;
      }
      if ('richText' in obj) {
        const partes = obj.richText as { text: string }[];
        return partes.map((p) => p.text).join('');
      }
    }
    return v;
  }

  private numero(aba: Worksheet, linha: number, coluna: number): number | null {
    const v = this.valor(aba, linha, coluna);
    if (v === null) return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (typeof v === 'string') {
      const limpo = v.trim().replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
      if (limpo === '') return null;
      const n = Number(limpo);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }

  private texto(aba: Worksheet, linha: number, coluna: number): string | null {
    const v = this.valor(aba, linha, coluna);
    if (v === null) return null;
    const t = String(v).trim();
    return t === '' ? null : t;
  }

  private data(aba: Worksheet, linha: number, coluna: number): Date | null {
    const v = this.valor(aba, linha, coluna);
    if (v === null) return null;
    if (v instanceof Date) return v;
    if (typeof v === 'string') {
      // Aceita dd/mm/aaaa, formato usual da planilha.
      const m = v.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (m) {
        const ano = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3]);
        const d = new Date(Date.UTC(ano, Number(m[2]) - 1, Number(m[1])));
        return Number.isNaN(d.getTime()) ? null : d;
      }
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
  }
}
