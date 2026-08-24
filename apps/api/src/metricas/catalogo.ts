/**
 * Catálogo de métricas do domínio, e as regras de que cruzamentos fazem sentido.
 *
 * É o coração dos dashboards customizados. Sem isto, montar um gráfico livre
 * produz com facilidade um número que **parece** certo e não significa nada.
 *
 * Três atributos decidem tudo:
 *
 * - **nível** — a que unidade o valor pertence. Retenção de água é um valor por
 *   formulação; frequência retida é um valor por peneira. Cruzar níveis
 *   diferentes junta grandezas que não se correspondem uma a uma.
 * - **natureza** — contínua (mede) ou categórica (classifica). Uma dispersão
 *   precisa de duas contínuas; uma barra precisa de uma categórica no eixo x.
 * - **unidade** — usada nos rótulos e para avisar quando se compara MPa com %.
 *
 * O construtor de dashboards só oferece combinações que passam por
 * `validarCruzamento`, e quando recusa, explica o motivo.
 */

import { FormulacaoDetalhada } from '../formulacoes/formulacao.mapper';
import {
  CLASSES_COMPRESSAO,
  CLASSES_DENSIDADE,
  CLASSES_RETENCAO,
  classificar,
} from '../calculos/normas';

/** A que unidade de observação o valor pertence. */
export type Nivel = 'formulacao' | 'corpo-de-prova' | 'peneira';

export type Natureza = 'continua' | 'categorica';

export interface Metrica {
  chave: string;
  rotulo: string;
  /** Texto curto da unidade; vazio para contagens e categorias. */
  unidade: string;
  natureza: Natureza;
  nivel: Nivel;
  /** Agrupamento usado só para organizar a lista na interface. */
  grupo: string;
  /** Casas decimais na exibição. */
  casas?: number;
  /** Extrai o valor de uma formulação. `null` quando o ensaio não foi feito. */
  valor: (f: FormulacaoDetalhada) => number | string | null;
}

const resistencia = (
  f: FormulacaoDetalhada,
  tipo: string,
  idade: number,
): number | null =>
  f.resistencias.find((r) => r.tipo === tipo && r.idadeDias === idade)?.media ??
  null;

const endurecido = (
  f: FormulacaoDetalhada,
  idade: number,
  campo: 'moduloMedio' | 'densidadeMedia',
): number | null =>
  f.endurecidos.find((e) => e.idadeDias === idade)?.[campo] ?? null;

/**
 * Todas as métricas disponíveis para montar um gráfico.
 *
 * **Só entram métricas de nível `formulacao`.** As de nível peneira
 * (granulometria) e as séries por idade têm estrutura própria e já contam com
 * gráficos dedicados na visão geral; jogá-las num construtor genérico de dois
 * eixos convidaria justamente ao cruzamento sem sentido que este catálogo
 * existe para impedir. As resistências por idade entram como métricas separadas
 * (compressão aos 7 dias, aos 28…), que aí sim são um valor por formulação.
 */
export const METRICAS: Metrica[] = [
  // --- Estado anidro ---
  {
    chave: 'relacaoAguaLigante',
    rotulo: 'Relação água/ligante',
    unidade: '',
    natureza: 'continua',
    nivel: 'formulacao',
    grupo: 'Estado anidro',
    casas: 3,
    valor: (f) => f.calculados.relacaoAguaLigante,
  },
  {
    chave: 'teorAgua',
    rotulo: 'Teor de água',
    unidade: '%',
    natureza: 'continua',
    nivel: 'formulacao',
    grupo: 'Estado anidro',
    casas: 1,
    valor: (f) => f.teorAgua,
  },
  {
    chave: 'teorFinos',
    rotulo: 'Teor de finos',
    unidade: '%',
    natureza: 'continua',
    nivel: 'formulacao',
    grupo: 'Estado anidro',
    casas: 2,
    valor: (f) => f.calculados.teorFinos,
  },
  {
    chave: 'densidadeAparente',
    rotulo: 'Densidade aparente',
    unidade: 'kg/m³',
    natureza: 'continua',
    nivel: 'formulacao',
    grupo: 'Estado anidro',
    casas: 1,
    valor: (f) => f.calculados.densidadeAparente,
  },
  {
    chave: 'moduloFinura',
    rotulo: 'Módulo de finura',
    unidade: '',
    natureza: 'continua',
    nivel: 'formulacao',
    grupo: 'Estado anidro',
    casas: 2,
    valor: (f) => f.calculados.moduloFinura,
  },

  // --- Estado fresco ---
  {
    chave: 'retencaoAgua',
    rotulo: 'Retenção de água',
    unidade: '%',
    natureza: 'continua',
    nivel: 'formulacao',
    grupo: 'Estado fresco',
    casas: 2,
    valor: (f) => f.calculados.retencaoAgua,
  },
  {
    chave: 'densidadeFresco',
    rotulo: 'Densidade no estado fresco',
    unidade: 'kg/m³',
    natureza: 'continua',
    nivel: 'formulacao',
    grupo: 'Estado fresco',
    casas: 1,
    valor: (f) => f.calculados.densidadeFresco,
  },
  {
    chave: 'squeezeDeslocamento',
    rotulo: 'Squeeze-flow — deslocamento',
    unidade: 'mm',
    natureza: 'continua',
    nivel: 'formulacao',
    grupo: 'Estado fresco',
    casas: 2,
    valor: (f) => f.calculados.squeezeDeslocamentoMedio,
  },
  {
    chave: 'squeezeCarga',
    rotulo: 'Squeeze-flow — carga',
    unidade: 'N',
    natureza: 'continua',
    nivel: 'formulacao',
    grupo: 'Estado fresco',
    casas: 2,
    valor: (f) => f.calculados.squeezeCargaMedia,
  },

  // --- Estado endurecido ---
  ...[3, 7, 14, 28].map(
    (idade): Metrica => ({
      chave: `compressao${idade}d`,
      rotulo: `Compressão aos ${idade} dias`,
      unidade: 'MPa',
      natureza: 'continua',
      nivel: 'formulacao',
      grupo: 'Estado endurecido',
      casas: 2,
      valor: (f) => resistencia(f, 'COMPRESSAO', idade),
    }),
  ),
  ...[3, 7, 14, 28].map(
    (idade): Metrica => ({
      chave: `flexao${idade}d`,
      rotulo: `Tração na flexão aos ${idade} dias`,
      unidade: 'MPa',
      natureza: 'continua',
      nivel: 'formulacao',
      grupo: 'Estado endurecido',
      casas: 2,
      valor: (f) => resistencia(f, 'FLEXAO', idade),
    }),
  ),
  ...[14, 28].map(
    (idade): Metrica => ({
      chave: `modulo${idade}d`,
      rotulo: `Módulo de elasticidade aos ${idade} dias`,
      unidade: 'MPa',
      natureza: 'continua',
      nivel: 'formulacao',
      grupo: 'Estado endurecido',
      casas: 0,
      valor: (f) => endurecido(f, idade, 'moduloMedio'),
    }),
  ),
  ...[14, 28].map(
    (idade): Metrica => ({
      chave: `densidadeEndurecida${idade}d`,
      rotulo: `Densidade endurecida aos ${idade} dias`,
      unidade: 'kg/m³',
      natureza: 'continua',
      nivel: 'formulacao',
      grupo: 'Estado endurecido',
      casas: 1,
      valor: (f) => endurecido(f, idade, 'densidadeMedia'),
    }),
  ),

  // --- Registro ---
  {
    chave: 'completude',
    rotulo: 'Preenchimento dos ensaios',
    unidade: '%',
    natureza: 'continua',
    nivel: 'formulacao',
    grupo: 'Registro',
    casas: 0,
    valor: (f) => f.calculados.completude,
  },

  // --- Categorias ---
  {
    chave: 'tipoProjeto',
    rotulo: 'Tipo de projeto',
    unidade: '',
    natureza: 'categorica',
    nivel: 'formulacao',
    grupo: 'Identificação',
    valor: (f) => f.tipoProjeto,
  },
  {
    chave: 'origem',
    rotulo: 'Origem',
    unidade: '',
    natureza: 'categorica',
    nivel: 'formulacao',
    grupo: 'Identificação',
    valor: (f) => f.origem,
  },
  {
    chave: 'desenvolvedor',
    rotulo: 'Desenvolvedor',
    unidade: '',
    natureza: 'categorica',
    nivel: 'formulacao',
    grupo: 'Identificação',
    valor: (f) => f.desenvolvedor,
  },
  {
    chave: 'avaliador',
    rotulo: 'Avaliador',
    unidade: '',
    natureza: 'categorica',
    nivel: 'formulacao',
    grupo: 'Identificação',
    valor: (f) => f.avaliador,
  },
  {
    chave: 'classeCompressao',
    rotulo: 'Classe de compressão (P)',
    unidade: '',
    natureza: 'categorica',
    nivel: 'formulacao',
    grupo: 'Classes NBR 13281',
    valor: (f) => classificar(f.calculados.compressao28d, CLASSES_COMPRESSAO),
  },
  {
    chave: 'classeDensidade',
    rotulo: 'Classe de densidade (D)',
    unidade: '',
    natureza: 'categorica',
    nivel: 'formulacao',
    grupo: 'Classes NBR 13281',
    valor: (f) => classificar(f.calculados.densidadeFresco, CLASSES_DENSIDADE),
  },
  {
    chave: 'classeRetencao',
    rotulo: 'Classe de retenção (U)',
    unidade: '',
    natureza: 'categorica',
    nivel: 'formulacao',
    grupo: 'Classes NBR 13281',
    valor: (f) => classificar(f.calculados.retencaoAgua, CLASSES_RETENCAO),
  },
];

export const METRICAS_POR_CHAVE = new Map(METRICAS.map((m) => [m.chave, m]));

export const obterMetrica = (chave: string): Metrica | undefined =>
  METRICAS_POR_CHAVE.get(chave);

/* ------------------------------------------------------------------ *
 * Tipos de gráfico e o que cada um exige
 * ------------------------------------------------------------------ */

export type TipoPainel = 'dispersao' | 'barras' | 'distribuicao';

export type Agregacao = 'media' | 'mediana' | 'soma' | 'contagem' | 'maximo' | 'minimo';

export const AGREGACOES: { chave: Agregacao; rotulo: string }[] = [
  { chave: 'media', rotulo: 'Média' },
  { chave: 'mediana', rotulo: 'Mediana' },
  { chave: 'maximo', rotulo: 'Máximo' },
  { chave: 'minimo', rotulo: 'Mínimo' },
  { chave: 'soma', rotulo: 'Soma' },
  { chave: 'contagem', rotulo: 'Contagem' },
];

export const TIPOS_PAINEL: {
  chave: TipoPainel;
  rotulo: string;
  descricao: string;
  precisaY: boolean;
}[] = [
  {
    chave: 'dispersao',
    rotulo: 'Dispersão',
    descricao:
      'Cada ponto é uma formulação. Mostra se duas medidas andam juntas, com reta de tendência e R².',
    precisaY: true,
  },
  {
    chave: 'barras',
    rotulo: 'Barras por categoria',
    descricao:
      'Agrupa as formulações por uma categoria e resume uma medida em cada grupo.',
    precisaY: true,
  },
  {
    chave: 'distribuicao',
    rotulo: 'Distribuição',
    descricao:
      'Quantas formulações caem em cada faixa de uma medida, ou em cada categoria.',
    precisaY: false,
  },
];

export interface ResultadoValidacao {
  valido: boolean;
  /** Por que não vale — texto para mostrar a quem está montando o gráfico. */
  motivo?: string;
  /** Ressalva que não impede o gráfico, mas muda como lê-lo. */
  alerta?: string;
}

/**
 * Diz se um painel faz sentido, e por quê não quando não faz.
 *
 * As regras existem para barrar o gráfico que engana:
 *
 * 1. **Níveis diferentes não se cruzam.** É a regra que mais importa: cruzar um
 *    valor por formulação com um valor por peneira alinha grandezas que não têm
 *    correspondência um a um.
 * 2. **Dispersão exige duas contínuas.** Com uma categórica no eixo, os pontos
 *    se enfileiram em colunas e a reta de tendência vira ruído com aparência de
 *    resultado.
 * 3. **Barras exigem categoria no x** e uma medida contínua para resumir —
 *    exceto contagem, que não resume medida nenhuma.
 * 4. **Correlacionar uma métrica com ela mesma** dá R² = 1 sempre. É uma reta,
 *    não uma descoberta.
 *
 * O alerta de idades diferentes não bloqueia: comparar compressão aos 3 dias com
 * a de 28 é legítimo (mede evolução), mas quem lê precisa saber que são momentos
 * distintos do mesmo corpo de prova.
 */
export function validarCruzamento(
  tipo: TipoPainel,
  chaveX: string,
  chaveY?: string | null,
): ResultadoValidacao {
  const x = obterMetrica(chaveX);
  if (!x) return { valido: false, motivo: `Métrica desconhecida: ${chaveX}.` };

  const definicao = TIPOS_PAINEL.find((t) => t.chave === tipo);
  if (!definicao) {
    return { valido: false, motivo: `Tipo de gráfico desconhecido: ${tipo}.` };
  }

  if (tipo === 'distribuicao') {
    return { valido: true };
  }

  const y = chaveY ? obterMetrica(chaveY) : undefined;
  if (!y) {
    return {
      valido: false,
      motivo: 'Escolha a métrica do eixo vertical.',
    };
  }

  if (x.nivel !== y.nivel) {
    return {
      valido: false,
      motivo:
        `"${x.rotulo}" é um valor por ${rotuloNivel(x.nivel)} e "${y.rotulo}" ` +
        `é por ${rotuloNivel(y.nivel)}. Grandezas de níveis diferentes não se ` +
        'correspondem uma a uma — o gráfico teria aparência de resultado sem ser um.',
    };
  }

  if (tipo === 'dispersao') {
    if (x.chave === y.chave) {
      return {
        valido: false,
        motivo:
          'Os dois eixos são a mesma métrica: o resultado é sempre uma reta perfeita.',
      };
    }
    if (x.natureza !== 'continua' || y.natureza !== 'continua') {
      const categorica = x.natureza === 'categorica' ? x : y;
      return {
        valido: false,
        motivo:
          `"${categorica.rotulo}" classifica, não mede. Numa dispersão os pontos ` +
          'ficariam enfileirados em colunas e a reta de tendência não teria ' +
          'significado. Use "Barras por categoria".',
      };
    }
    return { valido: true, alerta: alertaIdades(x, y) };
  }

  // barras
  if (x.natureza !== 'categorica') {
    return {
      valido: false,
      motivo:
        `"${x.rotulo}" é uma medida contínua e não forma grupos. No eixo ` +
        'horizontal das barras entra uma categoria (tipo de projeto, origem, ' +
        'classe da norma…). Para ver a distribuição de uma medida, use ' +
        '"Distribuição".',
    };
  }
  if (y.natureza !== 'continua') {
    return {
      valido: false,
      motivo:
        `"${y.rotulo}" classifica, não mede — não há o que resumir em cada ` +
        'barra. Escolha uma medida contínua, ou use "Distribuição" para contar ' +
        'quantas formulações há em cada categoria.',
    };
  }

  return { valido: true };
}

function rotuloNivel(nivel: Nivel): string {
  if (nivel === 'formulacao') return 'formulação';
  if (nivel === 'corpo-de-prova') return 'corpo de prova';
  return 'peneira';
}

/** Ressalva para cruzamentos entre idades diferentes do mesmo ensaio. */
function alertaIdades(x: Metrica, y: Metrica): string | undefined {
  const idade = (m: Metrica): string | null => {
    const achado = /(\d+)d$/.exec(m.chave);
    return achado ? (achado[1] as string) : null;
  };

  const ix = idade(x);
  const iy = idade(y);
  if (ix && iy && ix !== iy) {
    return `São idades diferentes (${ix} e ${iy} dias) do mesmo corpo de prova — a relação reflete o ganho de resistência com o tempo, não duas propriedades independentes.`;
  }
  return undefined;
}
