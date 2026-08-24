/**
 * Modelo de dados do Dashboard de Argamassas (Drizzle ORM / PostgreSQL).
 *
 * Espelha a estrutura da "Planilha de Registro e cálculo" do laboratório:
 * cada `formulacoes` é uma linha da aba "planilha de alimentação".
 */

import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const tipoProjetoEnum = pgEnum('tipo_projeto', [
  'NP', // Novo Produto
  'MT', // Melhoria Técnica
  'AT', // Apoio Técnico
  'RC', // Redução de Custo
  'PE', // Projeto Externo
]);

export const origemEnum = pgEnum('origem', ['PRODUCAO', 'LABORATORIO']);

export const categoriaMaterialEnum = pgEnum('categoria_material', [
  'CIMENTO',
  'CAL',
  'FILER',
  'AREIA_FINA',
  'AREIA_MEDIA',
  'ADITIVO_RETENTOR_AGUA',
  'ADITIVO_INCORPORADOR_AR',
  'FIBRA',
  'SUPERPLASTIFICANTE',
]);

export const tipoResistenciaEnum = pgEnum('tipo_resistencia', [
  'FLEXAO',
  'COMPRESSAO',
]);

/** Insumos disponíveis para compor uma formulação (cadastro extensível). */
export const materiais = pgTable(
  'materiais',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nome: text('nome').notNull(),
    categoria: categoriaMaterialEnum('categoria').notNull(),
    ativo: boolean('ativo').notNull().default(true),
    ordem: integer('ordem').notNull().default(0),
  },
  (t) => ({
    nomeUnico: uniqueIndex('materiais_nome_unico').on(t.nome),
    porCategoria: index('materiais_categoria_idx').on(t.categoria),
  }),
);

/** Uma formulação desenvolvida e ensaiada. */
export const formulacoes = pgTable(
  'formulacoes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    numeracao: integer('numeracao').notNull(),
    nomenclatura: text('nomenclatura').notNull(),
    tipoProjeto: tipoProjetoEnum('tipo_projeto'),
    desenvolvedor: text('desenvolvedor'),
    alimentador: text('alimentador'),
    avaliador: text('avaliador'),
    data: timestamp('data', { withTimezone: true }),
    origem: origemEnum('origem'),
    comentarios: text('comentarios'),

    /** Teor de água em % da massa seca. */
    teorAgua: doublePrecision('teor_agua'),
    /** Massa de água em g. */
    massaAgua: doublePrecision('massa_agua'),

    // --- Estado anidro ---
    densAparenteMassa: doublePrecision('dens_aparente_massa'),
    densAparenteVolume: doublePrecision('dens_aparente_volume'),

    // --- Estado fresco ---
    /** Retenção de água (NBR 13277): massas M0, M1 e M2 em g. */
    retencaoM0: doublePrecision('retencao_m0'),
    retencaoM1: doublePrecision('retencao_m1'),
    retencaoM2: doublePrecision('retencao_m2'),
    densFrescoMassa: doublePrecision('dens_fresco_massa'),
    densFrescoVolume: doublePrecision('dens_fresco_volume'),
    /** Squeeze-flow: deslocamento máximo (mm) por curva. */
    squeezeDeslocamento1: doublePrecision('squeeze_deslocamento_1'),
    squeezeDeslocamento2: doublePrecision('squeeze_deslocamento_2'),
    squeezeDeslocamento3: doublePrecision('squeeze_deslocamento_3'),
    /** Squeeze-flow: carga máxima (N) por curva. */
    squeezeCarga1: doublePrecision('squeeze_carga_1'),
    squeezeCarga2: doublePrecision('squeeze_carga_2'),
    squeezeCarga3: doublePrecision('squeeze_carga_3'),

    criadoEm: timestamp('criado_em', { withTimezone: true })
      .notNull()
      .defaultNow(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    numeracaoUnica: uniqueIndex('formulacoes_numeracao_unica').on(t.numeracao),
    porTipo: index('formulacoes_tipo_projeto_idx').on(t.tipoProjeto),
    porOrigem: index('formulacoes_origem_idx').on(t.origem),
    porData: index('formulacoes_data_idx').on(t.data),
  }),
);

/** Teor de cada material na formulação, em % da massa seca. */
export const componentesFormulacao = pgTable(
  'componentes_formulacao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    formulacaoId: uuid('formulacao_id')
      .notNull()
      .references(() => formulacoes.id, { onDelete: 'cascade' }),
    materialId: uuid('material_id')
      .notNull()
      .references(() => materiais.id),
    teor: doublePrecision('teor').notNull(),
  },
  (t) => ({
    unico: uniqueIndex('componentes_formulacao_unico').on(
      t.formulacaoId,
      t.materialId,
    ),
  }),
);

/** Distribuição granulométrica: frequência (%) por diâmetro de peneira. */
export const pontosGranulometricos = pgTable(
  'pontos_granulometricos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    formulacaoId: uuid('formulacao_id')
      .notNull()
      .references(() => formulacoes.id, { onDelete: 'cascade' }),
    /** Diâmetro da peneira em mm; 0 representa o fundo. */
    peneiraMm: doublePrecision('peneira_mm').notNull(),
    frequencia: doublePrecision('frequencia').notNull(),
  },
  (t) => ({
    unico: uniqueIndex('pontos_granulometricos_unico').on(
      t.formulacaoId,
      t.peneiraMm,
    ),
  }),
);

/** Resistência à tração na flexão (3 CPs) ou à compressão (6 CPs), por idade. */
export const ensaiosResistencia = pgTable(
  'ensaios_resistencia',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    formulacaoId: uuid('formulacao_id')
      .notNull()
      .references(() => formulacoes.id, { onDelete: 'cascade' }),
    tipo: tipoResistenciaEnum('tipo').notNull(),
    idadeDias: integer('idade_dias').notNull(),
    /** Valores por corpo de prova, em MPa. */
    valores: doublePrecision('valores').array().notNull(),
  },
  (t) => ({
    unico: uniqueIndex('ensaios_resistencia_unico').on(
      t.formulacaoId,
      t.tipo,
      t.idadeDias,
    ),
  }),
);

/**
 * Corpo de prova no estado endurecido: dimensões, massa e leituras de ultrassom.
 * Base do cálculo de densidade e módulo de elasticidade dinâmico (14 e 28 dias).
 */
export const corposDeProvaEndurecidos = pgTable(
  'corpos_de_prova_endurecidos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    formulacaoId: uuid('formulacao_id')
      .notNull()
      .references(() => formulacoes.id, { onDelete: 'cascade' }),
    idadeDias: integer('idade_dias').notNull(),
    indice: integer('indice').notNull(),

    /** Medidas em cm — duas leituras por dimensão. */
    l1: doublePrecision('l1'),
    l2: doublePrecision('l2'),
    h1: doublePrecision('h1'),
    h2: doublePrecision('h2'),
    c1: doublePrecision('c1'),
    c2: doublePrecision('c2'),
    /** Massa do corpo de prova em g. */
    massa: doublePrecision('massa'),
    /** Leituras de velocidade de ultrassom em km/s. */
    v1: doublePrecision('v1'),
    v2: doublePrecision('v2'),
    v3: doublePrecision('v3'),
  },
  (t) => ({
    unico: uniqueIndex('corpos_de_prova_endurecidos_unico').on(
      t.formulacaoId,
      t.idadeDias,
      t.indice,
    ),
  }),
);

// --- Relações (habilitam db.query.formulacoes.findMany({ with: ... })) ---

export const formulacoesRelations = relations(formulacoes, ({ many }) => ({
  componentes: many(componentesFormulacao),
  granulometria: many(pontosGranulometricos),
  resistencias: many(ensaiosResistencia),
  corpos: many(corposDeProvaEndurecidos),
}));

export const materiaisRelations = relations(materiais, ({ many }) => ({
  componentes: many(componentesFormulacao),
}));

export const componentesRelations = relations(
  componentesFormulacao,
  ({ one }) => ({
    formulacao: one(formulacoes, {
      fields: [componentesFormulacao.formulacaoId],
      references: [formulacoes.id],
    }),
    material: one(materiais, {
      fields: [componentesFormulacao.materialId],
      references: [materiais.id],
    }),
  }),
);

export const granulometriaRelations = relations(
  pontosGranulometricos,
  ({ one }) => ({
    formulacao: one(formulacoes, {
      fields: [pontosGranulometricos.formulacaoId],
      references: [formulacoes.id],
    }),
  }),
);

export const resistenciasRelations = relations(
  ensaiosResistencia,
  ({ one }) => ({
    formulacao: one(formulacoes, {
      fields: [ensaiosResistencia.formulacaoId],
      references: [formulacoes.id],
    }),
  }),
);

export const corposRelations = relations(
  corposDeProvaEndurecidos,
  ({ one }) => ({
    formulacao: one(formulacoes, {
      fields: [corposDeProvaEndurecidos.formulacaoId],
      references: [formulacoes.id],
    }),
  }),
);

export type Formulacao = typeof formulacoes.$inferSelect;
export type NovaFormulacao = typeof formulacoes.$inferInsert;
export type Material = typeof materiais.$inferSelect;
