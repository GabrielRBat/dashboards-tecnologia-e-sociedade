/** Formatação de números, datas e rótulos do domínio, em pt-BR. */

export const ROTULOS_TIPO_PROJETO: Record<string, string> = {
  NP: 'Novo Produto',
  MT: 'Melhoria Técnica',
  AT: 'Apoio Técnico',
  RC: 'Redução de Custo',
  PE: 'Projeto Externo',
};

export const ROTULOS_ORIGEM: Record<string, string> = {
  PRODUCAO: 'Produção',
  LABORATORIO: 'Laboratório',
};

export const ROTULOS_CATEGORIA: Record<string, string> = {
  CIMENTO: 'Cimento',
  CAL: 'Cal',
  FILER: 'Fíler',
  AREIA_FINA: 'Areia fina',
  AREIA_MEDIA: 'Areia média',
  ADITIVO_RETENTOR_AGUA: 'Retentor de água',
  ADITIVO_INCORPORADOR_AR: 'Incorporador de ar',
  FIBRA: 'Fibra',
  SUPERPLASTIFICANTE: 'Superplastificante',
};

/** Número com casas decimais fixas; `—` quando não há valor. */
export function num(valor: number | null | undefined, casas = 2): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) {
    return '—';
  }
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

/** Inteiro com separador de milhar. */
export function inteiro(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) {
    return '—';
  }
  return valor.toLocaleString('pt-BR');
}

export function data(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export const tipoProjeto = (codigo: string | null): string =>
  codigo ? (ROTULOS_TIPO_PROJETO[codigo] ?? codigo) : '—';

export const origem = (codigo: string | null): string =>
  codigo ? (ROTULOS_ORIGEM[codigo] ?? codigo) : '—';

export const categoria = (codigo: string): string =>
  ROTULOS_CATEGORIA[codigo] ?? codigo;

/** Rótulo curto de peneira; `0` é o fundo. */
export const peneira = (mm: number): string =>
  mm === 0 ? 'Fundo' : `${num(mm, 2)} mm`;
