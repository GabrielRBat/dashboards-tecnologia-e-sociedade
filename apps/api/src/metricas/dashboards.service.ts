import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { arredondar, media, desvioPadrao } from '../calculos/calculos';
import { regressaoLinear } from '../calculos/normas';
import { DB, Database } from '../db/db.module';
import { dashboards } from '../db/schema';
import { ListarFormulacoesDto } from '../formulacoes/dto/listar-formulacoes.dto';
import { FormulacaoDetalhada } from '../formulacoes/formulacao.mapper';
import { FormulacoesService } from '../formulacoes/formulacoes.service';
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

@Injectable()
export class DashboardsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly formulacoes: FormulacoesService,
  ) {}

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

  async listar() {
    const linhas = await this.db.select().from(dashboards);
    return [...linhas].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  async obter(id: string) {
    const [linha] = await this.db
      .select()
      .from(dashboards)
      .where(eq(dashboards.id, id));

    if (!linha) throw new NotFoundException(`Dashboard ${id} não encontrado`);
    return linha;
  }

  async criar(dados: { nome: string; descricao?: string; paineis?: PainelConfig[] }) {
    const paineis = this.validarPaineis(dados.paineis ?? []);

    const [criado] = await this.db
      .insert(dashboards)
      .values({
        nome: dados.nome.trim(),
        descricao: dados.descricao?.trim() || null,
        paineis,
      })
      .returning();

    return criado;
  }

  async atualizar(
    id: string,
    dados: { nome?: string; descricao?: string; paineis?: PainelConfig[] },
  ) {
    await this.obter(id); // 404 se não existe

    const campos: Record<string, unknown> = { atualizadoEm: new Date() };
    if (dados.nome !== undefined) campos.nome = dados.nome.trim();
    if (dados.descricao !== undefined) {
      campos.descricao = dados.descricao.trim() || null;
    }
    if (dados.paineis !== undefined) {
      campos.paineis = this.validarPaineis(dados.paineis);
    }

    const [atualizado] = await this.db
      .update(dashboards)
      .set(campos)
      .where(eq(dashboards.id, id))
      .returning();

    return atualizado;
  }

  async remover(id: string) {
    await this.obter(id);
    await this.db.delete(dashboards).where(eq(dashboards.id, id));
    return { removido: true };
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
  async dados(id: string, filtros: ListarFormulacoesDto) {
    const dashboard = await this.obter(id);
    const paineis = (dashboard.paineis ?? []) as PainelConfig[];
    const itens = await this.formulacoes.listarTodas(filtros);

    return {
      dashboard: {
        id: dashboard.id,
        nome: dashboard.nome,
        descricao: dashboard.descricao,
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
