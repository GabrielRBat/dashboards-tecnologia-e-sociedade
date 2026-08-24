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

async function buscar<T>(caminho: string): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE}/api${caminho}`, { cache: 'no-store' });
  } catch {
    throw new ApiIndisponivel(
      `Não foi possível falar com a API em ${BASE}. Ela está rodando?`,
    );
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
  pontos: { peneiraMm: number; rotulo: string; frequencia: number }[];
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
  granulometria: { peneiraMm: number; frequencia: number }[];
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

// --- Chamadas ---

export const obterResumo = (q: string) => buscar<Resumo>(`/indicadores/resumo${q}`);
export const obterEvolucaoMedia = (q: string) =>
  buscar<PontoEvolucao[]>(`/indicadores/evolucao-media${q}`);
export const obterComparativo = (q: string) =>
  buscar<ItemComparativo[]>(`/indicadores/comparativo${q}`);
export const obterDispersao = (q: string) =>
  buscar<PontoDispersao[]>(`/indicadores/dispersao${q}`);
export const obterGranulometria = (q: string) =>
  buscar<CurvaGranulometrica[]>(`/indicadores/granulometria${q}`);
export const listarFormulacoes = (q: string) =>
  buscar<Paginado<Formulacao>>(`/formulacoes${q}`);
export const obterFormulacao = (id: string) =>
  buscar<Formulacao>(`/formulacoes/${id}`);
export const obterOpcoes = () => buscar<OpcoesFiltro>('/formulacoes/opcoes');
