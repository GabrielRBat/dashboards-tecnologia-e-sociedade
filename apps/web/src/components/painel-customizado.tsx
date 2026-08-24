'use client';

/**
 * Desenha um painel montado pelo usuário.
 *
 * Os três tipos vêm do catálogo da API, que já garantiu que o cruzamento faz
 * sentido. Aqui só resta escolher a forma certa para cada um e deixar visível o
 * que o número esconde: quantas formulações ficaram de fora por falta de ensaio,
 * e a ressalva quando o cruzamento é legítimo mas precisa de leitura cuidadosa.
 */

import {
  Bar,
  BarChart,
  CartesianGrid,
  ErrorBar,
  LabelList,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import type { PainelCalculado } from '@/lib/api';
import { num, tipoProjeto } from '@/lib/formato';

const CORES = ['var(--serie-1)', 'var(--serie-2)', 'var(--serie-3)'];

const EIXO = {
  stroke: 'var(--eixo)',
  tick: { fill: 'var(--tinta-suave)', fontSize: 11.5 },
  tickLine: false,
};

function Tip({
  titulo,
  linhas,
}: {
  titulo: string;
  linhas: { cor: string; rotulo: string; valor: string }[];
}) {
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

/** Rótulo do eixo com a unidade, quando há uma. */
const comUnidade = (rotulo: string, unidade: string): string =>
  unidade ? `${rotulo} (${unidade})` : rotulo;

export function PainelCustomizado({ painel }: { painel: PainelCalculado }) {
  const rodape = (
    <>
      {painel.alerta ? (
        <p className="nota-grafico nota-alerta">
          <strong>Atenção:</strong> {painel.alerta}
        </p>
      ) : null}
      {painel.semDado > 0 ? (
        <p className="nota-grafico">
          {painel.semDado} formulação(ões) sem o ensaio, fora deste gráfico.
        </p>
      ) : null}
    </>
  );

  if (painel.tipo === 'dispersao') {
    const pontos = painel.pontos ?? [];
    if (pontos.length === 0) {
      return <div className="sem-dados">Nenhuma formulação com os dois ensaios.</div>;
    }

    const xs = pontos.map((p) => p.x);
    const r = painel.regressao;
    const reta = r
      ? [
          { x: Math.min(...xs), y: r.a * Math.min(...xs) + r.b },
          { x: Math.max(...xs), y: r.a * Math.max(...xs) + r.b },
        ]
      : [];

    return (
      <>
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ top: 12, right: 18, bottom: 20, left: -4 }}>
            <CartesianGrid stroke="var(--grade)" />
            <XAxis
              type="number"
              dataKey="x"
              {...EIXO}
              domain={['dataMin', 'dataMax']}
              tickFormatter={(v: number) => num(v, painel.eixoX.casas > 2 ? 2 : 1)}
              label={{
                value: comUnidade(painel.eixoX.rotulo, painel.eixoX.unidade),
                position: 'insideBottom',
                offset: -12,
                style: { fill: 'var(--tinta-suave)', fontSize: 11 },
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              {...EIXO}
              width={62}
              tickFormatter={(v: number) => num(v, painel.eixoY?.casas === 0 ? 0 : 1)}
              label={{
                value: painel.eixoY?.unidade || painel.eixoY?.rotulo,
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
                const p = payload[0]?.payload as (typeof pontos)[number];
                if (!p?.nomenclatura) return null;
                return (
                  <Tip
                    titulo={p.nomenclatura}
                    linhas={[
                      {
                        cor: CORES[0] as string,
                        rotulo: painel.eixoX.rotulo,
                        valor: `${num(p.x, painel.eixoX.casas)} ${painel.eixoX.unidade}`.trim(),
                      },
                      {
                        cor: CORES[1] as string,
                        rotulo: painel.eixoY?.rotulo ?? '',
                        valor: `${num(p.y, painel.eixoY?.casas ?? 2)} ${painel.eixoY?.unidade ?? ''}`.trim(),
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
              data={pontos}
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
          {r ? (
            <>
              R² = <strong>{num(r.r2, 3)}</strong> · n = {r.n} ·{' '}
              {leituraR2(r.r2)}
            </>
          ) : (
            'Pontos insuficientes para uma reta de tendência.'
          )}
        </p>
        {rodape}
      </>
    );
  }

  // Barras e distribuição desenham a mesma forma; muda o que cada barra conta.
  const barras = painel.barras ?? [];
  if (barras.length === 0) {
    return <div className="sem-dados">Sem dados para este recorte.</div>;
  }

  const contagem = painel.tipo === 'distribuicao';
  const unidade = contagem ? '' : (painel.eixoY?.unidade ?? '');
  const casas = contagem ? 0 : (painel.eixoY?.casas ?? 2);

  return (
    <>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={barras}
          margin={{ top: 18, right: 12, bottom: 20, left: -14 }}
          barCategoryGap={12}
        >
          <CartesianGrid stroke="var(--grade)" vertical={false} />
          <XAxis
            dataKey="categoria"
            {...EIXO}
            interval={0}
            angle={barras.length > 6 ? -30 : 0}
            textAnchor={barras.length > 6 ? 'end' : 'middle'}
            height={barras.length > 6 ? 60 : 30}
            tick={{ fill: 'var(--tinta-secundaria)', fontSize: 11 }}
            label={
              barras.length > 6
                ? undefined
                : {
                    value: comUnidade(painel.eixoX.rotulo, painel.eixoX.unidade),
                    position: 'insideBottom',
                    offset: -12,
                    style: { fill: 'var(--tinta-suave)', fontSize: 11 },
                  }
            }
          />
          <YAxis
            {...EIXO}
            width={56}
            allowDecimals={!contagem}
            label={{
              value: contagem ? 'Formulações' : unidade,
              angle: -90,
              position: 'insideLeft',
              offset: 18,
              style: { fill: 'var(--tinta-suave)', fontSize: 11 },
            }}
          />
          <Tooltip
            cursor={{ fill: 'var(--grade)', fillOpacity: 0.5 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const b = payload[0]?.payload as (typeof barras)[number];
              const linhas = [
                {
                  cor: CORES[0] as string,
                  rotulo: contagem ? 'Formulações' : (painel.eixoY?.rotulo ?? ''),
                  valor: `${num(b.valor, casas)} ${unidade}`.trim(),
                },
              ];
              if (!contagem) {
                linhas.push({
                  cor: 'var(--tinta-suave)',
                  rotulo: 'Formulações no grupo',
                  valor: String(b.formulacoes),
                });
              }
              if (b.desvio !== null) {
                linhas.push({
                  cor: 'var(--tinta-suave)',
                  rotulo: 'Desvio padrão',
                  valor: `${num(b.desvio, casas)} ${unidade}`.trim(),
                });
              }
              return <Tip titulo={b.categoria} linhas={linhas} />;
            }}
          />
          <Bar
            dataKey="valor"
            fill={CORES[0]}
            radius={[4, 4, 0, 0]}
            maxBarSize={56}
            isAnimationActive={false}
          >
            {/* Média sem dispersão engana; a barra de erro vem junto. */}
            {painel.agregacao === 'media' ? (
              <ErrorBar
                dataKey="desvio"
                width={5}
                strokeWidth={1.5}
                stroke="var(--tinta-secundaria)"
              />
            ) : null}
            <LabelList
              dataKey="valor"
              position="top"
              formatter={(v: number) => num(v, casas)}
              style={{ fill: 'var(--tinta-secundaria)', fontSize: 11 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {rodape}
    </>
  );
}

/**
 * Traduz o R² em palavras.
 *
 * O número sozinho leva a superinterpretar: 0,3 parece "alguma coisa" e não é.
 * E vale lembrar sempre que relação não é causa — são formulações diferentes,
 * não o mesmo material sob variação controlada.
 */
function leituraR2(r2: number): string {
  if (r2 >= 0.7) return 'as duas medidas andam juntas de forma consistente';
  if (r2 >= 0.4) return 'há relação, mas com bastante dispersão';
  if (r2 >= 0.15) return 'relação fraca — pouco confiável para prever';
  return 'praticamente sem relação entre as duas medidas';
}
