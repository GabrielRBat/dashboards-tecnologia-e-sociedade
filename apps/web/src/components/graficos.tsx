'use client';

/**
 * Gráficos do dashboard.
 *
 * Regras aplicadas: uma escala por eixo (nunca dois eixos y), cores de série em
 * ordem fixa, marcas finas com grade discreta, legenda sempre que há duas ou
 * mais séries, camada de hover em todos os gráficos e rótulos diretos no ponto
 * final das linhas. As cores vêm de variáveis CSS, então o modo escuro troca os
 * passos da paleta sem trocar de gráfico.
 */

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  ErrorBar,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import type { ReactNode } from 'react';
import {
  Classificacao,
  Correlacao,
  CurvaGranulometrica,
  DispersaoIdade,
  FamiliaClasses,
  ItemComparativo,
  LimiteZona,
  PontoCorrelacao,
  PontoDispersao,
  PontoEvolucao,
  PontoSqueeze,
} from '@/lib/api';
import { num, tipoProjeto } from '@/lib/formato';
import { useTelaEstreita } from '@/lib/tela';

const CORES = [
  'var(--serie-1)',
  'var(--serie-2)',
  'var(--serie-3)',
  'var(--serie-4)',
  'var(--serie-5)',
  'var(--serie-6)',
];

const EIXO = {
  stroke: 'var(--eixo)',
  tick: { fill: 'var(--tinta-suave)', fontSize: 11.5 },
  tickLine: false,
};

interface LinhaTooltip {
  cor: string;
  rotulo: string;
  valor: string;
}

function Tip({ titulo, linhas }: { titulo: string; linhas: LinhaTooltip[] }) {
  return (
    <div className="tooltip">
      <p className="tooltip-titulo">{titulo}</p>
      {linhas.map((l) => (
        <div className="tooltip-linha" key={l.rotulo}>
          <span className="tooltip-marca" style={{ background: l.cor }} />
          <span>{l.rotulo}</span>
          <span className="tooltip-valor">{l.valor}</span>
        </div>
      ))}
    </div>
  );
}

function Legenda({ itens }: { itens: { cor: string; rotulo: string }[] }) {
  return (
    <div className="legenda">
      {itens.map((i) => (
        <span className="legenda-item" key={i.rotulo}>
          <span className="legenda-marca" style={{ background: i.cor }} />
          {i.rotulo}
        </span>
      ))}
    </div>
  );
}

function SemDados({ children }: { children: ReactNode }) {
  return <div className="sem-dados">{children}</div>;
}

/* --- Evolução da resistência por idade --- */

export function GraficoEvolucao({ dados }: { dados: PontoEvolucao[] }) {
  const comValores = dados.filter(
    (d) => d.compressao !== null || d.flexao !== null,
  );

  if (comValores.length === 0) {
    return <SemDados>Nenhum ensaio de resistência no filtro atual.</SemDados>;
  }

  return (
    <>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart
          data={comValores}
          margin={{ top: 12, right: 44, bottom: 4, left: -6 }}
        >
          <CartesianGrid stroke="var(--grade)" vertical={false} />
          <XAxis
            dataKey="idadeDias"
            {...EIXO}
            tickFormatter={(v: number) => `${v}d`}
          />
          <YAxis
            {...EIXO}
            width={52}
            label={{
              value: 'MPa',
              angle: -90,
              position: 'insideLeft',
              offset: 16,
              style: { fill: 'var(--tinta-suave)', fontSize: 11.5 },
            }}
          />
          <Tooltip
            cursor={{ stroke: 'var(--eixo)', strokeWidth: 1 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <Tip
                  titulo={`${label} dias`}
                  linhas={payload.map((p, i) => ({
                    cor: CORES[i] as string,
                    rotulo: p.name === 'compressao' ? 'Compressão' : 'Flexão',
                    valor: `${num(p.value as number, 2)} MPa`,
                  }))}
                />
              ) : null
            }
          />
          <Line
            type="monotone"
            dataKey="compressao"
            name="compressao"
            stroke={CORES[0]}
            strokeWidth={2}
            isAnimationActive={false}
            dot={{ r: 4, strokeWidth: 2, fill: 'var(--superficie)' }}
            activeDot={{ r: 5.5 }}
            connectNulls
          >
            <LabelList
              dataKey="compressao"
              position="right"
              formatter={(v: number) => num(v, 1)}
              style={{ fill: 'var(--tinta-secundaria)', fontSize: 11 }}
              content={({ index, x, y, value }) =>
                index === comValores.length - 1 && value !== undefined ? (
                  <text
                    x={Number(x) + 8}
                    y={Number(y) + 4}
                    fill="var(--tinta-secundaria)"
                    fontSize={11}
                  >
                    {num(Number(value), 1)}
                  </text>
                ) : null
              }
            />
          </Line>
          <Line
            type="monotone"
            dataKey="flexao"
            name="flexao"
            stroke={CORES[1]}
            strokeWidth={2}
            isAnimationActive={false}
            dot={{ r: 4, strokeWidth: 2, fill: 'var(--superficie)' }}
            activeDot={{ r: 5.5 }}
            connectNulls
          >
            <LabelList
              dataKey="flexao"
              content={({ index, x, y, value }) =>
                index === comValores.length - 1 && value !== undefined ? (
                  <text
                    x={Number(x) + 8}
                    y={Number(y) + 4}
                    fill="var(--tinta-secundaria)"
                    fontSize={11}
                  >
                    {num(Number(value), 1)}
                  </text>
                ) : null
              }
            />
          </Line>
        </LineChart>
      </ResponsiveContainer>
      <Legenda
        itens={[
          { cor: CORES[0] as string, rotulo: 'Resistência à compressão' },
          { cor: CORES[1] as string, rotulo: 'Resistência à tração na flexão' },
        ]}
      />
    </>
  );
}

/**
 * Encurta a nomenclatura preservando o fim.
 *
 * Cortar pelo começo transformaria "Argamassa Colante_7" e "Argamassa
 * Colante_14" no mesmo "Argamassa Col…" — dois rótulos idênticos para
 * formulações diferentes. O que distingue está no fim, no número. Antes disso,
 * tira o prefixo "Argamassa", que se repete em todas e não separa nada.
 */
function encurtar(nome: string, limite: number): string {
  const semPrefixo = nome.replace(/^Argamassa\s+/i, '');
  if (semPrefixo.length <= limite) return semPrefixo;
  return `…${semPrefixo.slice(-(limite - 1))}`;
}

/* --- Ranking de formulações aos 28 dias --- */

export function GraficoComparativo({ dados }: { dados: ItemComparativo[] }) {
  const estreita = useTelaEstreita();

  if (dados.length === 0) {
    return <SemDados>Nenhuma formulação com resistência aos 28 dias.</SemDados>;
  }

  /*
   * No celular o eixo de nomes precisa encolher, senão não sobra espaço para as
   * barras: com os 190 px do desktop numa tela de 320 px restavam 24 px de área
   * de plotagem. O nome vai truncado — o completo aparece no toque.
   */
  const larguraEixo = estreita ? 104 : 190;
  const comRotulo = dados.map((d) => ({
    ...d,
    rotuloEixo: estreita ? encurtar(d.nomenclatura, 14) : d.nomenclatura,
  }));

  const altura = Math.max(240, dados.length * (estreita ? 30 : 26) + 40);

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart
        data={comRotulo}
        layout="vertical"
        margin={{ top: 4, right: estreita ? 34 : 46, bottom: 4, left: 8 }}
        barCategoryGap={6}
      >
        <CartesianGrid stroke="var(--grade)" horizontal={false} />
        <XAxis
          type="number"
          {...EIXO}
          label={{
            value: 'MPa',
            position: 'insideBottomRight',
            offset: -2,
            style: { fill: 'var(--tinta-suave)', fontSize: 11.5 },
          }}
        />
        <YAxis
          type="category"
          dataKey="rotuloEixo"
          {...EIXO}
          width={larguraEixo}
          tick={{
            fill: 'var(--tinta-secundaria)',
            fontSize: estreita ? 10.5 : 11.5,
          }}
        />
        <Tooltip
          cursor={{ fill: 'var(--grade)', fillOpacity: 0.5 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const item = payload[0]?.payload as ItemComparativo;
            return (
              <Tip
                titulo={item.nomenclatura}
                linhas={[
                  {
                    cor: CORES[0] as string,
                    rotulo: 'Compressão 28d',
                    valor: `${num(item.compressao28d, 2)} MPa`,
                  },
                  {
                    cor: CORES[1] as string,
                    rotulo: 'Flexão 28d',
                    valor: `${num(item.flexao28d, 2)} MPa`,
                  },
                  {
                    cor: 'var(--tinta-suave)',
                    rotulo: 'Tipo de projeto',
                    valor: tipoProjeto(item.tipoProjeto),
                  },
                ]}
              />
            );
          }}
        />
        <Bar
          dataKey="compressao28d"
          fill={CORES[0]}
          radius={[0, 4, 4, 0]}
          isAnimationActive={false}
        >
          <LabelList
            dataKey="compressao28d"
            position="right"
            formatter={(v: number) => num(v, 1)}
            style={{ fill: 'var(--tinta-secundaria)', fontSize: 11 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* --- Dispersão: relação água/ligante x resistência --- */

export function GraficoDispersao({ dados }: { dados: PontoDispersao[] }) {
  const pontos = dados.filter(
    (d) => d.relacaoAguaLigante !== null && d.compressao28d !== null,
  );

  if (pontos.length === 0) {
    return (
      <SemDados>
        Sem formulações com relação água/ligante e resistência aos 28 dias.
      </SemDados>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ScatterChart margin={{ top: 12, right: 18, bottom: 16, left: -6 }}>
        <CartesianGrid stroke="var(--grade)" />
        <XAxis
          type="number"
          dataKey="relacaoAguaLigante"
          name="Relação água/ligante"
          {...EIXO}
          domain={['dataMin - 0.05', 'dataMax + 0.05']}
          tickFormatter={(v: number) => num(v, 2)}
          label={{
            value: 'Relação água/ligante',
            position: 'insideBottom',
            offset: -8,
            style: { fill: 'var(--tinta-suave)', fontSize: 11.5 },
          }}
        />
        <YAxis
          type="number"
          dataKey="compressao28d"
          name="Compressão 28d"
          {...EIXO}
          width={52}
          label={{
            value: 'MPa',
            angle: -90,
            position: 'insideLeft',
            offset: 16,
            style: { fill: 'var(--tinta-suave)', fontSize: 11.5 },
          }}
        />
        <ZAxis range={[70, 70]} />
        <Tooltip
          cursor={{ stroke: 'var(--eixo)', strokeDasharray: '3 3' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0]?.payload as PontoDispersao;
            return (
              <Tip
                titulo={p.nomenclatura}
                linhas={[
                  {
                    cor: CORES[0] as string,
                    rotulo: 'Água/ligante',
                    valor: num(p.relacaoAguaLigante, 3),
                  },
                  {
                    cor: CORES[0] as string,
                    rotulo: 'Compressão 28d',
                    valor: `${num(p.compressao28d, 2)} MPa`,
                  },
                  {
                    cor: 'var(--tinta-suave)',
                    rotulo: 'Retenção de água',
                    valor: p.retencaoAgua === null ? '—' : `${num(p.retencaoAgua, 1)} %`,
                  },
                ]}
              />
            );
          }}
        />
        <Scatter
          data={pontos}
          fill={CORES[0]}
          fillOpacity={0.75}
          stroke="var(--superficie)"
          strokeWidth={2}
          isAnimationActive={false}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

/* --- Distribuição por tipo de projeto --- */

export function GraficoDistribuicao({
  dados,
}: {
  dados: { tipoProjeto: string; total: number }[];
}) {
  if (dados.length === 0) {
    return <SemDados>Nenhuma formulação no filtro atual.</SemDados>;
  }

  // O eixo usa o código curto (NP, MT, …) para não sobrepor rótulos; o nome
  // completo aparece no hover e na legenda abaixo do gráfico.
  const comRotulo = dados.map((d) => ({
    ...d,
    rotulo: tipoProjeto(d.tipoProjeto),
  }));

  return (
    <>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={comRotulo}
          margin={{ top: 18, right: 10, bottom: 4, left: -18 }}
          barCategoryGap={14}
        >
          <CartesianGrid stroke="var(--grade)" vertical={false} />
          <XAxis
            dataKey="tipoProjeto"
            {...EIXO}
            interval={0}
            tick={{ fill: 'var(--tinta-secundaria)', fontSize: 12, fontWeight: 600 }}
          />
          <YAxis {...EIXO} width={44} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: 'var(--grade)', fillOpacity: 0.5 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]?.payload as { rotulo: string; total: number };
              return (
                <Tip
                  titulo={p.rotulo}
                  linhas={[
                    {
                      cor: CORES[0] as string,
                      rotulo: 'Formulações',
                      valor: String(p.total),
                    },
                  ]}
                />
              );
            }}
          />
          <Bar
            dataKey="total"
            fill={CORES[0]}
            radius={[4, 4, 0, 0]}
            maxBarSize={54}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="total"
              position="top"
              style={{ fill: 'var(--tinta-secundaria)', fontSize: 11 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="legenda">
        {comRotulo.map((d) => (
          <span className="legenda-item" key={d.tipoProjeto}>
            <strong style={{ color: 'var(--tinta-primaria)' }}>
              {d.tipoProjeto}
            </strong>
            {d.rotulo}
          </span>
        ))}
      </div>
    </>
  );
}

/* --- Curvas granulométricas --- */

export function GraficoGranulometria({
  curvas,
  zonas,
}: {
  curvas: CurvaGranulometrica[];
  zonas: LimiteZona[];
}) {
  if (curvas.length === 0) {
    return <SemDados>Nenhuma curva granulométrica no filtro atual.</SemDados>;
  }

  /*
   * Eixo x numérico em escala logarítmica, como a curva granulométrica é
   * publicada. Isso permite desenhar no mesmo gráfico as peneiras do ensaio
   * (1,70 · 1,40 · 1,18 · 0,60 · 0,30 · 0,15 · 0,09 mm) e as da NBR 7211
   * (6,3 · 4,75 · 2,36 · 1,18 · 0,60 · 0,30 · 0,15 mm), que só coincidem em
   * parte — num eixo de categorias as faixas normativas ficariam interrompidas.
   *
   * O fundo (0 mm) fica de fora: não tem lugar numa escala log e a retida
   * acumulada nele é 100% por definição, então não informa nada.
   */
  const mms = [
    ...new Set([
      ...zonas.map((z) => z.peneiraMm),
      ...curvas.flatMap((c) => c.pontos.map((p) => p.peneiraMm)),
    ]),
  ]
    .filter((mm) => mm > 0)
    .sort((a, b) => b - a);

  const dados = mms.map((mm) => {
    const zona = zonas.find((z) => z.peneiraMm === mm);
    const linha: Record<string, number | [number, number] | null> = {
      peneiraMm: mm,
      faixaUtilizavel: zona
        ? [zona.utilizavelMin, zona.utilizavelMax]
        : null,
      faixaOtima: zona ? [zona.otimaMin, zona.otimaMax] : null,
    };
    for (const c of curvas) {
      linha[c.formulacaoId] =
        c.pontos.find((p) => p.peneiraMm === mm)?.acumulada ?? null;
    }
    return linha;
  });

  return (
    <>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={dados} margin={{ top: 12, right: 16, bottom: 18, left: -8 }}>
          <CartesianGrid stroke="var(--grade)" vertical={false} />
          <XAxis
            dataKey="peneiraMm"
            type="number"
            scale="log"
            domain={[0.07, 8]}
            ticks={[0.09, 0.15, 0.3, 0.6, 1.18, 2.36, 4.75]}
            tickFormatter={(v: number) => num(v, 2)}
            {...EIXO}
            tick={{ fill: 'var(--tinta-secundaria)', fontSize: 10.5 }}
            label={{
              value: 'Abertura da peneira (mm) — escala logarítmica',
              position: 'insideBottom',
              offset: -10,
              style: { fill: 'var(--tinta-suave)', fontSize: 11 },
            }}
          />
          <YAxis
            {...EIXO}
            width={50}
            domain={[0, 100]}
            label={{
              value: '% retida acumulada',
              angle: -90,
              position: 'insideLeft',
              offset: 18,
              style: { fill: 'var(--tinta-suave)', fontSize: 11 },
            }}
          />
          <Tooltip
            cursor={{ stroke: 'var(--eixo)', strokeWidth: 1 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const daCurva = payload.filter((p) =>
                curvas.some((c) => c.formulacaoId === p.dataKey),
              );
              if (daCurva.length === 0) return null;
              return (
                <Tip
                  titulo={`Peneira ${num(Number(label), 2)} mm`}
                  linhas={daCurva.map((p) => {
                    const i = curvas.findIndex(
                      (c) => c.formulacaoId === p.dataKey,
                    );
                    return {
                      cor: CORES[i % CORES.length] as string,
                      rotulo: curvas[i]?.nomenclatura ?? String(p.dataKey),
                      valor: `${num(p.value as number, 1)} %`,
                    };
                  })}
                />
              );
            }}
          />
          {/* As faixas primeiro, para as curvas ficarem por cima delas. */}
          <Area
            dataKey="faixaUtilizavel"
            stroke="none"
            fill="var(--zona-utilizavel)"
            isAnimationActive={false}
            connectNulls
            activeDot={false}
          />
          <Area
            dataKey="faixaOtima"
            stroke="none"
            fill="var(--zona-otima)"
            isAnimationActive={false}
            connectNulls
            activeDot={false}
          />
          {curvas.map((c, i) => (
            <Line
              key={c.formulacaoId}
              type="monotone"
              dataKey={c.formulacaoId}
              stroke={CORES[i % CORES.length]}
              strokeWidth={2}
              isAnimationActive={false}
              connectNulls
              dot={{ r: 3, strokeWidth: 2, fill: 'var(--superficie)' }}
              activeDot={{ r: 5 }}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
      <Legenda
        itens={[
          { cor: 'var(--zona-otima)', rotulo: 'Zona ótima (NBR 7211)' },
          { cor: 'var(--zona-utilizavel)', rotulo: 'Zona utilizável' },
          ...curvas.map((c, i) => ({
            cor: CORES[i % CORES.length] as string,
            rotulo:
              c.moduloFinura === null
                ? c.nomenclatura
                : `${c.nomenclatura} · MF ${num(c.moduloFinura, 2)}`,
          })),
        ]}
      />
      <p className="nota-grafico">
        MF é o módulo de finura. Das peneiras deste ensaio, só 1,18 · 0,60 · 0,30
        · 0,15 mm são da série normal da NBR NM 248 — o módulo sai mais baixo do
        que num ensaio com a série completa e serve para comparar formulações
        entre si, não com valores de referência da literatura.
      </p>
    </>
  );
}

/* --- Classificação NBR 13281 --- */

const FAMILIAS = [
  {
    chave: 'compressao' as const,
    rotulo: 'Resistência à compressão',
    unidade: 'MPa',
  },
  {
    chave: 'densidade' as const,
    rotulo: 'Densidade no estado fresco',
    unidade: 'kg/m³',
  },
  { chave: 'retencao' as const, rotulo: 'Retenção de água', unidade: '%' },
];

/** Texto da faixa de uma classe, como a norma a define. */
function faixaTexto(
  min: number | null,
  max: number | null,
  unidade: string,
): string {
  if (min === null && max !== null) return `≤ ${num(max, 0)} ${unidade}`;
  if (max === null && min !== null) return `> ${num(min, 0)} ${unidade}`;
  return `${num(min, 0)} a ${num(max, 0)} ${unidade}`;
}

export function GraficoClassificacao({
  dados,
  familia,
}: {
  dados: Classificacao;
  familia: 'compressao' | 'densidade' | 'retencao';
}) {
  const info = FAMILIAS.find((f) => f.chave === familia);
  const bloco: FamiliaClasses = dados[familia];

  if (bloco.classes.every((c) => c.total === 0)) {
    return <SemDados>Nenhuma formulação classificável no filtro atual.</SemDados>;
  }

  const maior = Math.max(...bloco.classes.map((c) => c.total));

  return (
    <>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={bloco.classes}
          margin={{ top: 18, right: 10, bottom: 4, left: -18 }}
          barCategoryGap={12}
        >
          <CartesianGrid stroke="var(--grade)" vertical={false} />
          <XAxis
            dataKey="codigo"
            {...EIXO}
            interval={0}
            tick={{
              fill: 'var(--tinta-secundaria)',
              fontSize: 12,
              fontWeight: 600,
            }}
          />
          <YAxis {...EIXO} width={44} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: 'var(--grade)', fillOpacity: 0.5 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const c = payload[0]?.payload as {
                codigo: string;
                min: number | null;
                max: number | null;
                total: number;
              };
              return (
                <Tip
                  titulo={`Classe ${c.codigo}`}
                  linhas={[
                    {
                      cor: CORES[0] as string,
                      rotulo: 'Formulações',
                      valor: String(c.total),
                    },
                    {
                      cor: 'var(--tinta-suave)',
                      rotulo: 'Faixa da norma',
                      valor: faixaTexto(c.min, c.max, info?.unidade ?? ''),
                    },
                  ]}
                />
              );
            }}
          />
          <Bar
            dataKey="total"
            radius={[4, 4, 0, 0]}
            maxBarSize={54}
            isAnimationActive={false}
          >
            {/* A classe mais povoada ganha destaque; as outras ficam discretas. */}
            {bloco.classes.map((c) => (
              <Cell
                key={c.codigo}
                fill={c.total === maior ? CORES[0] : 'var(--serie-1-suave)'}
              />
            ))}
            <LabelList
              dataKey="total"
              position="top"
              style={{ fill: 'var(--tinta-secundaria)', fontSize: 11 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="nota-grafico">
        {bloco.semDado > 0
          ? `${bloco.semDado} formulação(ões) sem o ensaio, fora da classificação. `
          : ''}
        Faixas da NBR 13281 se sobrepõem; adotamos a classe mais alta que o valor
        alcança.
      </p>
    </>
  );
}

/* --- Correlação entre ensaios, com reta de tendência --- */

export function GraficoCorrelacao({
  dados,
  rotuloX,
  rotuloY,
  unidadeX,
  unidadeY,
  casasY = 2,
}: {
  dados: Correlacao;
  rotuloX: string;
  rotuloY: string;
  unidadeX: string;
  unidadeY: string;
  casasY?: number;
}) {
  if (dados.pontos.length === 0) {
    return <SemDados>Sem formulações com os dois ensaios preenchidos.</SemDados>;
  }

  const xs = dados.pontos.map((p) => p.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);

  // Dois pontos bastam para desenhar a reta de mínimos quadrados.
  const reta = dados.regressao
    ? [
        { x: minX, y: dados.regressao.a * minX + dados.regressao.b },
        { x: maxX, y: dados.regressao.a * maxX + dados.regressao.b },
      ]
    : [];

  return (
    <>
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 12, right: 18, bottom: 18, left: -6 }}>
          <CartesianGrid stroke="var(--grade)" />
          <XAxis
            type="number"
            dataKey="x"
            {...EIXO}
            domain={['dataMin - 0.4', 'dataMax + 0.4']}
            tickFormatter={(v: number) => num(v, 1)}
            label={{
              value: `${rotuloX} (${unidadeX})`,
              position: 'insideBottom',
              offset: -10,
              style: { fill: 'var(--tinta-suave)', fontSize: 11 },
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            {...EIXO}
            width={58}
            tickFormatter={(v: number) => num(v, casasY === 0 ? 0 : 1)}
            label={{
              value: unidadeY,
              angle: -90,
              position: 'insideLeft',
              offset: 20,
              style: { fill: 'var(--tinta-suave)', fontSize: 11 },
            }}
          />
          <ZAxis range={[70, 70]} />
          <Tooltip
            cursor={{ stroke: 'var(--eixo)', strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]?.payload as PontoCorrelacao;
              if (!p?.nomenclatura) return null;
              return (
                <Tip
                  titulo={p.nomenclatura}
                  linhas={[
                    {
                      cor: CORES[0] as string,
                      rotulo: rotuloX,
                      valor: `${num(p.x, 2)} ${unidadeX}`,
                    },
                    {
                      cor: CORES[1] as string,
                      rotulo: rotuloY,
                      valor: `${num(p.y, casasY)} ${unidadeY}`,
                    },
                    {
                      cor: 'var(--tinta-suave)',
                      rotulo: 'Tipo de projeto',
                      valor: tipoProjeto(p.tipoProjeto),
                    },
                  ]}
                />
              );
            }}
          />
          <Scatter
            data={dados.pontos}
            fill={CORES[0]}
            fillOpacity={0.72}
            stroke="var(--superficie)"
            strokeWidth={2}
            isAnimationActive={false}
          />
          {reta.length === 2 ? (
            <Scatter
              data={reta}
              line={{ stroke: CORES[1], strokeWidth: 2, strokeDasharray: '5 4' }}
              shape={() => <g />}
              legendType="none"
              isAnimationActive={false}
            />
          ) : null}
        </ScatterChart>
      </ResponsiveContainer>
      <p className="nota-grafico">
        {dados.regressao ? (
          <>
            Tendência: y = {num(dados.regressao.a, 3)}·x{' '}
            {dados.regressao.b >= 0 ? '+' : '−'}{' '}
            {num(Math.abs(dados.regressao.b), 3)} · R² ={' '}
            <strong>{num(dados.regressao.r2, 3)}</strong> · n ={' '}
            {dados.regressao.n}
          </>
        ) : (
          'Pontos insuficientes para uma reta de tendência.'
        )}
      </p>
    </>
  );
}

/* --- Squeeze-flow: carga x deslocamento --- */

export function GraficoSqueezeFlow({ dados }: { dados: PontoSqueeze[] }) {
  const pontos = dados.filter(
    (d) => d.deslocamento !== null && d.carga !== null,
  );

  if (pontos.length === 0) {
    return <SemDados>Nenhum ensaio de squeeze-flow no filtro atual.</SemDados>;
  }

  return (
    <>
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 12, right: 18, bottom: 18, left: -6 }}>
          <CartesianGrid stroke="var(--grade)" />
          <XAxis
            type="number"
            dataKey="deslocamento"
            {...EIXO}
            domain={['dataMin - 0.5', 'dataMax + 0.5']}
            tickFormatter={(v: number) => num(v, 1)}
            label={{
              value: 'Deslocamento (mm)',
              position: 'insideBottom',
              offset: -10,
              style: { fill: 'var(--tinta-suave)', fontSize: 11 },
            }}
          />
          <YAxis
            type="number"
            dataKey="carga"
            {...EIXO}
            width={54}
            label={{
              value: 'Carga (N)',
              angle: -90,
              position: 'insideLeft',
              offset: 18,
              style: { fill: 'var(--tinta-suave)', fontSize: 11 },
            }}
          />
          <ZAxis range={[70, 70]} />
          <Tooltip
            cursor={{ stroke: 'var(--eixo)', strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]?.payload as PontoSqueeze;
              if (!p?.nomenclatura) return null;
              return (
                <Tip
                  titulo={p.nomenclatura}
                  linhas={[
                    {
                      cor: CORES[0] as string,
                      rotulo: 'Deslocamento',
                      valor: `${num(p.deslocamento, 2)} mm`,
                    },
                    {
                      cor: CORES[1] as string,
                      rotulo: 'Carga',
                      valor: `${num(p.carga, 2)} N`,
                    },
                    {
                      cor: 'var(--tinta-suave)',
                      rotulo: 'Repetições',
                      valor: String(p.repeticoes.length),
                    },
                  ]}
                />
              );
            }}
          />
          <Scatter
            data={pontos}
            fill={CORES[2]}
            fillOpacity={0.72}
            stroke="var(--superficie)"
            strokeWidth={2}
            isAnimationActive={false}
          />
        </ScatterChart>
      </ResponsiveContainer>
      <p className="nota-grafico">
        Cada ponto é a média das três repetições do ensaio (NBR 15839). A
        planilha registra só o par carga/deslocamento de cada repetição, não a
        curva completa — por isso não há aqui os três estágios (elástico,
        plástico e enrijecimento) da curva de squeeze-flow.
      </p>
    </>
  );
}

/* --- Resistência média com desvio padrão entre corpos de prova --- */

export function GraficoDispersaoIdade({ dados }: { dados: DispersaoIdade[] }) {
  const comValores = dados.filter(
    (d) => d.compressao !== null || d.flexao !== null,
  );

  if (comValores.length === 0) {
    return <SemDados>Nenhum ensaio de resistência no filtro atual.</SemDados>;
  }

  return (
    <>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={comValores}
          margin={{ top: 16, right: 12, bottom: 4, left: -16 }}
          barCategoryGap={18}
        >
          <CartesianGrid stroke="var(--grade)" vertical={false} />
          <XAxis
            dataKey="idadeDias"
            {...EIXO}
            tickFormatter={(v: number) => `${v}d`}
            tick={{ fill: 'var(--tinta-secundaria)', fontSize: 12, fontWeight: 600 }}
          />
          <YAxis
            {...EIXO}
            width={50}
            label={{
              value: 'MPa',
              angle: -90,
              position: 'insideLeft',
              offset: 18,
              style: { fill: 'var(--tinta-suave)', fontSize: 11.5 },
            }}
          />
          <Tooltip
            cursor={{ fill: 'var(--grade)', fillOpacity: 0.5 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload as DispersaoIdade;
              return (
                <Tip
                  titulo={`${d.idadeDias} dias`}
                  linhas={[
                    {
                      cor: CORES[0] as string,
                      rotulo: 'Compressão',
                      valor: `${num(d.compressao, 2)} ± ${num(d.compressaoDesvio, 2)} MPa`,
                    },
                    {
                      cor: CORES[1] as string,
                      rotulo: 'Flexão',
                      valor: `${num(d.flexao, 2)} ± ${num(d.flexaoDesvio, 2)} MPa`,
                    },
                    {
                      cor: 'var(--tinta-suave)',
                      rotulo: 'Corpos de prova',
                      valor: `${d.corposCompressao} + ${d.corposFlexao}`,
                    },
                  ]}
                />
              );
            }}
          />
          <Bar
            dataKey="compressao"
            fill={CORES[0]}
            radius={[4, 4, 0, 0]}
            maxBarSize={46}
            isAnimationActive={false}
          >
            <ErrorBar
              dataKey="compressaoDesvio"
              width={5}
              strokeWidth={1.5}
              stroke="var(--tinta-secundaria)"
            />
          </Bar>
          <Bar
            dataKey="flexao"
            fill={CORES[1]}
            radius={[4, 4, 0, 0]}
            maxBarSize={46}
            isAnimationActive={false}
          >
            <ErrorBar
              dataKey="flexaoDesvio"
              width={5}
              strokeWidth={1.5}
              stroke="var(--tinta-secundaria)"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <Legenda
        itens={[
          { cor: CORES[0] as string, rotulo: 'Compressão' },
          { cor: CORES[1] as string, rotulo: 'Tração na flexão' },
        ]}
      />
      <p className="nota-grafico">
        A barra vertical é o desvio padrão entre todos os corpos de prova do
        filtro — a média sozinha esconde a variabilidade do ensaio.
      </p>
    </>
  );
}
