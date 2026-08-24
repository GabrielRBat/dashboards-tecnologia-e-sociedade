/**
 * Cálculos do domínio de ensaios de argamassa.
 *
 * Todas as funções são puras e recebem/retornam números simples, para poderem
 * ser testadas isoladamente e reutilizadas tanto na leitura do banco quanto na
 * importação de planilhas.
 *
 * As fórmulas foram extraídas da "Planilha de Registro e cálculo" do
 * laboratório. Onde a planilha continha um erro, a implementação usa a fórmula
 * correta e o desvio está documentado em `docs/CALCULOS.md`.
 */

/** Massa de argamassa seca (g) usada no ensaio de retenção de água da planilha. */
export const MASSA_SECA_PADRAO_G = 2500;

/** Coeficiente de Poisson adotado para o módulo de elasticidade dinâmico. */
export const POISSON_PADRAO = 0.2;

const isNum = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

/** Média aritmética, ignorando valores nulos/inválidos. Retorna null se não houver dados. */
export function media(valores: (number | null | undefined)[]): number | null {
  const validos = valores.filter(isNum);
  if (validos.length === 0) return null;
  return validos.reduce((a, b) => a + b, 0) / validos.length;
}

/** Desvio padrão amostral (n-1). Retorna null com menos de 2 valores. */
export function desvioPadrao(
  valores: (number | null | undefined)[],
): number | null {
  const validos = valores.filter(isNum);
  if (validos.length < 2) return null;
  const m = validos.reduce((a, b) => a + b, 0) / validos.length;
  const soma = validos.reduce((acc, v) => acc + (v - m) ** 2, 0);
  return Math.sqrt(soma / (validos.length - 1));
}

/** Coeficiente de variação (%) — usado para sinalizar dispersão alta entre CPs. */
export function coeficienteVariacao(
  valores: (number | null | undefined)[],
): number | null {
  const m = media(valores);
  const dp = desvioPadrao(valores);
  if (m === null || dp === null || m === 0) return null;
  return (dp / m) * 100;
}

/**
 * Densidade em kg/m³ a partir de massa (g) e volume (cm³).
 * Planilha: `=(massa/volume)*1000`
 */
export function densidade(
  massaG: number | null | undefined,
  volumeCm3: number | null | undefined,
): number | null {
  if (!isNum(massaG) || !isNum(volumeCm3) || volumeCm3 === 0) return null;
  return (massaG / volumeCm3) * 1000;
}

/**
 * Retenção de água (%) conforme a planilha:
 * `RA = (1 - (M1 - M2) / (AF * (M1 - M0))) * 100`, com `AF = massaAgua / (massaAgua + massaSeca)`.
 *
 * M0 = massa do conjunto vazio, M1 = com argamassa, M2 = após sucção.
 */
export function retencaoAgua(
  m0: number | null | undefined,
  m1: number | null | undefined,
  m2: number | null | undefined,
  massaAguaG: number | null | undefined,
  massaSecaG: number = MASSA_SECA_PADRAO_G,
): number | null {
  if (!isNum(m0) || !isNum(m1) || !isNum(m2) || !isNum(massaAguaG)) return null;
  const massaArgamassa = m1 - m0;
  if (massaArgamassa === 0) return null;
  const af = massaAguaG / (massaAguaG + massaSecaG);
  if (af === 0) return null;
  return (1 - (m1 - m2) / (af * massaArgamassa)) * 100;
}

/**
 * Relação água/ligante.
 *
 * A planilha calcula `soma(ligantes) / teorAgua`, que é o inverso do rótulo
 * "água/ligante". Aqui usamos a definição correta: `teorAgua / soma(ligantes)`,
 * ambos em % da massa seca. Ver `docs/CALCULOS.md`.
 */
export function relacaoAguaLigante(
  teorAgua: number | null | undefined,
  teorLigantes: number | null | undefined,
): number | null {
  if (!isNum(teorAgua) || !isNum(teorLigantes) || teorLigantes === 0) return null;
  return teorAgua / teorLigantes;
}

/** Teor de finos (%) = soma dos teores de cimentos, cales e fíleres. */
export function teorFinos(teores: (number | null | undefined)[]): number | null {
  const validos = teores.filter(isNum);
  if (validos.length === 0) return null;
  return validos.reduce((a, b) => a + b, 0);
}

/**
 * Volume de um corpo de prova prismático (cm³), a partir de duas leituras por dimensão.
 * Planilha: `=média(L1,L2) * média(H1,H2) * média(C1,C2)`
 */
export function volumeCorpoDeProva(
  l1: number | null | undefined,
  l2: number | null | undefined,
  h1: number | null | undefined,
  h2: number | null | undefined,
  c1: number | null | undefined,
  c2: number | null | undefined,
): number | null {
  const l = media([l1, l2]);
  const h = media([h1, h2]);
  const c = media([c1, c2]);
  if (l === null || h === null || c === null) return null;
  return l * h * c;
}

/**
 * Módulo de elasticidade dinâmico (MPa) por ultrassom.
 *
 * `Ed = ρ · V² · [(1 + ν)(1 - 2ν) / (1 - ν)]`
 * com ρ em kg/m³ e V em m/s (as leituras chegam em km/s), resultado convertido para MPa.
 *
 * A planilha usa `ρ · V · [(1 + ν)(1 - ν) / (1 - ν)]` — sem elevar a velocidade ao
 * quadrado e com um fator que se simplifica para `(1 + ν)`. Ver `docs/CALCULOS.md`.
 */
export function moduloElasticidadeDinamico(
  massaEspecificaKgM3: number | null | undefined,
  velocidadesKmS: (number | null | undefined)[],
  poisson: number = POISSON_PADRAO,
): number | null {
  const vMedia = media(velocidadesKmS);
  if (!isNum(massaEspecificaKgM3) || vMedia === null) return null;
  const vMs = vMedia * 1000;
  const fator = ((1 + poisson) * (1 - 2 * poisson)) / (1 - poisson);
  const pascal = massaEspecificaKgM3 * vMs ** 2 * fator;
  return pascal / 1e6;
}

/**
 * Fórmula do módulo exatamente como está na planilha, mantida para conferência
 * e para comparar resultados históricos. Não use em cálculos novos.
 */
export function moduloElasticidadeLegadoPlanilha(
  massaEspecificaKgM3: number | null | undefined,
  velocidadesKmS: (number | null | undefined)[],
  poisson: number = POISSON_PADRAO,
): number | null {
  const vMedia = media(velocidadesKmS);
  if (!isNum(massaEspecificaKgM3) || vMedia === null) return null;
  const fator = ((1 + poisson) * (1 - poisson)) / (1 - poisson);
  return massaEspecificaKgM3 * vMedia * fator;
}

export interface CorpoDeProvaEntrada {
  indice: number;
  l1?: number | null;
  l2?: number | null;
  h1?: number | null;
  h2?: number | null;
  c1?: number | null;
  c2?: number | null;
  massa?: number | null;
  v1?: number | null;
  v2?: number | null;
  v3?: number | null;
}

export interface CorpoDeProvaCalculado extends CorpoDeProvaEntrada {
  volume: number | null;
  massaEspecifica: number | null;
  modulo: number | null;
}

/** Aplica volume, massa específica e módulo a um corpo de prova. */
export function calcularCorpoDeProva(
  cp: CorpoDeProvaEntrada,
  poisson: number = POISSON_PADRAO,
): CorpoDeProvaCalculado {
  const volume = volumeCorpoDeProva(cp.l1, cp.l2, cp.h1, cp.h2, cp.c1, cp.c2);
  const massaEspecifica = densidade(cp.massa, volume);
  const modulo = moduloElasticidadeDinamico(
    massaEspecifica,
    [cp.v1, cp.v2, cp.v3],
    poisson,
  );
  return { ...cp, volume, massaEspecifica, modulo };
}

/**
 * Densidade média no estado endurecido (kg/m³): massa total / volume total.
 *
 * A planilha usa esta forma aos 14 dias e a média das densidades individuais aos
 * 28 dias. Padronizamos na primeira — ver `docs/CALCULOS.md`.
 */
export function densidadeMediaEndurecida(
  corpos: CorpoDeProvaCalculado[],
): number | null {
  const massaTotal = media(corpos.map((c) => c.massa));
  const volumeTotal = media(corpos.map((c) => c.volume));
  return densidade(massaTotal, volumeTotal);
}

/** Arredonda para N casas decimais, preservando null. */
export function arredondar(
  valor: number | null | undefined,
  casas = 2,
): number | null {
  if (!isNum(valor)) return null;
  const f = 10 ** casas;
  return Math.round(valor * f) / f;
}
