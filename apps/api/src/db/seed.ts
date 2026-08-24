/**
 * Seed de desenvolvimento.
 *
 * A planilha real tem apenas uma linha totalmente preenchida
 * ("Argamassa de Revestimento_1"); as demais são nomes de template sem medições.
 * Este seed grava essa formulação com os valores originais e gera outras
 * plausíveis em torno dela, para desenvolver e testar os dashboards.
 *
 * Os números são determinísticos (gerador linear congruente com semente fixa),
 * então rodar o seed duas vezes produz exatamente o mesmo banco.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { MASSA_SECA_PADRAO_G as MASSA_SECA_ENSAIO_G } from '../calculos/calculos';
import { carregarAmbiente, obterDatabaseUrl, explicarErro } from '../config/ambiente';
import { MATERIAIS_PLANILHA } from '../importacao/layout-planilha';
import * as schema from './schema';
import {
  componentesFormulacao,
  corposDeProvaEndurecidos,
  ensaiosResistencia,
  formulacoes,
  materiais,
  pontosGranulometricos,
} from './schema';

const DESENVOLVEDORES = Array.from({ length: 10 }, (_, i) => `Fulano_${i + 1}`);
const AVALIADORES = Array.from({ length: 4 }, (_, i) => `Fulano_${i + 1}`);
const OPERADORES = Array.from({ length: 6 }, (_, i) => `Fulano_${i + 1}`);
const TIPOS = ['NP', 'MT', 'AT', 'RC', 'PE'] as const;
const ORIGENS = ['PRODUCAO', 'LABORATORIO'] as const;

const FAMILIAS = [
  'Argamassa de Revestimento',
  'Argamassa de Assentamento',
  'Argamassa Colante',
  'Contrapiso',
  'Argamassa Projetada',
];

/** Gerador pseudoaleatório determinístico. */
function criarRandom(semente: number): () => number {
  let estado = semente;
  return () => {
    estado = (estado * 1664525 + 1013904223) % 4294967296;
    return estado / 4294967296;
  };
}

const rand = criarRandom(20260824);
const entre = (min: number, max: number): number => min + rand() * (max - min);
const escolher = <T>(lista: readonly T[]): T =>
  lista[Math.floor(rand() * lista.length)] as T;
const arred = (v: number, casas = 2): number => {
  const f = 10 ** casas;
  return Math.round(v * f) / f;
};

/** Valores reais da linha 11 da planilha, usados como formulação de referência. */
const REFERENCIA = {
  nomenclatura: 'Argamassa de Revestimento_1',
  teorAgua: 16,
  massaAgua: 400,
  granulometria: [
    { peneiraMm: 1.7, frequencia: 0 },
    { peneiraMm: 1.4, frequencia: 1.5 },
    { peneiraMm: 1.18, frequencia: 5.8 },
    { peneiraMm: 0.6, frequencia: 16.7 },
    { peneiraMm: 0.3, frequencia: 20.2 },
    { peneiraMm: 0.15, frequencia: 19.8 },
    { peneiraMm: 0.09, frequencia: 2.5 },
    { peneiraMm: 0, frequencia: 33.5 },
  ],
  densAparenteMassa: 630,
  densAparenteVolume: 400.1,
  retencaoM0: 1548.6,
  retencaoM1: 2700.2,
  retencaoM2: 2679.5,
  densFrescoMassa: 678.9,
  densFrescoVolume: 400.1,
  squeezeDeslocamento: [8.5, 8.4, 8.3],
  squeezeCarga: [41.3, 43.5, 43.2],
  corpos14: [
    { indice: 1, l1: 16.1, l2: 16, h1: 4.02, h2: 4.05, c1: 4.12, c2: 4.08, massa: 402, v1: 4.59, v2: 4.96, v3: 4.95 },
    { indice: 2, l1: 16.1, l2: 16, h1: 4.02, h2: 4.02, c1: 4.06, c2: 4.01, massa: 398, v1: 4.92, v2: 4.82, v3: 4.86 },
    { indice: 3, l1: 16.02, l2: 16.07, h1: 4.03, h2: 4.02, c1: 4.01, c2: 4.02, massa: 395, v1: 4.98, v2: 4.68, v3: 4.9 },
  ],
  corpos28: [
    { indice: 1, l1: 16.1, l2: 16, h1: 4.02, h2: 4.05, c1: 4.12, c2: 4.08, massa: 402, v1: 4.68, v2: 4.98, v3: 4.78 },
    { indice: 2, l1: 16.1, l2: 16, h1: 4.02, h2: 4.02, c1: 4.06, c2: 4.01, massa: 398, v1: 4.8, v2: 4.92, v3: 4.57 },
    { indice: 3, l1: 16.02, l2: 16.07, h1: 4.03, h2: 4.02, c1: 4.01, c2: 4.02, massa: 395, v1: 4.89, v2: 4.35, v3: 4.89 },
  ],
};

/** Curva típica de ganho de resistência por idade, relativa aos 28 dias. */
const FATOR_IDADE: Record<number, number> = { 3: 0.45, 7: 0.66, 14: 0.85, 28: 1 };

const TOTAL_FORMULACOES = 64;
/** Data de referência do seed — mantém os dados estáveis entre execuções. */
const HOJE = new Date(Date.UTC(2026, 7, 24));

carregarAmbiente();

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: obterDatabaseUrl() });
  const db = drizzle(pool, { schema });

  console.log('Limpando dados existentes...');
  await db.delete(corposDeProvaEndurecidos);
  await db.delete(ensaiosResistencia);
  await db.delete(pontosGranulometricos);
  await db.delete(componentesFormulacao);
  await db.delete(formulacoes);
  await db.delete(materiais);

  console.log('Cadastrando materiais...');
  const materiaisCriados = await db
    .insert(materiais)
    .values(
      MATERIAIS_PLANILHA.map((m, i) => ({
        nome: m.nome,
        categoria: m.categoria as (typeof materiais.categoria.enumValues)[number],
        ordem: i,
      })),
    )
    .returning();

  const porCategoria = (categoria: string) =>
    materiaisCriados.filter((m) => m.categoria === categoria);

  console.log('Gerando formulações...');

  for (let n = 1; n <= TOTAL_FORMULACOES; n++) {
    const referencia = n === 1;
    const familia = referencia ? FAMILIAS[0] : escolher(FAMILIAS);
    const nomenclatura = referencia ? REFERENCIA.nomenclatura : `${familia}_${n}`;

    // Composição: um cimento, uma cal, um fíler, duas areias e alguns aditivos.
    const cimento = escolher(porCategoria('CIMENTO'));
    const cal = escolher(porCategoria('CAL'));
    const filer = escolher(porCategoria('FILER'));
    const areiaFina = escolher(porCategoria('AREIA_FINA'));
    const areiaMedia = escolher(porCategoria('AREIA_MEDIA'));
    const retentor = escolher(porCategoria('ADITIVO_RETENTOR_AGUA'));
    const incorporador = escolher(porCategoria('ADITIVO_INCORPORADOR_AR'));

    const teorCimento = arred(entre(12, 26), 2);
    const teorCal = arred(entre(3, 10), 2);
    const teorFiler = arred(entre(4, 14), 2);
    const teorRetentor = arred(entre(0.15, 0.45), 3);
    const teorIncorporador = arred(entre(0.01, 0.06), 3);
    const usados =
      teorCimento + teorCal + teorFiler + teorRetentor + teorIncorporador;
    const areias = 100 - usados;
    const teorAreiaFina = arred(areias * entre(0.35, 0.55), 2);
    const teorAreiaMedia = arred(areias - teorAreiaFina, 2);

    const teorAgua = referencia ? REFERENCIA.teorAgua : arred(entre(11, 19), 1);
    const massaAgua = referencia ? REFERENCIA.massaAgua : arred(teorAgua * 25, 0);

    // Retenção de água: sorteia um valor plausível (78–98%) e deriva M2 pela
    // fórmula do ensaio, em vez de sortear as três massas de forma independente
    // — assim os dados de exemplo respeitam a física do ensaio.
    const retencaoM0 = referencia
      ? REFERENCIA.retencaoM0
      : arred(entre(1520, 1580), 1);
    const retencaoM1 = referencia
      ? REFERENCIA.retencaoM1
      : arred(retencaoM0 + entre(1100, 1200), 1);
    const retencaoM2 = referencia
      ? REFERENCIA.retencaoM2
      : (() => {
          const alvo = entre(78, 98);
          const af = massaAgua / (massaAgua + MASSA_SECA_ENSAIO_G);
          const perda = af * (retencaoM1 - retencaoM0) * (1 - alvo / 100);
          return arred(retencaoM1 - perda, 1);
        })();

    // A relação água/ligante governa a resistência — mantém o dado coerente.
    const ligantes = teorCimento + teorCal;
    const aguaLigante = teorAgua / ligantes;
    const compressao28Base = Math.max(
      1.8,
      arred(14.5 - 11 * aguaLigante + entre(-1.2, 1.2), 2),
    );
    const flexao28Base = arred(compressao28Base * entre(0.28, 0.38), 2);

    // Data espalhada nos últimos 18 meses.
    const data = new Date(HOJE);
    data.setUTCDate(data.getUTCDate() - Math.floor(entre(0, 540)));

    // Nem toda formulação tem todos os ensaios — reflete a realidade do laboratório.
    const temEnsaiosCompletos = referencia || rand() < 0.62;
    const temEndurecido = referencia || (temEnsaiosCompletos && rand() < 0.75);

    const [formulacao] = await db
      .insert(formulacoes)
      .values({
        numeracao: n,
        nomenclatura,
        tipoProjeto: escolher(TIPOS),
        desenvolvedor: escolher(DESENVOLVEDORES),
        alimentador: escolher(OPERADORES),
        avaliador: escolher(AVALIADORES),
        data,
        origem: escolher(ORIGENS),
        comentarios:
          rand() < 0.25
            ? 'Ajuste de teor de retentor em relação ao lote anterior.'
            : null,
        teorAgua,
        massaAgua,
        densAparenteMassa: referencia
          ? REFERENCIA.densAparenteMassa
          : arred(entre(590, 700), 1),
        densAparenteVolume: referencia ? REFERENCIA.densAparenteVolume : 400.1,
        retencaoM0,
        retencaoM1,
        retencaoM2,
        densFrescoMassa: referencia
          ? REFERENCIA.densFrescoMassa
          : arred(entre(640, 760), 1),
        densFrescoVolume: referencia ? REFERENCIA.densFrescoVolume : 400.1,
        squeezeDeslocamento1: referencia ? REFERENCIA.squeezeDeslocamento[0] : arred(entre(6, 11), 1),
        squeezeDeslocamento2: referencia ? REFERENCIA.squeezeDeslocamento[1] : arred(entre(6, 11), 1),
        squeezeDeslocamento3: referencia ? REFERENCIA.squeezeDeslocamento[2] : arred(entre(6, 11), 1),
        squeezeCarga1: referencia ? REFERENCIA.squeezeCarga[0] : arred(entre(30, 60), 1),
        squeezeCarga2: referencia ? REFERENCIA.squeezeCarga[1] : arred(entre(30, 60), 1),
        squeezeCarga3: referencia ? REFERENCIA.squeezeCarga[2] : arred(entre(30, 60), 1),
      })
      .returning({ id: formulacoes.id });

    if (!formulacao) throw new Error(`Falha ao criar a formulação ${n}`);
    const formulacaoId = formulacao.id;

    await db.insert(componentesFormulacao).values([
      { formulacaoId, materialId: cimento.id, teor: teorCimento },
      { formulacaoId, materialId: cal.id, teor: teorCal },
      { formulacaoId, materialId: filer.id, teor: teorFiler },
      { formulacaoId, materialId: areiaFina.id, teor: teorAreiaFina },
      { formulacaoId, materialId: areiaMedia.id, teor: teorAreiaMedia },
      { formulacaoId, materialId: retentor.id, teor: teorRetentor },
      { formulacaoId, materialId: incorporador.id, teor: teorIncorporador },
    ]);

    // Granulometria (soma ~100%).
    const granulometria = referencia
      ? REFERENCIA.granulometria
      : (() => {
          const brutos = [
            entre(0, 1),
            entre(0.5, 3),
            entre(3, 9),
            entre(12, 22),
            entre(15, 25),
            entre(14, 24),
            entre(1, 5),
            entre(25, 40),
          ];
          const soma = brutos.reduce((a, b) => a + b, 0);
          const peneiras = [1.7, 1.4, 1.18, 0.6, 0.3, 0.15, 0.09, 0];
          return peneiras.map((peneiraMm, i) => ({
            peneiraMm,
            frequencia: arred(((brutos[i] as number) / soma) * 100, 1),
          }));
        })();

    await db
      .insert(pontosGranulometricos)
      .values(granulometria.map((g) => ({ ...g, formulacaoId })));

    // Resistências por idade.
    const idades = temEnsaiosCompletos ? [3, 7, 14, 28] : [7, 28];
    await db.insert(ensaiosResistencia).values(
      idades.flatMap((idade) => {
        const fator = FATOR_IDADE[idade] ?? 1;
        const compressaoAlvo = compressao28Base * fator;
        const flexaoAlvo = flexao28Base * fator;
        return [
          {
            formulacaoId,
            tipo: 'FLEXAO' as const,
            idadeDias: idade,
            valores: Array.from({ length: 3 }, () =>
              arred(Math.max(0.1, flexaoAlvo * entre(0.93, 1.07)), 2),
            ),
          },
          {
            formulacaoId,
            tipo: 'COMPRESSAO' as const,
            idadeDias: idade,
            valores: Array.from({ length: 6 }, () =>
              arred(Math.max(0.2, compressaoAlvo * entre(0.92, 1.08)), 2),
            ),
          },
        ];
      }),
    );

    // Corpos de prova do estado endurecido (14 e 28 dias).
    if (temEndurecido) {
      const corpos = referencia
        ? [
            ...REFERENCIA.corpos14.map((c) => ({ ...c, idadeDias: 14 })),
            ...REFERENCIA.corpos28.map((c) => ({ ...c, idadeDias: 28 })),
          ]
        : [14, 28].flatMap((idadeDias) =>
            [1, 2, 3].map((indice) => {
              const velocidade = (): number => arred(entre(3.2, 4.6), 2);
              return {
                idadeDias,
                indice,
                l1: arred(entre(15.95, 16.15), 2),
                l2: arred(entre(15.95, 16.15), 2),
                h1: arred(entre(3.98, 4.08), 2),
                h2: arred(entre(3.98, 4.08), 2),
                c1: arred(entre(3.98, 4.12), 2),
                c2: arred(entre(3.98, 4.12), 2),
                massa: arred(entre(385, 425), 0),
                v1: velocidade(),
                v2: velocidade(),
                v3: velocidade(),
              };
            }),
          );

      await db
        .insert(corposDeProvaEndurecidos)
        .values(corpos.map((c) => ({ ...c, formulacaoId })));
    }
  }

  console.log(
    `Seed concluído: ${TOTAL_FORMULACOES} formulações, ${materiaisCriados.length} materiais.`,
  );
  await pool.end();
}

main().catch((e: unknown) => {
  console.error(explicarErro(e));
  process.exit(1);
});
