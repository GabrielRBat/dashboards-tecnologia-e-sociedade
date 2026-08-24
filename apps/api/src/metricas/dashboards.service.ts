import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { arredondar, media, desvioPadrao } from '../calculos/calculos';
import { regressaoLinear } from '../calculos/normas';
import { DB, Database } from '../db/db.module';
import { GruposService } from '../auth/grupos.service';
import { dashboards, dashboardsGrupos, grupos as tabelaGrupos } from '../db/schema';
import { ListarFormulacoesDto } from '../formulacoes/dto/listar-formulacoes.dto';
import { FormulacaoDetalhada } from '../formulacoes/formulacao.mapper';
import { FormulacoesService } from '../formulacoes/formulacoes.service';
import {
  QuemPergunta,
  Visibilidade,
  motivoSemAcesso,
  podeEditar,
  podeVer,
} from './visibilidade';
import {
  AGREGACOES,
  Agregacao,
  METRICAS,
  Metrica,
  TIPOS_PAINEL,
  TipoPainel,
  obterMetrica,
  validarCruzamento,
} from './catalogo';

/** Configuração de um painel, como fica salva no dashboard. */
export interface PainelConfig {
  id: string;
  titulo: string;
  tipo: TipoPainel;
  metricaX: string;
  metricaY?: string | null;
  agregacao?: Agregacao | null;
  /** Quantas faixas no histograma da distribuição. */
  faixas?: number | null;
}

const AGREGACOES_VALIDAS = new Set(AGREGACOES.map((a) => a.chave));
const TIPOS_VALIDOS = new Set(TIPOS_PAINEL.map((t) => t.chave));

const VISIBILIDADES: Visibilidade[] = ['TODOS', 'GRUPOS', 'PRIVADO'];

@Injectable()
export class DashboardsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly formulacoes: FormulacoesService,
    private readonly gruposService: GruposService,
  ) {}

  /** Monta o "quem pergunta" com os grupos da pessoa, base de toda decisão. */
  private async contexto(usuario: {
    id: string;
    papel: 'ADMIN' | 'MEMBRO';
  }): Promise<QuemPergunta> {
    return {
      id: usuario.id,
      papel: usuario.papel,
      grupos: await this.gruposService.gruposDoUsuario(usuario.id),
    };
  }

  /** Grupos vinculados a cada dashboard informado. */
  private async gruposDosDashboards(
    ids: string[],
  ): Promise<Map<string, string[]>> {
    const mapa = new Map<string, string[]>(ids.map((id) => [id, []]));
    if (ids.length === 0) return mapa;

    const vinculos = await this.db
      .select()
      .from(dashboardsGrupos)
      .where(inArray(dashboardsGrupos.dashboardId, ids));

    for (const v of vinculos) {
      mapa.get(v.dashboardId)?.push(v.grupoId);
    }
    return mapa;
  }

  /** Catálogo completo, para o construtor montar os seletores. */
  catalogo() {
    return {
      metricas: METRICAS.map((m) => ({
        chave: m.chave,
        rotulo: m.rotulo,
        unidade: m.unidade,
        natureza: m.natureza,
        nivel: m.nivel,
        grupo: m.grupo,
        casas: m.casas ?? 2,
      })),
      tipos: TIPOS_PAINEL,
      agregacoes: AGREGACOES,
    };
  }

  /** Valida um cruzamento sem precisar salvar nada — usado ao montar. */
  validar(tipo: TipoPainel, metricaX: string, metricaY?: string) {
    return validarCruzamento(tipo, metricaX, metricaY);
  }

  /** Só os dashboards que a pessoa pode ver. */
  async listar(usuario: { id: string; papel: 'ADMIN' | 'MEMBRO' }) {
    const [linhas, quem] = await Promise.all([
      this.db.select().from(dashboards),
      this.contexto(usuario),
    ]);

    const gruposPorDash = await this.gruposDosDashboards(linhas.map((l) => l.id));

    const acessoDe = (d: (typeof linhas)[number]) => ({
      criadoPor: d.criadoPor,
      visibilidade: d.visibilidade,
      grupos: gruposPorDash.get(d.id) ?? [],
    });

    return linhas
      .filter((d) => podeVer(acessoDe(d), quem))
      .map((d) => ({
        ...d,
        grupos: gruposPorDash.get(d.id) ?? [],
        podeEditar: podeEditar(acessoDe(d), quem),
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  /**
   * Um dashboard, conferindo o acesso.
   *
   * Responde **404, e não 403**, para quem não pode ver: um "acesso negado"
   * confirmaria que aquele dashboard existe, e o nome dele costuma dizer no que
   * a equipe está trabalhando. Quem pode ver mas não editar recebe 403 ao
   * salvar - ali a existência já não é segredo.
   */
  async obter(
    id: string,
    usuario: { id: string; papel: 'ADMIN' | 'MEMBRO' },
    exigirEdicao = false,
  ) {
    const [linha] = await this.db
      .select()
      .from(dashboards)
      .where(eq(dashboards.id, id));

    if (!linha) throw new NotFoundException(`Dashboard ${id} não encontrado`);

    const quem = await this.contexto(usuario);
    const gruposDoDash = (await this.gruposDosDashboards([id])).get(id) ?? [];
    const acesso = {
      criadoPor: linha.criadoPor,
      visibilidade: linha.visibilidade,
      grupos: gruposDoDash,
    };

    if (!podeVer(acesso, quem)) {
      throw new NotFoundException(`Dashboard ${id} não encontrado`);
    }

    if (exigirEdicao && !podeEditar(acesso, quem)) {
      throw new ForbiddenException(
        'Só quem criou o dashboard (ou um administrador) pode alterá-lo.',
      );
    }

    return { ...linha, grupos: gruposDoDash, podeEditar: podeEditar(acesso, quem) };
  }

  async criar(
    dados: {
      nome: string;
      descricao?: string;
      paineis?: PainelConfig[];
      visibilidade?: Visibilidade;
      grupos?: string[];
    },
    usuario: { id: string; papel: 'ADMIN' | 'MEMBRO' },
  ) {
    const paineis = this.validarPaineis(dados.paineis ?? []);
    const visibilidade = this.validarVisibilidade(dados.visibilidade);

    const [criado] = await this.db
      .insert(dashboards)
      .values({
        nome: dados.nome.trim(),
        descricao: dados.descricao?.trim() || null,
        paineis,
        criadoPor: usuario.id,
        visibilidade,
      })
      .returning();

    if (visibilidade === 'GRUPOS') {
      await this.definirGrupos(criado.id, dados.grupos ?? []);
    }

    return this.obter(criado.id, usuario);
  }

  async atualizar(
    id: string,
    dados: {
      nome?: string;
      descricao?: string;
      paineis?: PainelConfig[];
      visibilidade?: Visibilidade;
      grupos?: string[];
    },
    usuario: { id: string; papel: 'ADMIN' | 'MEMBRO' },
  ) {
    const atual = await this.obter(id, usuario, true);

    const campos: Record<string, unknown> = { atualizadoEm: new Date() };
    if (dados.nome !== undefined) campos.nome = dados.nome.trim();
    if (dados.descricao !== undefined) {
      campos.descricao = dados.descricao.trim() || null;
    }
    if (dados.paineis !== undefined) {
      campos.paineis = this.validarPaineis(dados.paineis);
    }
    if (dados.visibilidade !== undefined) {
      campos.visibilidade = this.validarVisibilidade(dados.visibilidade);
    }

    await this.db.update(dashboards).set(campos).where(eq(dashboards.id, id));

    if (dados.grupos !== undefined || dados.visibilidade !== undefined) {
      const visibilidadeFinal =
        (campos.visibilidade as Visibilidade | undefined) ?? atual.visibilidade;

      /*
       * Sair de GRUPOS limpa os vínculos. Deixá-los para trás faria o painel
       * voltar a ser visível para as mesmas pessoas se alguém restaurasse a
       * visibilidade depois - uma permissão que ninguém lembra de ter dado.
       */
      await this.definirGrupos(
        id,
        visibilidadeFinal === 'GRUPOS' ? (dados.grupos ?? []) : [],
      );
    }

    return this.obter(id, usuario);
  }

  async remover(id: string, usuario: { id: string; papel: 'ADMIN' | 'MEMBRO' }) {
    await this.obter(id, usuario, true);
    await this.db.delete(dashboards).where(eq(dashboards.id, id));
    return { removido: true };
  }

  private validarVisibilidade(valor?: Visibilidade): Visibilidade {
    if (valor === undefined) return 'TODOS';
    if (!VISIBILIDADES.includes(valor)) {
      throw new BadRequestException(`Visibilidade desconhecida: ${valor}.`);
    }
    return valor;
  }

  /** Substitui os grupos que enxergam o dashboard. */
  private async definirGrupos(dashboardId: string, ids: string[]): Promise<void> {
    const unicos = [...new Set(ids.filter(Boolean))];

    if (unicos.length > 0) {
      const existem = await this.db
        .select()
        .from(tabelaGrupos)
        .where(inArray(tabelaGrupos.id, unicos));

      if (existem.length !== unicos.length) {
        throw new BadRequestException(
          'A lista de grupos tem um grupo que não existe mais.',
        );
      }
    }

    await this.db
      .delete(dashboardsGrupos)
      .where(eq(dashboardsGrupos.dashboardId, dashboardId));

    if (unicos.length > 0) {
      await this.db
        .insert(dashboardsGrupos)
        .values(unicos.map((grupoId) => ({ dashboardId, grupoId })));
    }
  }

  /**
   * Recusa painel inválido **na gravação**, não só na interface.
   *
   * A validação do construtor é conveniência; esta é a que vale. Sem ela,
   * bastaria uma requisição direta para gravar um cruzamento sem sentido e o
   * gráfico enganoso passaria a existir para toda a equipe.
   */
  private validarPaineis(paineis: PainelConfig[]): PainelConfig[] {
    if (!Array.isArray(paineis)) {
      throw new BadRequestException('A lista de painéis é inválida.');
    }

    return paineis.map((p, i) => {
      const onde = `Painel ${i + 1}`;

      if (!p || typeof p !== 'object') {
        throw new BadRequestException(`${onde}: configuração inválida.`);
      }
      if (!TIPOS_VALIDOS.has(p.tipo)) {
        throw new BadRequestException(`${onde}: tipo de gráfico desconhecido.`);
      }

      const veredito = validarCruzamento(p.tipo, p.metricaX, p.metricaY);
      if (!veredito.valido) {
        throw new BadRequestException(`${onde}: ${veredito.motivo}`);
      }

      if (p.agregacao != null && !AGREGACOES_VALIDAS.has(p.agregacao)) {
        throw new BadRequestException(`${onde}: agregação desconhecida.`);
      }

      const faixas =
        p.faixas == null ? null : Math.max(3, Math.min(20, Math.round(p.faixas)));

      return {
        id: typeof p.id === 'string' && p.id ? p.id : `painel-${i + 1}`,
        titulo: (p.titulo ?? '').trim() || this.tituloAutomatico(p),
        tipo: p.tipo,
        metricaX: p.metricaX,
        metricaY: p.metricaY ?? null,
        agregacao: p.agregacao ?? (p.tipo === 'barras' ? 'media' : null),
        faixas,
      };
    });
  }

  private tituloAutomatico(p: PainelConfig): string {
    const x = obterMetrica(p.metricaX)?.rotulo ?? p.metricaX;
    const y = p.metricaY ? obterMetrica(p.metricaY)?.rotulo : undefined;
    if (p.tipo === 'distribuicao') return `Distribuição de ${x}`;
    if (p.tipo === 'barras') return `${y} por ${x}`;
    return `${y} e ${x}`;
  }

  /**
   * Calcula os dados de todos os painéis de um dashboard, com uma leitura só do
   * banco — mesma razão do `/indicadores/painel`.
   */
  async dados(
    id: string,
    filtros: ListarFormulacoesDto,
    usuario: { id: string; papel: 'ADMIN' | 'MEMBRO' },
  ) {
    const dashboard = await this.obter(id, usuario);
    const paineis = (dashboard.paineis ?? []) as PainelConfig[];
    const itens = await this.formulacoes.listarTodas(filtros);

    return {
      dashboard: {
        id: dashboard.id,
        nome: dashboard.nome,
        descricao: dashboard.descricao,
        visibilidade: dashboard.visibilidade,
        grupos: dashboard.grupos,
        podeEditar: dashboard.podeEditar,
      },
      totalFormulacoes: itens.length,
      paineis: paineis.map((p) => this.calcularPainel(p, itens)),
    };
  }

  /** Prévia sem salvar — é o que o construtor mostra enquanto se monta. */
  async previa(painel: PainelConfig, filtros: ListarFormulacoesDto) {
    const [validado] = this.validarPaineis([painel]);
    const itens = await this.formulacoes.listarTodas(filtros);
    return this.calcularPainel(validado as PainelConfig, itens);
  }

  private calcularPainel(p: PainelConfig, itens: FormulacaoDetalhada[]) {
    const x = obterMetrica(p.metricaX) as Metrica;
    const y = p.metricaY ? obterMetrica(p.metricaY) : undefined;
    const veredito = validarCruzamento(p.tipo, p.metricaX, p.metricaY);

    const base = {
      id: p.id,
      titulo: p.titulo,
      tipo: p.tipo,
      eixoX: descreverMetrica(x),
      eixoY: y ? descreverMetrica(y) : null,
      agregacao: p.agregacao ?? null,
      alerta: veredito.alerta ?? null,
    };

    if (p.tipo === 'dispersao' && y) {
      const pontos = itens
        .map((f) => ({
          formulacaoId: f.id,
          nomenclatura: f.nomenclatura,
          tipoProjeto: f.tipoProjeto,
          x: numero(x.valor(f)),
          y: numero(y.valor(f)),
        }))
        .filter((pt) => pt.x !== null && pt.y !== null);

      const r = regressaoLinear(pontos);

      return {
        ...base,
        pontos,
        regressao: r
          ? {
              a: arredondar(r.a, 4),
              b: arredondar(r.b, 4),
              r2: arredondar(r.r2, 3),
              n: r.n,
            }
          : null,
        semDado: itens.length - pontos.length,
      };
    }

    if (p.tipo === 'barras' && y) {
      const grupos = new Map<string, number[]>();
      let semDado = 0;

      for (const f of itens) {
        const categoria = texto(x.valor(f));
        const valor = numero(y.valor(f));
        if (categoria === null || valor === null) {
          semDado += 1;
          continue;
        }
        const lista = grupos.get(categoria) ?? [];
        lista.push(valor);
        grupos.set(categoria, lista);
      }

      const agregacao = p.agregacao ?? 'media';
      const barras = [...grupos.entries()]
        .map(([categoria, valores]) => ({
          categoria,
          valor: arredondar(agregar(valores, agregacao), y.casas ?? 2),
          formulacoes: valores.length,
          desvio:
            agregacao === 'media'
              ? arredondar(desvioPadrao(valores), y.casas ?? 2)
              : null,
        }))
        .sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0));

      return { ...base, barras, semDado };
    }

    // distribuição
    if (x.natureza === 'categorica') {
      const contagem = new Map<string, number>();
      let semDado = 0;
      for (const f of itens) {
        const categoria = texto(x.valor(f));
        if (categoria === null) semDado += 1;
        else contagem.set(categoria, (contagem.get(categoria) ?? 0) + 1);
      }
      const barras = [...contagem.entries()]
        .map(([categoria, total]) => ({ categoria, valor: total, formulacoes: total, desvio: null }))
        .sort((a, b) => b.valor - a.valor);

      return { ...base, barras, semDado, porFaixa: false };
    }

    // Histograma de uma medida contínua.
    const valores = itens
      .map((f) => numero(x.valor(f)))
      .filter((v): v is number => v !== null);
    const semDado = itens.length - valores.length;

    if (valores.length === 0) {
      return { ...base, barras: [], semDado, porFaixa: true };
    }

    const minimo = Math.min(...valores);
    const maximo = Math.max(...valores);
    const quantidade = p.faixas ?? 6;

    // Todos os valores iguais: uma faixa só, senão a largura seria zero.
    if (minimo === maximo) {
      return {
        ...base,
        barras: [
          {
            categoria: formatar(minimo, x),
            valor: valores.length,
            formulacoes: valores.length,
            desvio: null,
          },
        ],
        semDado,
        porFaixa: true,
      };
    }

    const largura = (maximo - minimo) / quantidade;
    const baldes = Array.from({ length: quantidade }, (_, i) => ({
      inicio: minimo + i * largura,
      fim: minimo + (i + 1) * largura,
      total: 0,
    }));

    for (const v of valores) {
      // O último balde é fechado à direita, senão o valor máximo cairia fora.
      const indice = Math.min(
        quantidade - 1,
        Math.floor((v - minimo) / largura),
      );
      (baldes[indice] as { total: number }).total += 1;
    }

    return {
      ...base,
      barras: baldes.map((b) => ({
        categoria: `${formatar(b.inicio, x)}–${formatar(b.fim, x)}`,
        valor: b.total,
        formulacoes: b.total,
        desvio: null,
      })),
      semDado,
      porFaixa: true,
    };
  }
}

function descreverMetrica(m: Metrica) {
  return {
    chave: m.chave,
    rotulo: m.rotulo,
    unidade: m.unidade,
    natureza: m.natureza,
    casas: m.casas ?? 2,
  };
}

const numero = (v: number | string | null): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

const texto = (v: number | string | null): string | null =>
  v === null || v === '' ? null : String(v);

function formatar(v: number, m: Metrica): string {
  return v.toFixed(m.casas ?? 2).replace('.', ',');
}

function agregar(valores: number[], como: Agregacao): number | null {
  if (valores.length === 0) return null;

  switch (como) {
    case 'contagem':
      return valores.length;
    case 'soma':
      return valores.reduce((s, v) => s + v, 0);
    case 'maximo':
      return Math.max(...valores);
    case 'minimo':
      return Math.min(...valores);
    case 'mediana': {
      const ordenados = [...valores].sort((a, b) => a - b);
      const meio = Math.floor(ordenados.length / 2);
      return ordenados.length % 2 === 0
        ? (((ordenados[meio - 1] as number) + (ordenados[meio] as number)) / 2)
        : (ordenados[meio] as number);
    }
    case 'media':
    default:
      return media(valores);
  }
}
