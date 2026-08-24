/**
 * Classificações e referências normativas usadas na leitura dos ensaios.
 *
 * Aqui ficam só as regras que vêm de norma — as fórmulas de ensaio estão em
 * `calculos.ts`. Separado porque muda por outro motivo: norma se revisa, fórmula
 * de ensaio não.
 *
 * Referências:
 * - ABNT NBR 13281 — classes de argamassa (compressão, densidade, retenção).
 * - ABNT NBR 7211 — zonas granulométricas do agregado miúdo (ótima e utilizável).
 * - ABNT NBR NM 248 — módulo de finura.
 */

const isNum = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

/* ------------------------------------------------------------------ *
 * NBR 13281 — classes de argamassa
 * ------------------------------------------------------------------ */

export interface FaixaClasse {
  /** Código da classe, como na norma (P1, D3, U5…). */
  codigo: string;
  /** Limite inferior, em unidade do ensaio. `null` no primeiro degrau. */
  min: number | null;
  /** Limite superior. `null` no último degrau, que é aberto. */
  max: number | null;
}

/** Resistência à compressão, em MPa (NBR 13281). */
export const CLASSES_COMPRESSAO: FaixaClasse[] = [
  { codigo: 'P1', min: null, max: 2.0 },
  { codigo: 'P2', min: 1.5, max: 3.0 },
  { codigo: 'P3', min: 2.5, max: 4.5 },
  { codigo: 'P4', min: 4.0, max: 6.5 },
  { codigo: 'P5', min: 5.5, max: 9.0 },
  { codigo: 'P6', min: 8.0, max: null },
];

/** Densidade de massa no estado fresco, em kg/m³ (NBR 13281). */
export const CLASSES_DENSIDADE: FaixaClasse[] = [
  { codigo: 'D1', min: null, max: 1400 },
  { codigo: 'D2', min: 1200, max: 1600 },
  { codigo: 'D3', min: 1400, max: 1800 },
  { codigo: 'D4', min: 1600, max: 2000 },
  { codigo: 'D5', min: 1800, max: 2200 },
  { codigo: 'D6', min: 2000, max: null },
];

/** Retenção de água, em % (NBR 13281). */
export const CLASSES_RETENCAO: FaixaClasse[] = [
  { codigo: 'U1', min: null, max: 78 },
  { codigo: 'U2', min: 72, max: 85 },
  { codigo: 'U3', min: 80, max: 90 },
  { codigo: 'U4', min: 86, max: 94 },
  { codigo: 'U5', min: 91, max: 97 },
  { codigo: 'U6', min: 95, max: 100 },
];

/**
 * Classe de um valor, dentro de uma família de faixas.
 *
 * **As faixas da NBR 13281 se sobrepõem de propósito** (P2 vai de 1,5 a 3,0 e
 * P3 de 2,5 a 4,5), porque na norma quem declara a classe é o fabricante do
 * produto. Um painel precisa de uma regra determinística, então adotamos a
 * **classe mais alta que o valor alcança** — 2,8 MPa é P3, não P2. A convenção
 * está registrada em `docs/CALCULOS.md`.
 */
export function classificar(
  valor: number | null | undefined,
  faixas: FaixaClasse[],
): string | null {
  if (!isNum(valor)) return null;

  for (let i = faixas.length - 1; i >= 0; i -= 1) {
    const faixa = faixas[i] as FaixaClasse;
    if (faixa.min === null || valor >= faixa.min) return faixa.codigo;
  }

  return (faixas[0] as FaixaClasse).codigo;
}

/* ------------------------------------------------------------------ *
 * NBR 7211 — zonas granulométricas do agregado miúdo
 * ------------------------------------------------------------------ */

export interface LimiteZona {
  peneiraMm: number;
  utilizavelMin: number;
  otimaMin: number;
  otimaMax: number;
  utilizavelMax: number;
}

/**
 * Limites de % retida acumulada por peneira (NBR 7211).
 *
 * A peneira de 9,5 mm tem os quatro limites em zero e por isso não entra: ela
 * não separa uma curva da outra e só encolheria a escala do gráfico.
 */
export const ZONAS_NBR7211: LimiteZona[] = [
  { peneiraMm: 6.3, utilizavelMin: 0, otimaMin: 0, otimaMax: 0, utilizavelMax: 7 },
  { peneiraMm: 4.75, utilizavelMin: 0, otimaMin: 0, otimaMax: 5, utilizavelMax: 10 },
  { peneiraMm: 2.36, utilizavelMin: 0, otimaMin: 10, otimaMax: 20, utilizavelMax: 25 },
  { peneiraMm: 1.18, utilizavelMin: 5, otimaMin: 20, otimaMax: 30, utilizavelMax: 50 },
  { peneiraMm: 0.6, utilizavelMin: 15, otimaMin: 35, otimaMax: 55, utilizavelMax: 70 },
  { peneiraMm: 0.3, utilizavelMin: 50, otimaMin: 65, otimaMax: 85, utilizavelMax: 95 },
  { peneiraMm: 0.15, utilizavelMin: 85, otimaMin: 90, otimaMax: 95, utilizavelMax: 100 },
];

/**
 * Converte frequência retida por peneira em **retida acumulada** (%).
 *
 * Espera os pontos da maior peneira para a menor — que é a ordem em que a
 * granulometria sai do mapper. O acumulado é o que a NBR 7211 compara com as
 * zonas, e é a forma em que a curva granulométrica é publicada.
 */
export function retidaAcumulada(
  pontos: { peneiraMm: number; frequencia: number }[],
): { peneiraMm: number; frequencia: number; acumulada: number }[] {
  const ordenados = [...pontos].sort((a, b) => b.peneiraMm - a.peneiraMm);

  let soma = 0;
  return ordenados.map((p) => {
    soma += isNum(p.frequencia) ? p.frequencia : 0;
    // A soma pode passar de 100 por arredondamento das frequências.
    return { ...p, acumulada: Math.min(100, Number(soma.toFixed(2))) };
  });
}

/** Peneiras da série normal (mm) que entram no módulo de finura (NBR NM 248). */
const SERIE_NORMAL = [76, 38, 19, 9.5, 4.75, 2.36, 1.18, 0.6, 0.3, 0.15];

/**
 * Módulo de finura: soma das % retidas acumuladas nas peneiras da série normal,
 * dividida por 100 (NBR NM 248).
 *
 * Só considera as peneiras da série normal presentes no ensaio. Se a formulação
 * não tem nenhuma delas, devolve `null` em vez de um número sem significado.
 */
export function moduloFinura(
  pontos: { peneiraMm: number; frequencia: number }[],
): number | null {
  if (pontos.length === 0) return null;

  const acumuladas = retidaAcumulada(pontos);
  const daSerie = acumuladas.filter((p) =>
    SERIE_NORMAL.some((mm) => Math.abs(mm - p.peneiraMm) < 0.001),
  );

  if (daSerie.length === 0) return null;

  const soma = daSerie.reduce((total, p) => total + p.acumulada, 0);
  return soma / 100;
}

/* ------------------------------------------------------------------ *
 * Regressão — usada nas correlações entre ensaios
 * ------------------------------------------------------------------ */

export interface Regressao {
  /** Inclinação da reta. */
  a: number;
  /** Intercepto. */
  b: number;
  /** Coeficiente de determinação (0 a 1). */
  r2: number;
  /** Quantidade de pares usados. */
  n: number;
}

/**
 * Reta de mínimos quadrados sobre pares (x, y), com R².
 *
 * Serve às correlações entre ensaios (flexão × compressão, módulo × compressão),
 * que na literatura da área aparecem sempre com a linha de tendência e o R² ao
 * lado dos pontos. Devolve `null` com menos de três pares ou quando todos os x
 * são iguais — nos dois casos a reta não diria nada.
 */
export function regressaoLinear(
  pares: { x: number | null; y: number | null }[],
): Regressao | null {
  const validos = pares.filter(
    (p): p is { x: number; y: number } => isNum(p.x) && isNum(p.y),
  );

  const n = validos.length;
  if (n < 3) return null;

  const somaX = validos.reduce((s, p) => s + p.x, 0);
  const somaY = validos.reduce((s, p) => s + p.y, 0);
  const mediaX = somaX / n;
  const mediaY = somaY / n;

  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const p of validos) {
    const dx = p.x - mediaX;
    const dy = p.y - mediaY;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }

  if (sxx === 0) return null;

  const a = sxy / sxx;
  const b = mediaY - a * mediaX;
  // syy === 0 significa y constante: a reta acerta tudo, mas R² seria 0/0.
  const r2 = syy === 0 ? 1 : (sxy * sxy) / (sxx * syy);

  return { a, b, r2, n };
}
