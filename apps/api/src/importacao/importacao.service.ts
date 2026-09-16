import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Workbook, Worksheet } from 'exceljs';
import { DB, Database } from '../db/db.module';
import {
  componentesFormulacao,
  corposDeProvaEndurecidos,
  ensaiosResistencia,
  formulacoes,
  importacoes,
  importacoesFormulacoes,
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
  VERSAO_LAYOUT_PLANILHA,
  normalizarOrigem,
  normalizarTipoProjeto,
} from './layout-planilha';

export interface ErroImportacao {
  linha: number;
  coluna: string | null;
  mensagem: string;
  bloqueante?: boolean;
}

export interface ResultadoImportacao {
  importacaoId?: string;
  arquivo: string;
  linhasLidas: number;
  linhasImportadas: number;
  linhasIgnoradas: number;
  erros: ErroImportacao[];
  bloqueios?: ErroImportacao[];
  prontoParaImportar?: boolean;
  formulacoesAfetadas?: {
    id: string;
    numeracao: number;
    acao: 'CRIADA' | 'ATUALIZADA';
  }[];
}

type Transacao = Parameters<Parameters<Database['transaction']>[0]>[0];
type Gravador = Database | Transacao;

interface LinhaValida {
  linha: number;
  numeracao: number;
  nomenclatura: string;
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
    usuarioId: string,
  ): Promise<ResultadoImportacao> {
    const analise = await this.analisar(buffer, nomeArquivo);

    if ((analise.bloqueios?.length ?? 0) > 0) {
      throw new BadRequestException({
        message:
          'A planilha parece estar em um layout incompatível. Nenhum dado foi gravado.',
        erros: analise.bloqueios,
      });
    }

    const workbook = await this.carregarWorkbook(buffer);
    const aba = this.encontrarAba(workbook);
    if (!aba) {
      throw new BadRequestException(
        `A planilha não tem a aba "${ABA_ALIMENTACAO}".`,
      );
    }

    const mapaMateriais = await this.garantirMateriais();
    const formulacoesAfetadas: NonNullable<
      ResultadoImportacao['formulacoesAfetadas']
    > = [];

    const importacaoId = await this.db.transaction(async (tx) => {
      for (const linha of analise.linhasValidas) {
        const afetada = await this.gravarLinha(
          tx,
          aba,
          linha.linha,
          linha.numeracao,
          linha.nomenclatura,
          mapaMateriais,
          analise.erros,
        );
        formulacoesAfetadas.push(afetada);
      }

      const [registro] = await tx
        .insert(importacoes)
        .values({
          arquivoNome: nomeArquivo,
          usuarioId,
          linhasLidas: analise.linhasLidas,
          linhasImportadas: analise.linhasImportadas,
          linhasIgnoradas: analise.linhasIgnoradas,
          avisos: analise.erros,
        })
        .returning({ id: importacoes.id });

      if (!registro) throw new Error('Falha ao registrar a importação.');

      if (formulacoesAfetadas.length > 0) {
        await tx.insert(importacoesFormulacoes).values(
          formulacoesAfetadas.map((f) => ({
            importacaoId: registro.id,
            formulacaoId: f.id,
            numeracao: f.numeracao,
            acao: f.acao,
          })),
        );
      }

      return registro.id;
    });

    return {
      ...analise,
      importacaoId,
      formulacoesAfetadas,
      prontoParaImportar: undefined,
      bloqueios: undefined,
      linhasValidas: undefined,
    } as ResultadoImportacao;
  }

  async validar(buffer: Buffer, nomeArquivo: string): Promise<ResultadoImportacao> {
    const analise = await this.analisar(buffer, nomeArquivo);
    return {
      ...analise,
      prontoParaImportar: (analise.bloqueios?.length ?? 0) === 0,
      linhasValidas: undefined,
    } as ResultadoImportacao;
  }

  async historico() {
    const registros = await this.db.query.importacoes.findMany({
      with: {
        usuario: true,
        formulacoes: true,
      },
      orderBy: (t, { desc }) => [desc(t.criadoEm)],
      limit: 50,
    });

    return registros.map((r) => ({
      id: r.id,
      arquivo: r.arquivoNome,
      usuario: {
        id: r.usuario.id,
        nome: r.usuario.nome,
        email: r.usuario.email,
      },
      linhasLidas: r.linhasLidas,
      linhasImportadas: r.linhasImportadas,
      linhasIgnoradas: r.linhasIgnoradas,
      avisos: Array.isArray(r.avisos) ? r.avisos : [],
      formulacoes: r.formulacoes.map((f) => ({
        formulacaoId: f.formulacaoId,
        numeracao: f.numeracao,
        acao: f.acao,
      })),
      criadoEm: r.criadoEm.toISOString(),
    }));
  }

  async gerarTemplate(): Promise<Buffer> {
    const workbook = new Workbook();
    workbook.creator = 'Dashboard de Argamassas';
    workbook.created = new Date();

    const metadados = workbook.addWorksheet('_metadados');
    metadados.getCell('A1').value = 'layout';
    metadados.getCell('B1').value = VERSAO_LAYOUT_PLANILHA;
    metadados.getCell('A2').value = 'geradoEm';
    metadados.getCell('B2').value = new Date().toISOString();
    metadados.state = 'veryHidden';

    const aba = workbook.addWorksheet(ABA_ALIMENTACAO);
    aba.getRow(8).getCell(1).value = 'Identificação';
    aba.getRow(8).getCell(COL.teorAgua).value = 'Composição e anidro';
    aba.getRow(8).getCell(COL.retencaoM0).value = 'Estado fresco';
    aba.getRow(8).getCell(FLEXAO_PLANILHA[0]?.colunas[0] ?? 80).value =
      'Estado endurecido';

    const cabecalhos = new Map<number, string>([
      [COL.numeracao, 'Numeração'],
      [COL.nomenclatura, 'Nomenclatura'],
      [COL.tipoProjeto, 'Tipo de Projeto'],
      [COL.desenvolvedor, 'Desenvolvedor'],
      [COL.alimentador, 'Alimentador'],
      [COL.avaliador, 'Avaliador'],
      [COL.data, 'Data'],
      [COL.origem, 'Origem'],
      [COL.teorAgua, 'Teor de água (%)'],
      [COL.massaAgua, 'Massa de água (g)'],
      [COL.comentarios, 'Comentários'],
      [COL.densAparenteMassa, 'Densidade aparente — massa (g)'],
      [COL.densAparenteVolume, 'Densidade aparente — volume (cm³)'],
      [COL.retencaoM0, 'Retenção de água — M0 (g)'],
      [COL.retencaoM1, 'Retenção de água — M1 (g)'],
      [COL.retencaoM2, 'Retenção de água — M2 (g)'],
      [COL.densFrescoMassa, 'Densidade fresca — massa (g)'],
      [COL.densFrescoVolume, 'Densidade fresca — volume (cm³)'],
    ]);

    for (const [i, coluna] of COL.squeezeDeslocamento.entries()) {
      cabecalhos.set(coluna, `Squeeze deslocamento ${i + 1} (mm)`);
    }
    for (const [i, coluna] of COL.squeezeCarga.entries()) {
      cabecalhos.set(coluna, `Squeeze carga ${i + 1} (N)`);
    }
    for (const material of MATERIAIS_PLANILHA) {
      cabecalhos.set(material.coluna, `${material.nome} (%)`);
    }
    for (const ponto of GRANULOMETRIA_PLANILHA) {
      cabecalhos.set(
        ponto.coluna,
        ponto.peneiraMm === 0
          ? 'Granulometria — fundo (%)'
          : `Granulometria — ${ponto.peneiraMm} mm (%)`,
      );
    }
    for (const bloco of FLEXAO_PLANILHA) {
      bloco.colunas.forEach((coluna, i) =>
        cabecalhos.set(coluna, `Flexão ${bloco.idadeDias}d CP${i + 1} (MPa)`),
      );
    }
    for (const bloco of COMPRESSAO_PLANILHA) {
      bloco.colunas.forEach((coluna, i) =>
        cabecalhos.set(
          coluna,
          `Compressão ${bloco.idadeDias}d CP${i + 1} (MPa)`,
        ),
      );
    }
    for (const bloco of ENDURECIDO_PLANILHA) {
      for (const cp of bloco.corpos) {
        const prefixo = `Endurecido ${bloco.idadeDias}d CP${cp.indice}`;
        const nomes = ['L1', 'L2', 'H1', 'H2', 'C1', 'C2'];
        cp.dimensoes.forEach((coluna, i) =>
          cabecalhos.set(coluna, `${prefixo} ${nomes[i]} (cm)`),
        );
        cabecalhos.set(cp.massa, `${prefixo} massa (g)`);
        cp.velocidades.forEach((coluna, i) =>
          cabecalhos.set(coluna, `${prefixo} velocidade ${i + 1} (km/s)`),
        );
      }
    }

    for (const [coluna, rotulo] of cabecalhos.entries()) {
      const celula = aba.getRow(10).getCell(coluna);
      celula.value = rotulo;
      celula.font = { bold: true };
      aba.getColumn(coluna).width = Math.min(Math.max(rotulo.length + 2, 12), 32);
    }

    aba.views = [{ state: 'frozen', ySplit: 10, xSplit: 2 }];
    aba.getRow(11).getCell(COL.numeracao).value = 1;
    aba.getRow(11).getCell(COL.nomenclatura).value = 'Exemplo de formulação';

    const dados = await workbook.xlsx.writeBuffer();
    return Buffer.from(dados);
  }

  private async carregarWorkbook(buffer: Buffer): Promise<Workbook> {
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
    return workbook;
  }

  private async analisar(buffer: Buffer, nomeArquivo: string) {
    const workbook = await this.carregarWorkbook(buffer);

    const aba = this.encontrarAba(workbook);
    if (!aba) {
      throw new BadRequestException(
        `A planilha não tem a aba "${ABA_ALIMENTACAO}".`,
      );
    }

    const erros: ErroImportacao[] = [];
    const bloqueios: ErroImportacao[] = [];
    const linhasValidas: LinhaValida[] = [];
    let linhasLidas = 0;
    let linhasIgnoradas = 0;

    const versao = this.versaoLayout(workbook);
    if (versao && versao !== VERSAO_LAYOUT_PLANILHA) {
      bloqueios.push({
        linha: 0,
        coluna: '_metadados',
        mensagem: `Template ${versao} incompatível com o importador atual (${VERSAO_LAYOUT_PLANILHA}). Baixe o template atualizado.`,
        bloqueante: true,
      });
    }

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
        linhasIgnoradas++;
        continue;
      }
      if (!nomenclatura) {
        erros.push({
          linha,
          coluna: 'Nomenclatura',
          mensagem: 'Nomenclatura ausente — linha ignorada.',
        });
        linhasIgnoradas++;
        continue;
      }

      if (!this.temDadosImportaveis(aba, linha)) {
        erros.push({
          linha,
          coluna: null,
          mensagem:
            'Linha com numeração e nomenclatura, mas sem dados de ensaio/composição — ignorada para não sobrescrever registros existentes.',
        });
        linhasIgnoradas++;
        continue;
      }

      const problemas = this.validarPlausibilidade(aba, linha);
      erros.push(...problemas);
      bloqueios.push(...problemas.filter((p) => p.bloqueante));
      linhasValidas.push({ linha, numeracao, nomenclatura });
    }

    return {
      arquivo: nomeArquivo,
      linhasLidas,
      linhasImportadas: linhasValidas.length,
      linhasIgnoradas,
      erros,
      bloqueios,
      linhasValidas,
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
    tx: Gravador,
    aba: Worksheet,
    linha: number,
    numeracao: number,
    nomenclatura: string,
    mapaMateriais: Map<number, string>,
    erros: ErroImportacao[],
  ): Promise<{ id: string; numeracao: number; acao: 'CRIADA' | 'ATUALIZADA' }> {
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

    const [existente] = await tx
      .select({ id: formulacoes.id })
      .from(formulacoes)
      .where(eq(formulacoes.numeracao, numeracao))
      .limit(1);

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

    return {
      id: formulacaoId,
      numeracao,
      acao: existente ? 'ATUALIZADA' : 'CRIADA',
    };
  }

  private versaoLayout(workbook: Workbook): string | null {
    const aba = workbook.getWorksheet('_metadados');
    const chave = aba?.getCell('A1').value;
    const valor = aba?.getCell('B1').value;
    if (String(chave ?? '').trim().toLowerCase() !== 'layout') return null;
    return valor ? String(valor).trim() : null;
  }

  private temDadosImportaveis(aba: Worksheet, linha: number): boolean {
    const colunas = [
      COL.teorAgua,
      COL.massaAgua,
      COL.densAparenteMassa,
      COL.densAparenteVolume,
      COL.retencaoM0,
      COL.retencaoM1,
      COL.retencaoM2,
      COL.densFrescoMassa,
      COL.densFrescoVolume,
      ...COL.squeezeDeslocamento,
      ...COL.squeezeCarga,
      ...MATERIAIS_PLANILHA.map((m) => m.coluna),
      ...GRANULOMETRIA_PLANILHA.map((g) => g.coluna),
      ...FLEXAO_PLANILHA.flatMap((f) => f.colunas),
      ...COMPRESSAO_PLANILHA.flatMap((c) => c.colunas),
      ...ENDURECIDO_PLANILHA.flatMap((bloco) =>
        bloco.corpos.flatMap((cp) => [
          ...cp.dimensoes,
          cp.massa,
          ...cp.velocidades,
        ]),
      ),
    ];

    return colunas.some((coluna) => this.numero(aba, linha, coluna) !== null);
  }

  private validarPlausibilidade(
    aba: Worksheet,
    linha: number,
  ): ErroImportacao[] {
    const problemas: ErroImportacao[] = [];

    const bloquear = (coluna: string, mensagem: string) => {
      problemas.push({ linha, coluna, mensagem, bloqueante: true });
    };

    const intervalo = (
      coluna: string,
      valor: number | null,
      min: number,
      max: number,
      unidade: string,
    ) => {
      if (valor === null) return;
      if (valor < min || valor > max) {
        bloquear(
          coluna,
          `Valor ${valor} ${unidade} fora da faixa plausível (${min} a ${max}). Confira se o layout da planilha mudou.`,
        );
      }
    };

    intervalo('Teor de água', this.numero(aba, linha, COL.teorAgua), 1, 60, '%');
    intervalo('Massa de água', this.numero(aba, linha, COL.massaAgua), 10, 5000, 'g');
    intervalo(
      'Densidade aparente — massa',
      this.numero(aba, linha, COL.densAparenteMassa),
      100,
      5000,
      'g',
    );
    intervalo(
      'Densidade aparente — volume',
      this.numero(aba, linha, COL.densAparenteVolume),
      50,
      5000,
      'cm³',
    );
    intervalo(
      'Retenção de água — M0',
      this.numero(aba, linha, COL.retencaoM0),
      100,
      10000,
      'g',
    );
    intervalo(
      'Retenção de água — M1',
      this.numero(aba, linha, COL.retencaoM1),
      100,
      20000,
      'g',
    );
    intervalo(
      'Retenção de água — M2',
      this.numero(aba, linha, COL.retencaoM2),
      100,
      20000,
      'g',
    );
    intervalo(
      'Densidade fresca — massa',
      this.numero(aba, linha, COL.densFrescoMassa),
      100,
      5000,
      'g',
    );
    intervalo(
      'Densidade fresca — volume',
      this.numero(aba, linha, COL.densFrescoVolume),
      50,
      5000,
      'cm³',
    );

    for (const [i, coluna] of COL.squeezeDeslocamento.entries()) {
      intervalo(
        `Squeeze-flow — deslocamento ${i + 1}`,
        this.numero(aba, linha, coluna),
        0,
        100,
        'mm',
      );
    }
    for (const [i, coluna] of COL.squeezeCarga.entries()) {
      intervalo(
        `Squeeze-flow — carga ${i + 1}`,
        this.numero(aba, linha, coluna),
        0,
        10000,
        'N',
      );
    }

    const m0 = this.numero(aba, linha, COL.retencaoM0);
    const m1 = this.numero(aba, linha, COL.retencaoM1);
    const m2 = this.numero(aba, linha, COL.retencaoM2);
    if (m0 !== null && m1 !== null && m1 <= m0) {
      bloquear(
        'Retenção de água',
        'M1 deve ser maior que M0. Esse padrão costuma indicar coluna deslocada.',
      );
    }
    if (m1 !== null && m2 !== null && m2 > m1) {
      bloquear(
        'Retenção de água',
        'M2 não deve ser maior que M1. Esse padrão costuma indicar coluna deslocada.',
      );
    }

    const granulometria = GRANULOMETRIA_PLANILHA.map((g) =>
      this.numero(aba, linha, g.coluna),
    ).filter((v): v is number => v !== null);
    if (granulometria.length >= 4) {
      const soma = granulometria.reduce((total, v) => total + v, 0);
      if (soma < 95 || soma > 105) {
        bloquear(
          'Granulometria',
          `A soma das frequências retidas é ${soma.toFixed(1)}%, fora do esperado perto de 100%.`,
        );
      }
      for (const valor of granulometria) {
        if (valor < 0 || valor > 100) {
          bloquear(
            'Granulometria',
            `Frequência ${valor}% fora da faixa 0 a 100%.`,
          );
          break;
        }
      }
    }

    for (const bloco of FLEXAO_PLANILHA) {
      for (const coluna of bloco.colunas) {
        intervalo(
          `Flexão ${bloco.idadeDias}d`,
          this.numero(aba, linha, coluna),
          0,
          30,
          'MPa',
        );
      }
    }
    for (const bloco of COMPRESSAO_PLANILHA) {
      for (const coluna of bloco.colunas) {
        intervalo(
          `Compressão ${bloco.idadeDias}d`,
          this.numero(aba, linha, coluna),
          0,
          100,
          'MPa',
        );
      }
    }

    return problemas;
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
