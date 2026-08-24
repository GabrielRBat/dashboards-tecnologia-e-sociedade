/**
 * Mapa de colunas da "Planilha de Registro e cálculo" usada pelo laboratório.
 *
 * Índices são 1-based (como no Excel) e correspondem à aba
 * "planilha de alimentação": cabeçalhos nas linhas 8 a 10, dados a partir da 11.
 *
 * Alterou a planilha? Ajuste apenas este arquivo — o importador e o seed leem daqui.
 */

export const ABA_ALIMENTACAO = 'planilha de alimentação';
export const PRIMEIRA_LINHA_DADOS = 11;

export const COL = {
  numeracao: 1,
  nomenclatura: 2,
  tipoProjeto: 3,
  desenvolvedor: 4,
  alimentador: 5,
  avaliador: 6,
  data: 7,
  origem: 8,
  teorAgua: 46,
  massaAgua: 47,
  comentarios: 48,
  densAparenteMassa: 59,
  densAparenteVolume: 60,
  retencaoM0: 62,
  retencaoM1: 63,
  retencaoM2: 64,
  densFrescoMassa: 66,
  densFrescoVolume: 67,
  squeezeDeslocamento: [69, 70, 71],
  squeezeCarga: [73, 74, 75],
} as const;

/** Materiais nas colunas 10 a 45, na ordem em que aparecem na planilha. */
export const MATERIAIS_PLANILHA: {
  coluna: number;
  nome: string;
  categoria: string;
}[] = [
  { coluna: 10, nome: 'Cimento X', categoria: 'CIMENTO' },
  { coluna: 11, nome: 'Cimento Y', categoria: 'CIMENTO' },
  { coluna: 12, nome: 'Cimento Z', categoria: 'CIMENTO' },
  { coluna: 13, nome: 'Cimento W', categoria: 'CIMENTO' },
  { coluna: 14, nome: 'Cal 1', categoria: 'CAL' },
  { coluna: 15, nome: 'Cal 2', categoria: 'CAL' },
  { coluna: 16, nome: 'Fíler 1', categoria: 'FILER' },
  { coluna: 17, nome: 'Fíler 2', categoria: 'FILER' },
  { coluna: 18, nome: 'Areia fina X', categoria: 'AREIA_FINA' },
  { coluna: 19, nome: 'Areia fina Y', categoria: 'AREIA_FINA' },
  { coluna: 20, nome: 'Areia fina Z', categoria: 'AREIA_FINA' },
  { coluna: 21, nome: 'Areia fina W', categoria: 'AREIA_FINA' },
  { coluna: 22, nome: 'Areia média X', categoria: 'AREIA_MEDIA' },
  { coluna: 23, nome: 'Areia média Y', categoria: 'AREIA_MEDIA' },
  { coluna: 24, nome: 'Areia média Z', categoria: 'AREIA_MEDIA' },
  { coluna: 25, nome: 'Areia média W', categoria: 'AREIA_MEDIA' },
  { coluna: 26, nome: 'Retentor de água 1', categoria: 'ADITIVO_RETENTOR_AGUA' },
  { coluna: 27, nome: 'Retentor de água 2', categoria: 'ADITIVO_RETENTOR_AGUA' },
  { coluna: 28, nome: 'Retentor de água 3', categoria: 'ADITIVO_RETENTOR_AGUA' },
  { coluna: 29, nome: 'Retentor de água 4', categoria: 'ADITIVO_RETENTOR_AGUA' },
  { coluna: 30, nome: 'Retentor de água 5', categoria: 'ADITIVO_RETENTOR_AGUA' },
  { coluna: 31, nome: 'Incorporador de ar 1', categoria: 'ADITIVO_INCORPORADOR_AR' },
  { coluna: 32, nome: 'Incorporador de ar 2', categoria: 'ADITIVO_INCORPORADOR_AR' },
  { coluna: 33, nome: 'Incorporador de ar 3', categoria: 'ADITIVO_INCORPORADOR_AR' },
  { coluna: 34, nome: 'Incorporador de ar 4', categoria: 'ADITIVO_INCORPORADOR_AR' },
  { coluna: 35, nome: 'Incorporador de ar 5', categoria: 'ADITIVO_INCORPORADOR_AR' },
  { coluna: 36, nome: 'Fibra 1', categoria: 'FIBRA' },
  { coluna: 37, nome: 'Fibra 2', categoria: 'FIBRA' },
  { coluna: 38, nome: 'Fibra 3', categoria: 'FIBRA' },
  { coluna: 39, nome: 'Fibra 4', categoria: 'FIBRA' },
  { coluna: 40, nome: 'Fibra 5', categoria: 'FIBRA' },
  { coluna: 41, nome: 'Superplastificante 1', categoria: 'SUPERPLASTIFICANTE' },
  { coluna: 42, nome: 'Superplastificante 2', categoria: 'SUPERPLASTIFICANTE' },
  { coluna: 43, nome: 'Superplastificante 3', categoria: 'SUPERPLASTIFICANTE' },
  { coluna: 44, nome: 'Superplastificante 4', categoria: 'SUPERPLASTIFICANTE' },
  { coluna: 45, nome: 'Superplastificante 5', categoria: 'SUPERPLASTIFICANTE' },
];

/** Distribuição granulométrica: colunas 51 a 58 (`0` = fundo). */
export const GRANULOMETRIA_PLANILHA: { coluna: number; peneiraMm: number }[] = [
  { coluna: 51, peneiraMm: 1.7 },
  { coluna: 52, peneiraMm: 1.4 },
  { coluna: 53, peneiraMm: 1.18 },
  { coluna: 54, peneiraMm: 0.6 },
  { coluna: 55, peneiraMm: 0.3 },
  { coluna: 56, peneiraMm: 0.15 },
  { coluna: 57, peneiraMm: 0.09 },
  { coluna: 58, peneiraMm: 0 },
];

/** Resistência à tração na flexão: 3 CPs por idade. */
export const FLEXAO_PLANILHA: { idadeDias: number; colunas: number[] }[] = [
  { idadeDias: 3, colunas: [77, 78, 79] },
  { idadeDias: 7, colunas: [81, 82, 83] },
  { idadeDias: 14, colunas: [85, 86, 87] },
  { idadeDias: 28, colunas: [89, 90, 91] },
];

/** Resistência à compressão: 6 CPs por idade. */
export const COMPRESSAO_PLANILHA: { idadeDias: number; colunas: number[] }[] = [
  { idadeDias: 3, colunas: [93, 94, 95, 96, 97, 98] },
  { idadeDias: 7, colunas: [100, 101, 102, 103, 104, 105] },
  { idadeDias: 14, colunas: [107, 108, 109, 110, 111, 112] },
  { idadeDias: 28, colunas: [114, 115, 116, 117, 118, 119] },
];

export interface LayoutCorpoDeProva {
  indice: number;
  dimensoes: [number, number, number, number, number, number]; // L1 L2 H1 H2 C1 C2
  massa: number;
  velocidades: [number, number, number];
}

/** Corpos de prova do estado endurecido, por idade (14 e 28 dias). */
export const ENDURECIDO_PLANILHA: {
  idadeDias: number;
  corpos: LayoutCorpoDeProva[];
}[] = [
  {
    idadeDias: 14,
    corpos: [
      { indice: 1, dimensoes: [121, 122, 123, 124, 125, 126], massa: 142, velocidades: [149, 150, 151] },
      { indice: 2, dimensoes: [127, 128, 129, 130, 131, 132], massa: 143, velocidades: [152, 153, 154] },
      { indice: 3, dimensoes: [133, 134, 135, 136, 137, 138], massa: 144, velocidades: [155, 156, 157] },
    ],
  },
  {
    idadeDias: 28,
    corpos: [
      { indice: 1, dimensoes: [162, 163, 164, 165, 166, 167], massa: 183, velocidades: [190, 191, 192] },
      { indice: 2, dimensoes: [168, 169, 170, 171, 172, 173], massa: 184, velocidades: [193, 194, 195] },
      { indice: 3, dimensoes: [174, 175, 176, 177, 178, 179], massa: 185, velocidades: [196, 197, 198] },
    ],
  },
];

/** Códigos de tipo de projeto aceitos, conforme a aba "Listas". */
export const TIPOS_PROJETO_VALIDOS = ['NP', 'MT', 'AT', 'RC', 'PE'];

/** Normaliza o texto de origem da planilha ("Produção " / "Laboratório"). */
export function normalizarOrigem(valor: string): 'PRODUCAO' | 'LABORATORIO' | null {
  const t = valor
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (t.startsWith('produ')) return 'PRODUCAO';
  if (t.startsWith('lab')) return 'LABORATORIO';
  return null;
}

/** Extrai o código do tipo de projeto ("NP- Novo Produto" -> "NP"). */
export function normalizarTipoProjeto(valor: string): string | null {
  const codigo = valor.trim().split(/[-\s]/)[0]?.toUpperCase();
  return codigo && TIPOS_PROJETO_VALIDOS.includes(codigo) ? codigo : null;
}
