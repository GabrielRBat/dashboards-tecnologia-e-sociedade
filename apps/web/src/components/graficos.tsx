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
  Bar,
  BarChart,
  CartesianGrid,
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
  CurvaGranulometrica,
  ItemComparativo,
  PontoDispersao,
  PontoEvolucao,
} from '@/lib/api';
import { num, peneira, tipoProjeto } from '@/lib/formato';

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

/* --- Ranking de formulações aos 28 dias --- */

export function GraficoComparativo({ dados }: { dados: ItemComparativo[] }) {
  if (dados.length === 0) {
    return <SemDados>Nenhuma formulação com resistência aos 28 dias.</SemDados>;
  }

  const altura = Math.max(240, dados.length * 26 + 40);

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart
        data={dados}
        layout="vertical"
        margin={{ top: 4, right: 46, bottom: 4, left: 8 }}
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
          dataKey="nomenclatura"
          {...EIXO}
          width={190}
          tick={{ fill: 'var(--tinta-secundaria)', fontSize: 11.5 }}
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
}: {
  curvas: CurvaGranulometrica[];
}) {
  if (curvas.length === 0) {
    return <SemDados>Nenhuma curva granulométrica no filtro atual.</SemDados>;
  }

  // Uma linha por formulação, com as peneiras da maior para a menor.
  const peneiras = curvas[0]?.pontos.map((p) => p.peneiraMm) ?? [];
  const dados = peneiras.map((mm) => {
    const linha: Record<string, number | string> = { peneira: peneira(mm) };
    for (const c of curvas) {
      const ponto = c.pontos.find((p) => p.peneiraMm === mm);
      linha[c.formulacaoId] = ponto?.frequencia ?? 0;
    }
    return linha;
  });

  return (
    <>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={dados} margin={{ top: 12, right: 16, bottom: 4, left: -8 }}>
          <CartesianGrid stroke="var(--grade)" vertical={false} />
          <XAxis dataKey="peneira" {...EIXO} interval={0} tick={{ fill: 'var(--tinta-secundaria)', fontSize: 10.5 }} />
          <YAxis
            {...EIXO}
            width={50}
            label={{
              value: '%',
              angle: -90,
              position: 'insideLeft',
              offset: 18,
              style: { fill: 'var(--tinta-suave)', fontSize: 11.5 },
            }}
          />
          <Tooltip
            cursor={{ stroke: 'var(--eixo)', strokeWidth: 1 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <Tip
                  titulo={String(label)}
                  linhas={payload.map((p, i) => ({
                    cor: CORES[i % CORES.length] as string,
                    rotulo:
                      curvas.find((c) => c.formulacaoId === p.dataKey)
                        ?.nomenclatura ?? String(p.dataKey),
                    valor: `${num(p.value as number, 1)} %`,
                  }))}
                />
              ) : null
            }
          />
          {curvas.map((c, i) => (
            <Line
              key={c.formulacaoId}
              type="monotone"
              dataKey={c.formulacaoId}
              stroke={CORES[i % CORES.length]}
              strokeWidth={2}
              isAnimationActive={false}
              dot={{ r: 3.5, strokeWidth: 2, fill: 'var(--superficie)' }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      {/* Uma única curva dispensa legenda — o título do cartão já a nomeia. */}
      {curvas.length > 1 ? (
        <Legenda
          itens={curvas.map((c, i) => ({
            cor: CORES[i % CORES.length] as string,
            rotulo: c.nomenclatura,
          }))}
        />
      ) : null}
    </>
  );
}
