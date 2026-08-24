/**
 * Tipos compartilhados entre a API (NestJS) e o frontend (Next.js).
 *
 * A estrutura reflete a "Planilha de Registro e cálculo" usada pelo laboratório:
 * cada formulação passa por caracterização no estado anidro, fresco e endurecido.
 */

export const TIPOS_PROJETO = ['NP', 'MT', 'AT', 'RC', 'PE'] as const;
export type TipoProjeto = (typeof TIPOS_PROJETO)[number];

export const ROTULOS_TIPO_PROJETO: Record<TipoProjeto, string> = {
  NP: 'Novo Produto',
  MT: 'Melhoria Técnica',
  AT: 'Apoio Técnico',
  RC: 'Redução de Custo',
  PE: 'Projeto Externo',
};

export const ORIGENS = ['PRODUCAO', 'LABORATORIO'] as const;
export type Origem = (typeof ORIGENS)[number];

export const ROTULOS_ORIGEM: Record<Origem, string> = {
  PRODUCAO: 'Produção',
  LABORATORIO: 'Laboratório',
};

export const CATEGORIAS_MATERIAL = [
  'CIMENTO',
  'CAL',
  'FILER',
  'AREIA_FINA',
  'AREIA_MEDIA',
  'ADITIVO_RETENTOR_AGUA',
  'ADITIVO_INCORPORADOR_AR',
  'FIBRA',
  'SUPERPLASTIFICANTE',
] as const;
export type CategoriaMaterial = (typeof CATEGORIAS_MATERIAL)[number];

export const ROTULOS_CATEGORIA: Record<CategoriaMaterial, string> = {
  CIMENTO: 'Cimento',
  CAL: 'Cal',
  FILER: 'Fíler',
  AREIA_FINA: 'Areia fina',
  AREIA_MEDIA: 'Areia média',
  ADITIVO_RETENTOR_AGUA: 'Aditivo retentor de água',
  ADITIVO_INCORPORADOR_AR: 'Aditivo incorporador de ar',
  FIBRA: 'Fibra',
  SUPERPLASTIFICANTE: 'Superplastificante',
};

/** Categorias consideradas ligantes no cálculo da relação água/ligante. */
export const CATEGORIAS_LIGANTE: CategoriaMaterial[] = ['CIMENTO', 'CAL'];

/** Categorias consideradas finos no cálculo do teor de finos. */
export const CATEGORIAS_FINOS: CategoriaMaterial[] = ['CIMENTO', 'CAL', 'FILER'];

export const TIPOS_RESISTENCIA = ['FLEXAO', 'COMPRESSAO'] as const;
export type TipoResistencia = (typeof TIPOS_RESISTENCIA)[number];

/** Idades de ensaio previstas na planilha. */
export const IDADES_RESISTENCIA = [3, 7, 14, 28] as const;
export const IDADES_ENDURECIDO = [14, 28] as const;

/** Peneiras da distribuição granulométrica (mm). `0` representa o fundo. */
export const PENEIRAS_MM = [1.7, 1.4, 1.18, 0.6, 0.3, 0.15, 0.09, 0] as const;

export interface Material {
  id: string;
  nome: string;
  categoria: CategoriaMaterial;
  ativo: boolean;
}

export interface ComponenteFormulacao {
  materialId: string;
  material?: Material;
  /** Teor do material na formulação, em % da massa seca. */
  teor: number;
}

export interface PontoGranulometrico {
  /** Diâmetro da peneira em mm; `0` representa o fundo. */
  peneiraMm: number;
  /** Frequência de partículas retidas, em %. */
  frequencia: number;
}

export interface EnsaioResistencia {
  tipo: TipoResistencia;
  idadeDias: number;
  /** Valores por corpo de prova, em MPa (3 CPs na flexão, 6 na compressão). */
  valores: number[];
  /** Média calculada dos CPs, em MPa. */
  media: number | null;
  /** Desvio padrão amostral dos CPs, em MPa. */
  desvioPadrao: number | null;
}

export interface CorpoDeProvaEndurecido {
  idadeDias: number;
  indice: number;
  /** Medidas em cm (duas leituras por dimensão). */
  l1: number | null;
  l2: number | null;
  h1: number | null;
  h2: number | null;
  c1: number | null;
  c2: number | null;
  /** Massa do corpo de prova em g. */
  massa: number | null;
  /** Leituras de velocidade de ultrassom em km/s. */
  v1: number | null;
  v2: number | null;
  v3: number | null;
  /** Volume calculado em cm³. */
  volume: number | null;
  /** Massa específica calculada em kg/m³. */
  massaEspecifica: number | null;
  /** Módulo de elasticidade dinâmico calculado em MPa. */
  modulo: number | null;
}

export interface ResultadosEndurecidos {
  idadeDias: number;
  corpos: CorpoDeProvaEndurecido[];
  /** Densidade média no estado endurecido, em kg/m³. */
  densidadeMedia: number | null;
  /** Módulo de elasticidade dinâmico médio, em MPa. */
  moduloMedio: number | null;
}

export interface Formulacao {
  id: string;
  numeracao: number;
  nomenclatura: string;
  tipoProjeto: TipoProjeto | null;
  desenvolvedor: string | null;
  alimentador: string | null;
  avaliador: string | null;
  data: string | null;
  origem: Origem | null;
  comentarios: string | null;

  /** Teor de água em % da massa seca. */
  teorAgua: number | null;
  /** Massa de água em g. */
  massaAgua: number | null;

  componentes: ComponenteFormulacao[];
  granulometria: PontoGranulometrico[];

  /** Densidade aparente (estado anidro). */
  densAparenteMassa: number | null;
  densAparenteVolume: number | null;

  /** Retenção de água (NBR 13277). */
  retencaoM0: number | null;
  retencaoM1: number | null;
  retencaoM2: number | null;

  /** Densidade no estado fresco. */
  densFrescoMassa: number | null;
  densFrescoVolume: number | null;

  /** Squeeze-flow: deslocamento máximo (mm) e carga máxima (N) por curva. */
  squeezeDeslocamento1: number | null;
  squeezeDeslocamento2: number | null;
  squeezeDeslocamento3: number | null;
  squeezeCarga1: number | null;
  squeezeCarga2: number | null;
  squeezeCarga3: number | null;

  resistencias: EnsaioResistencia[];
  endurecidos: ResultadosEndurecidos[];

  /** Campos derivados calculados pela API. */
  calculados: FormulacaoCalculada;
}

export interface FormulacaoCalculada {
  relacaoAguaLigante: number | null;
  teorFinos: number | null;
  densidadeAparente: number | null;
  retencaoAgua: number | null;
  densidadeFresco: number | null;
  squeezeDeslocamentoMedio: number | null;
  squeezeCargaMedia: number | null;
  compressao28d: number | null;
  flexao28d: number | null;
  /** Percentual de preenchimento dos ensaios previstos (0–100). */
  completude: number;
}

export interface FiltrosFormulacao {
  busca?: string;
  tipoProjeto?: TipoProjeto[];
  origem?: Origem[];
  desenvolvedor?: string[];
  dataInicio?: string;
  dataFim?: string;
  pagina?: number;
  porPagina?: number;
}

export interface Paginado<T> {
  itens: T[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface IndicadoresResumo {
  totalFormulacoes: number;
  totalComEnsaios: number;
  compressao28dMedia: number | null;
  flexao28dMedia: number | null;
  completudeMedia: number;
  porTipoProjeto: { tipoProjeto: TipoProjeto; total: number }[];
  porOrigem: { origem: Origem; total: number }[];
}

export interface SerieEvolucao {
  formulacaoId: string;
  nomenclatura: string;
  pontos: { idadeDias: number; compressao: number | null; flexao: number | null }[];
}

export interface PontoDispersao {
  formulacaoId: string;
  nomenclatura: string;
  relacaoAguaLigante: number | null;
  compressao28d: number | null;
  densidadeFresco: number | null;
  retencaoAgua: number | null;
}

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
