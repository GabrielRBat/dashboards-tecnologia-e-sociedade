/** Acesso à API de argamassas a partir dos componentes de servidor. */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

export type ParametrosBusca = Record<string, string | string[] | undefined>;

/** Converte os searchParams da página em query string da API. */
export function montarQuery(params: ParametrosBusca): string {
  const query = new URLSearchParams();
  const permitidos = [
    'busca',
    'tipoProjeto',
    'origem',
    'desenvolvedor',
    'dataInicio',
    'dataFim',
    'pagina',
    'porPagina',
  ];

  for (const chave of permitidos) {
    const valor = params[chave];
    if (valor === undefined || valor === '') continue;
    if (Array.isArray(valor)) {
      for (const v of valor) if (v) query.append(chave, v);
    } else {
      query.set(chave, valor);
    }
  }

  const s = query.toString();
  return s ? `?${s}` : '';
}

export class ApiIndisponivel extends Error {}

/** Sessão ausente, expirada ou revogada — quem chama redireciona ao login. */
export class SessaoExpirada extends Error {}

/** Autenticado, mas sem permissão para a ação. */
export class SemPermissao extends Error {}

/**
 * Busca no servidor, levando o token da sessão.
 *
 * O token vive num cookie `httpOnly` que só o servidor lê, então esta função só
 * roda em componente ou rota de servidor — que é onde todas as telas buscam
 * dados neste projeto.
 */
async function buscar<T>(caminho: string): Promise<T> {
  // Import dinâmico: `next/headers` só existe no servidor, e uma importação no
  // topo quebraria qualquer componente cliente que importe deste arquivo.
  const { obterToken } = await import('./sessao');
  const token = obterToken();

  let resposta: Response;
  try {
    resposta = await fetch(`${BASE}/api${caminho}`, {
      cache: 'no-store',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  } catch {
    throw new ApiIndisponivel(
      `Não foi possível falar com a API em ${BASE}. Ela está rodando?`,
    );
  }

  if (resposta.status === 401) {
    /*
     * Sessão vencida ou revogada. Redirecionar aqui, e não lançar, é o que evita
     * a tela branca de erro 500 que a pessoa veria ao voltar no dia seguinte.
     * O caminho passa por uma rota que apaga o cookie — deixá-lo faria o
     * middleware mandar de volta para a página, num laço sem fim.
     */
    const { redirect } = await import('next/navigation');
    const { headers } = await import('next/headers');
    const atual = headers().get('x-pathname') ?? '/';
    redirect(`/api/sessao/expirar?destino=${encodeURIComponent(atual)}`);
  }

  if (resposta.status === 403) {
    throw new SemPermissao('Você não tem permissão para ver isto.');
  }

  if (!resposta.ok) {
    const corpo = await resposta.text().catch(() => '');
    throw new Error(`API respondeu ${resposta.status}: ${corpo.slice(0, 200)}`);
  }

  return resposta.json() as Promise<T>;
}

// --- Tipos usados pelas telas ---

export interface Resumo {
  totalFormulacoes: number;
  totalComEnsaios: number;
  compressao28dMedia: number | null;
  flexao28dMedia: number | null;
  retencaoAguaMedia: number | null;
  densidadeFrescoMedia: number | null;
  completudeMedia: number;
  porTipoProjeto: { tipoProjeto: string; total: number }[];
  porOrigem: { origem: string; total: number }[];
}

export interface PontoEvolucao {
  idadeDias: number;
  compressao: number | null;
  flexao: number | null;
  amostras: number;
}

export interface ItemComparativo {
  formulacaoId: string;
  nomenclatura: string;
  numeracao: number;
  compressao28d: number | null;
  flexao28d: number | null;
  tipoProjeto: string | null;
}

export interface PontoDispersao {
  formulacaoId: string;
  nomenclatura: string;
  relacaoAguaLigante: number | null;
  compressao28d: number | null;
  densidadeFresco: number | null;
  retencaoAgua: number | null;
  tipoProjeto: string | null;
}

export interface CurvaGranulometrica {
  formulacaoId: string;
  nomenclatura: string;
  /** Módulo de finura (NBR NM 248), sobre as peneiras da série normal. */
  moduloFinura: number | null;
  pontos: {
    peneiraMm: number;
    rotulo: string;
    frequencia: number;
    /** % retida acumulada — é o que a NBR 7211 compara com as zonas. */
    acumulada: number;
  }[];
}

/** Limites de % retida acumulada por peneira, da NBR 7211. */
export interface LimiteZona {
  peneiraMm: number;
  utilizavelMin: number;
  otimaMin: number;
  otimaMax: number;
  utilizavelMax: number;
}

export interface Granulometria {
  curvas: CurvaGranulometrica[];
  zonas: LimiteZona[];
}

/** Uma família de classes da NBR 13281 (P, D ou U). */
export interface FamiliaClasses {
  classes: {
    codigo: string;
    min: number | null;
    max: number | null;
    total: number;
  }[];
  semDado: number;
}

export interface Classificacao {
  compressao: FamiliaClasses;
  densidade: FamiliaClasses;
  retencao: FamiliaClasses;
}

export interface PontoCorrelacao {
  formulacaoId: string;
  nomenclatura: string;
  tipoProjeto: string | null;
  x: number;
  y: number;
}

export interface Correlacao {
  pontos: PontoCorrelacao[];
  regressao: { a: number; b: number; r2: number; n: number } | null;
}

export interface Correlacoes {
  flexaoCompressao: Correlacao;
  moduloCompressao: Correlacao;
}

export interface PontoSqueeze {
  formulacaoId: string;
  nomenclatura: string;
  tipoProjeto: string | null;
  deslocamento: number | null;
  carga: number | null;
  retencaoAgua: number | null;
  repeticoes: { deslocamento: number | null; carga: number | null }[];
}

export interface DispersaoIdade {
  idadeDias: number;
  compressao: number | null;
  compressaoDesvio: number | null;
  flexao: number | null;
  flexaoDesvio: number | null;
  corposCompressao: number;
  corposFlexao: number;
}

export interface Resistencia {
  tipo: string;
  idadeDias: number;
  valores: number[];
  media: number | null;
  desvioPadrao: number | null;
}

export interface CorpoEndurecido {
  idadeDias: number;
  indice: number;
  l1: number | null;
  l2: number | null;
  h1: number | null;
  h2: number | null;
  c1: number | null;
  c2: number | null;
  massa: number | null;
  v1: number | null;
  v2: number | null;
  v3: number | null;
  volume: number | null;
  massaEspecifica: number | null;
  modulo: number | null;
}

export interface BlocoEndurecido {
  idadeDias: number;
  corpos: CorpoEndurecido[];
  densidadeMedia: number | null;
  moduloMedio: number | null;
}

export interface Formulacao {
  id: string;
  numeracao: number;
  nomenclatura: string;
  tipoProjeto: string | null;
  desenvolvedor: string | null;
  alimentador: string | null;
  avaliador: string | null;
  data: string | null;
  origem: string | null;
  comentarios: string | null;
  teorAgua: number | null;
  massaAgua: number | null;
  componentes: {
    materialId: string;
    teor: number;
    material: { id: string; nome: string; categoria: string };
  }[];
  granulometria: { peneiraMm: number; frequencia: number; acumulada: number }[];
  densAparenteMassa: number | null;
  densAparenteVolume: number | null;
  retencaoM0: number | null;
  retencaoM1: number | null;
  retencaoM2: number | null;
  densFrescoMassa: number | null;
  densFrescoVolume: number | null;
  squeezeDeslocamento1: number | null;
  squeezeDeslocamento2: number | null;
  squeezeDeslocamento3: number | null;
  squeezeCarga1: number | null;
  squeezeCarga2: number | null;
  squeezeCarga3: number | null;
  resistencias: Resistencia[];
  endurecidos: BlocoEndurecido[];
  calculados: {
    relacaoAguaLigante: number | null;
    teorFinos: number | null;
    densidadeAparente: number | null;
    retencaoAgua: number | null;
    densidadeFresco: number | null;
    squeezeDeslocamentoMedio: number | null;
    squeezeCargaMedia: number | null;
    moduloFinura: number | null;
    compressao28d: number | null;
    flexao28d: number | null;
    completude: number;
  };
}

export interface Paginado<T> {
  itens: T[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface OpcoesFiltro {
  desenvolvedores: string[];
  avaliadores: string[];
  dataMin: string | null;
  dataMax: string | null;
}

/** Tudo o que a visão geral precisa, numa requisição só. */
export interface Painel {
  resumo: Resumo;
  evolucao: PontoEvolucao[];
  comparativo: ItemComparativo[];
  dispersao: PontoDispersao[];
  granulometria: Granulometria;
  classificacao: Classificacao;
  correlacoes: Correlacoes;
  squeezeFlow: PontoSqueeze[];
  dispersaoIdade: DispersaoIdade[];
}

// --- Dashboards customizados ---

export type TipoPainel = 'dispersao' | 'barras' | 'distribuicao';
export type Agregacao =
  | 'media'
  | 'mediana'
  | 'soma'
  | 'contagem'
  | 'maximo'
  | 'minimo';

export interface MetricaCatalogo {
  chave: string;
  rotulo: string;
  unidade: string;
  natureza: 'continua' | 'categorica';
  nivel: string;
  grupo: string;
  casas: number;
}

export interface CatalogoMetricas {
  metricas: MetricaCatalogo[];
  tipos: {
    chave: TipoPainel;
    rotulo: string;
    descricao: string;
    precisaY: boolean;
  }[];
  agregacoes: { chave: Agregacao; rotulo: string }[];
}

export interface PainelConfig {
  id: string;
  titulo: string;
  tipo: TipoPainel;
  metricaX: string;
  metricaY?: string | null;
  agregacao?: Agregacao | null;
  faixas?: number | null;
}

export type Visibilidade = 'TODOS' | 'GRUPOS' | 'PRIVADO';

export interface Dashboard {
  id: string;
  nome: string;
  descricao: string | null;
  paineis: PainelConfig[];
  criadoPor: string | null;
  visibilidade: Visibilidade;
  /** Ids dos grupos que enxergam, quando a visibilidade é GRUPOS. */
  grupos: string[];
  /** Se quem está pedindo pode alterar este dashboard. */
  podeEditar: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

/** Uma equipe interna. */
export interface Grupo {
  id: string;
  nome: string;
  descricao: string | null;
  criadoEm: string;
  membros: { id: string; nome: string; email: string }[];
}

export interface EixoPainel {
  chave: string;
  rotulo: string;
  unidade: string;
  natureza: 'continua' | 'categorica';
  casas: number;
}

/** Painel já calculado, pronto para desenhar. */
export interface PainelCalculado {
  id: string;
  titulo: string;
  tipo: TipoPainel;
  eixoX: EixoPainel;
  eixoY: EixoPainel | null;
  agregacao: Agregacao | null;
  alerta: string | null;
  semDado: number;
  pontos?: {
    formulacaoId: string;
    nomenclatura: string;
    tipoProjeto: string | null;
    x: number;
    y: number;
  }[];
  regressao?: { a: number; b: number; r2: number; n: number } | null;
  barras?: {
    categoria: string;
    valor: number | null;
    formulacoes: number;
    desvio: number | null;
  }[];
  porFaixa?: boolean;
}

export interface DadosDashboard {
  dashboard: {
    id: string;
    nome: string;
    descricao: string | null;
    visibilidade: Visibilidade;
    grupos: string[];
    podeEditar: boolean;
  };
  totalFormulacoes: number;
  paineis: PainelCalculado[];
}

export interface Validacao {
  valido: boolean;
  motivo?: string;
  alerta?: string;
}

/** Conta de acesso ao sistema. Nunca inclui hash de senha. */
export interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: 'ADMIN' | 'MEMBRO';
  ativo: boolean;
  precisaTrocarSenha: boolean;
  ultimoAcessoEm: string | null;
  criadoEm: string;
}

// --- Chamadas ---

export const listarUsuarios = () => buscar<Usuario[]>('/usuarios');
export const listarGrupos = () => buscar<Grupo[]>('/grupos');

export const obterCatalogoMetricas = () =>
  buscar<CatalogoMetricas>('/dashboards/catalogo');
export const listarDashboards = () => buscar<Dashboard[]>('/dashboards');
export const obterDashboard = (id: string) =>
  buscar<Dashboard>(`/dashboards/${id}`);
export const obterDadosDashboard = (id: string, q: string) =>
  buscar<DadosDashboard>(`/dashboards/${id}/dados${q}`);

export const obterPainel = (q: string) =>
  buscar<Painel>(`/indicadores/painel${q}`);

export const obterResumo = (q: string) => buscar<Resumo>(`/indicadores/resumo${q}`);
export const obterEvolucaoMedia = (q: string) =>
  buscar<PontoEvolucao[]>(`/indicadores/evolucao-media${q}`);
export const obterComparativo = (q: string) =>
  buscar<ItemComparativo[]>(`/indicadores/comparativo${q}`);
export const obterDispersao = (q: string) =>
  buscar<PontoDispersao[]>(`/indicadores/dispersao${q}`);
export const obterGranulometria = (q: string) =>
  buscar<Granulometria>(`/indicadores/granulometria${q}`);
export const obterZonasGranulometricas = () =>
  buscar<LimiteZona[]>('/indicadores/zonas-granulometricas');
export const obterClassificacao = (q: string) =>
  buscar<Classificacao>(`/indicadores/classificacao${q}`);
export const obterCorrelacoes = (q: string) =>
  buscar<Correlacoes>(`/indicadores/correlacoes${q}`);
export const obterSqueezeFlow = (q: string) =>
  buscar<PontoSqueeze[]>(`/indicadores/squeeze-flow${q}`);
export const obterDispersaoIdade = (q: string) =>
  buscar<DispersaoIdade[]>(`/indicadores/dispersao-idade${q}`);
export const listarFormulacoes = (q: string) =>
  buscar<Paginado<Formulacao>>(`/formulacoes${q}`);
export const obterFormulacao = (id: string) =>
  buscar<Formulacao>(`/formulacoes/${id}`);
export const obterOpcoes = () => buscar<OpcoesFiltro>('/formulacoes/opcoes');
