import {
  arredondar,
  calcularCorpoDeProva,
  densidade,
  densidadeMediaEndurecida,
  desvioPadrao,
  media,
  relacaoAguaLigante,
  retencaoAgua,
  teorFinos,
} from '../calculos/calculos';
import { moduloFinura, retidaAcumulada } from '../calculos/normas';

/** Categorias que contam como ligante na relação água/ligante. */
const CATEGORIAS_LIGANTE = ['CIMENTO', 'CAL'];
/** Categorias que contam como finos no teor de finos. */
const CATEGORIAS_FINOS = ['CIMENTO', 'CAL', 'FILER'];

/** Ensaios previstos, usados para medir a completude do registro. */
const ENSAIOS_PREVISTOS = [
  'densidadeAparente',
  'retencaoAgua',
  'densidadeFresco',
  'squeezeFlow',
  'granulometria',
  'flexao3',
  'flexao7',
  'flexao14',
  'flexao28',
  'compressao3',
  'compressao7',
  'compressao14',
  'compressao28',
  'endurecido14',
  'endurecido28',
] as const;

type FormulacaoComRelacoes = {
  id: string;
  numeracao: number;
  nomenclatura: string;
  tipoProjeto: string | null;
  desenvolvedor: string | null;
  alimentador: string | null;
  avaliador: string | null;
  data: Date | null;
  origem: string | null;
  comentarios: string | null;
  teorAgua: number | null;
  massaAgua: number | null;
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
  componentes: {
    materialId: string;
    teor: number;
    material: { id: string; nome: string; categoria: string; ativo: boolean };
  }[];
  granulometria: { peneiraMm: number; frequencia: number }[];
  resistencias: { tipo: string; idadeDias: number; valores: number[] }[];
  corpos: {
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
  }[];
};

/**
 * Converte a formulação vinda do banco no formato consumido pelo frontend,
 * aplicando todos os campos derivados.
 */
export function mapFormulacao(f: FormulacaoComRelacoes) {
  const teorLigantes = teorFinos(
    f.componentes
      .filter((c) => CATEGORIAS_LIGANTE.includes(c.material.categoria))
      .map((c) => c.teor),
  );

  const finos = teorFinos(
    f.componentes
      .filter((c) => CATEGORIAS_FINOS.includes(c.material.categoria))
      .map((c) => c.teor),
  );

  const resistencias = f.resistencias.map((r) => ({
    tipo: r.tipo,
    idadeDias: r.idadeDias,
    valores: r.valores,
    media: arredondar(media(r.valores), 2),
    desvioPadrao: arredondar(desvioPadrao(r.valores), 3),
  }));

  const idades = Array.from(new Set(f.corpos.map((c) => c.idadeDias))).sort(
    (a, b) => a - b,
  );

  const endurecidos = idades.map((idade) => {
    const corpos = f.corpos
      .filter((c) => c.idadeDias === idade)
      .sort((a, b) => a.indice - b.indice)
      .map((c) => calcularCorpoDeProva(c));

    return {
      idadeDias: idade,
      corpos: corpos.map((c) => ({
        idadeDias: idade,
        indice: c.indice,
        l1: c.l1 ?? null,
        l2: c.l2 ?? null,
        h1: c.h1 ?? null,
        h2: c.h2 ?? null,
        c1: c.c1 ?? null,
        c2: c.c2 ?? null,
        massa: c.massa ?? null,
        v1: c.v1 ?? null,
        v2: c.v2 ?? null,
        v3: c.v3 ?? null,
        volume: arredondar(c.volume, 3),
        massaEspecifica: arredondar(c.massaEspecifica, 1),
        modulo: arredondar(c.modulo, 1),
      })),
      densidadeMedia: arredondar(densidadeMediaEndurecida(corpos), 1),
      moduloMedio: arredondar(media(corpos.map((c) => c.modulo)), 1),
    };
  });

  const compressao28d =
    resistencias.find((r) => r.tipo === 'COMPRESSAO' && r.idadeDias === 28)
      ?.media ?? null;
  const flexao28d =
    resistencias.find((r) => r.tipo === 'FLEXAO' && r.idadeDias === 28)?.media ??
    null;

  const calculados = {
    relacaoAguaLigante: arredondar(
      relacaoAguaLigante(f.teorAgua, teorLigantes),
      3,
    ),
    teorFinos: arredondar(finos, 2),
    densidadeAparente: arredondar(
      densidade(f.densAparenteMassa, f.densAparenteVolume),
      1,
    ),
    retencaoAgua: arredondar(
      retencaoAgua(f.retencaoM0, f.retencaoM1, f.retencaoM2, f.massaAgua),
      2,
    ),
    densidadeFresco: arredondar(
      densidade(f.densFrescoMassa, f.densFrescoVolume),
      1,
    ),
    squeezeDeslocamentoMedio: arredondar(
      media([
        f.squeezeDeslocamento1,
        f.squeezeDeslocamento2,
        f.squeezeDeslocamento3,
      ]),
      2,
    ),
    squeezeCargaMedia: arredondar(
      media([f.squeezeCarga1, f.squeezeCarga2, f.squeezeCarga3]),
      2,
    ),
    moduloFinura: arredondar(moduloFinura(f.granulometria), 2),
    compressao28d,
    flexao28d,
    completude: calcularCompletude(f, resistencias, endurecidos),
  };

  return {
    id: f.id,
    numeracao: f.numeracao,
    nomenclatura: f.nomenclatura,
    tipoProjeto: f.tipoProjeto,
    desenvolvedor: f.desenvolvedor,
    alimentador: f.alimentador,
    avaliador: f.avaliador,
    data: f.data ? f.data.toISOString() : null,
    origem: f.origem,
    comentarios: f.comentarios,
    teorAgua: f.teorAgua,
    massaAgua: f.massaAgua,
    componentes: f.componentes.map((c) => ({
      materialId: c.materialId,
      teor: c.teor,
      material: c.material,
    })),
    // Já sai acumulada: é a forma em que a curva é lida e comparada com as
    // zonas da NBR 7211, e assim o cálculo mora só aqui.
    granulometria: retidaAcumulada(f.granulometria),
    densAparenteMassa: f.densAparenteMassa,
    densAparenteVolume: f.densAparenteVolume,
    retencaoM0: f.retencaoM0,
    retencaoM1: f.retencaoM1,
    retencaoM2: f.retencaoM2,
    densFrescoMassa: f.densFrescoMassa,
    densFrescoVolume: f.densFrescoVolume,
    squeezeDeslocamento1: f.squeezeDeslocamento1,
    squeezeDeslocamento2: f.squeezeDeslocamento2,
    squeezeDeslocamento3: f.squeezeDeslocamento3,
    squeezeCarga1: f.squeezeCarga1,
    squeezeCarga2: f.squeezeCarga2,
    squeezeCarga3: f.squeezeCarga3,
    resistencias,
    endurecidos,
    calculados,
  };
}

export type FormulacaoDetalhada = ReturnType<typeof mapFormulacao>;

/** Percentual dos ensaios previstos que já têm dado preenchido (0–100). */
function calcularCompletude(
  f: FormulacaoComRelacoes,
  resistencias: { tipo: string; idadeDias: number; media: number | null }[],
  endurecidos: { idadeDias: number; densidadeMedia: number | null }[],
): number {
  const temResistencia = (tipo: string, idade: number): boolean =>
    resistencias.some(
      (r) => r.tipo === tipo && r.idadeDias === idade && r.media !== null,
    );

  const preenchido: Record<(typeof ENSAIOS_PREVISTOS)[number], boolean> = {
    densidadeAparente:
      f.densAparenteMassa !== null && f.densAparenteVolume !== null,
    retencaoAgua:
      f.retencaoM0 !== null && f.retencaoM1 !== null && f.retencaoM2 !== null,
    densidadeFresco:
      f.densFrescoMassa !== null && f.densFrescoVolume !== null,
    squeezeFlow: f.squeezeDeslocamento1 !== null || f.squeezeCarga1 !== null,
    granulometria: f.granulometria.length > 0,
    flexao3: temResistencia('FLEXAO', 3),
    flexao7: temResistencia('FLEXAO', 7),
    flexao14: temResistencia('FLEXAO', 14),
    flexao28: temResistencia('FLEXAO', 28),
    compressao3: temResistencia('COMPRESSAO', 3),
    compressao7: temResistencia('COMPRESSAO', 7),
    compressao14: temResistencia('COMPRESSAO', 14),
    compressao28: temResistencia('COMPRESSAO', 28),
    endurecido14: endurecidos.some(
      (e) => e.idadeDias === 14 && e.densidadeMedia !== null,
    ),
    endurecido28: endurecidos.some(
      (e) => e.idadeDias === 28 && e.densidadeMedia !== null,
    ),
  };

  const total = ENSAIOS_PREVISTOS.length;
  const feitos = ENSAIOS_PREVISTOS.filter((k) => preenchido[k]).length;
  return Math.round((feitos / total) * 100);
}
