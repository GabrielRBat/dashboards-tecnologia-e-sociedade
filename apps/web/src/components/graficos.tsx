'use client';

/**
 * Gráficos do dashboard.
 *
 * Regras aplicadas: uma escala por eixo (nunca dois eixos y), cores de série em
 * ordem fixa, marcas finas com grade discreta, legenda sempre que há duas ou
 * mais séries, camada de hover em todos os gráficos e rótulos diretos no ponto
 * final das linhas. Cada eixo traz o nome da grandeza medida (e a unidade), para
 * o gráfico dizer sozinho a que ensaio se refere. As cores vêm de variáveis CSS,
 * então o modo escuro troca os passos da paleta sem trocar de gráfico.
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
  CurvaEvolucao,
  CurvaGranulometrica,
  DensidadeProduto,
  DispersaoIdade,
  FamiliaClasses,
  Formulacao,
  ItemComparativo,
  LimiteZona,
  PontoCorrelacao,
  PontoDispersao,
  PontoEvolucao,
  PontoSqueeze,
  VariacaoTemporal,
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
      <ResponsiveContainer width="100%" height={270}>
        <LineChart
          data={comValores}
          margin={{ top: 12, right: 44, bottom: 20, left: 2 }}
        >
          <CartesianGrid stroke="var(--grade)" vertical={false} />
          <XAxis
            dataKey="idadeDias"
            {...EIXO}
            tickFormatter={(v: number) => `${v}d`}
            label={{
              value: 'Idade do ensaio (dias)',
              position: 'insideBottom',
              offset: -12,
              style: { fill: 'var(--tinta-suave)', fontSize: 11 },
            }}
          />
          <YAxis
            {...EIXO}
            width={58}
            label={{
              value: 'Resistência (MPa)',
              angle: -90,
              position: 'insideLeft',
              offset: 16,
              style: { fill: 'var(--tinta-suave)', fontSize: 11 },
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

  const altura = Math.max(250, dados.length * (estreita ? 30 : 26) + 48);

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart
        data={comRotulo}
        layout="vertical"
        margin={{ top: 4, right: estreita ? 34 : 46, bottom: 20, left: 8 }}
        barCategoryGap={6}
      >
        <CartesianGrid stroke="var(--grade)" horizontal={false} />
        <XAxis
          type="number"
          {...EIXO}
          label={{
            value: 'Resistência à compressão aos 28 dias (MPa)',
            position: 'insideBottom',
            offset: -12,
            style: { fill: 'var(--tinta-suave)', fontSize: 11 },
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
      <ScatterChart margin={{ top: 12, right: 18, bottom: 20, left: 2 }}>
        <CartesianGrid stroke="var(--grade)" />
        <XAxis
          type="number"
          dataKey="relacaoAguaLigante"
          name="Relação água/ligante"
          {...EIXO}
          domain={['dataMin - 0.05', 'dataMax + 0.05']}
          tickFormatter={(v: number) => num(v, 2)}
          label={{
            value: 'Relação água/ligante (a/l)',
            position: 'insideBottom',
            offset: -12,
            style: { fill: 'var(--tinta-suave)', fontSize: 11 },
          }}
        />
        <YAxis
          type="number"
          dataKey="compressao28d"
          name="Compressão 28d"
          {...EIXO}
          width={58}
          label={{
            value: 'Resistência à compressão (MPa)',
            angle: -90,
            position: 'insideLeft',
            offset: 16,
            style: { fill: 'var(--tinta-suave)', fontSize: 11 },
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
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={comRotulo}
          margin={{ top: 18, right: 10, bottom: 20, left: 2 }}
          barCategoryGap={14}
        >
          <CartesianGrid stroke="var(--grade)" vertical={false} />
          <XAxis
            dataKey="tipoProjeto"
            {...EIXO}
            interval={0}
            tick={{ fill: 'var(--tinta-secundaria)', fontSize: 12, fontWeight: 600 }}
            label={{
              value: 'Tipo de projeto',
              position: 'insideBottom',
              offset: -12,
              style: { fill: 'var(--tinta-suave)', fontSize: 11 },
            }}
          />
          <YAxis
            {...EIXO}
            width={52}
            allowDecimals={false}
            label={{
              value: 'Quantidade de formulações',
              angle: -90,
              position: 'insideLeft',
              offset: 16,
              style: { fill: 'var(--tinta-suave)', fontSize: 11 },
            }}
          />
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

/* --- Gestão: produtos por responsável --- */

export function GraficoResponsaveis({
  dados,
}: {
  dados: {
    responsavel: string;
    desenvolvidas: number;
    alimentadas: number;
    avaliadas: number;
  }[];
}) {
  const estreita = useTelaEstreita();
  if (dados.length === 0) {
    return <SemDados>Nenhum responsável no filtro atual.</SemDados>;
  }

  return (
    <>
      <ResponsiveContainer
        width="100%"
        height={Math.max(270, dados.length * 34 + 54)}
      >
        <BarChart
          data={dados}
          layout="vertical"
          margin={{ top: 6, right: 18, bottom: 20, left: 4 }}
          barCategoryGap={6}
        >
          <CartesianGrid stroke="var(--grade)" horizontal={false} />
          <XAxis
            type="number"
            {...EIXO}
            allowDecimals={false}
            label={{
              value: 'Quantidade de produtos',
              position: 'insideBottom',
              offset: -12,
              style: { fill: 'var(--tinta-suave)', fontSize: 11 },
            }}
          />
          <YAxis
            type="category"
            dataKey="responsavel"
            {...EIXO}
            width={estreita ? 78 : 112}
            tick={{ fill: 'var(--tinta-secundaria)', fontSize: 11 }}
          />
          <Tooltip
            cursor={{ fill: 'var(--grade)', fillOpacity: 0.5 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <Tip
                  titulo={String(label)}
                  linhas={payload.map((p, i) => ({
                    cor: CORES[i] as string,
                    rotulo:
                      p.dataKey === 'desenvolvidas'
                        ? 'Desenvolveu'
                        : p.dataKey === 'alimentadas'
                          ? 'Alimentou a planilha'
                          : 'Avaliou',
                    valor: String(p.value ?? 0),
                  }))}
                />
              ) : null
            }
          />
          <Bar dataKey="desenvolvidas" fill={CORES[0]} isAnimationActive={false} />
          <Bar dataKey="alimentadas" fill={CORES[1]} isAnimationActive={false} />
          <Bar dataKey="avaliadas" fill={CORES[2]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
      <Legenda
        itens={[
          { cor: CORES[0] as string, rotulo: 'Desenvolvedor' },
          { cor: CORES[1] as string, rotulo: 'Alimentador da planilha' },
          { cor: CORES[2] as string, rotulo: 'Avaliador' },
        ]}
      />
    </>
  );
}

/* --- Gestão: registros por mês --- */

export function GraficoRegistrosPorMes({
  dados,
}: {
  dados: { mes: string; total: number }[];
}) {
  if (dados.length === 0) {
    return <SemDados>Nenhum registro com data no filtro atual.</SemDados>;
  }

  const formatarMes = (mes: string) => {
    const [ano, numeroMes] = mes.split('-').map(Number);
    return new Intl.DateTimeFormat('pt-BR', {
      month: 'short',
      year: '2-digit',
      timeZone: 'UTC',
    })
      .format(new Date(Date.UTC(ano as number, (numeroMes as number) - 1, 1)))
      .replace('.', '');
  };

  return (
    <ResponsiveContainer width="100%" height={270}>
      <BarChart data={dados} margin={{ top: 18, right: 10, bottom: 24, left: 2 }}>
        <CartesianGrid stroke="var(--grade)" vertical={false} />
        <XAxis
          dataKey="mes"
          {...EIXO}
          tickFormatter={formatarMes}
          interval="preserveStartEnd"
          angle={-30}
          textAnchor="end"
          height={52}
          label={{
            value: 'Mês de cadastro',
            position: 'insideBottom',
            offset: -18,
            style: { fill: 'var(--tinta-suave)', fontSize: 11 },
          }}
        />
        <YAxis
          {...EIXO}
          width={52}
          allowDecimals={false}
          label={{
            value: 'Registros',
            angle: -90,
            position: 'insideLeft',
            offset: 16,
            style: { fill: 'var(--tinta-suave)', fontSize: 11 },
          }}
        />
        <Tooltip
          cursor={{ fill: 'var(--grade)', fillOpacity: 0.5 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const ponto = payload[0]?.payload as { mes: string; total: number };
            return (
              <Tip
                titulo={formatarMes(ponto.mes)}
                linhas={[
                  {
                    cor: CORES[0] as string,
                    rotulo: 'Produtos cadastrados',
                    valor: String(ponto.total),
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
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* --- Análise técnica: densidades por produto --- */

export function GraficoDensidadesProduto({
  dados,
}: {
  dados: DensidadeProduto[];
}) {
  const estreita = useTelaEstreita();
  if (dados.length === 0) {
    return <SemDados>Nenhuma densidade no filtro atual.</SemDados>;
  }
  const comRotulo = dados.map((d) => ({
    ...d,
    rotulo: estreita ? encurtar(d.nomenclatura, 14) : d.nomenclatura,
  }));

  return (
    <>
      <ResponsiveContainer
        width="100%"
        height={Math.max(310, dados.length * 48 + 56)}
      >
        <BarChart
          data={comRotulo}
          layout="vertical"
          margin={{ top: 6, right: 18, bottom: 20, left: 6 }}
          barCategoryGap={5}
        >
          <CartesianGrid stroke="var(--grade)" horizontal={false} />
          <XAxis
            type="number"
            {...EIXO}
            domain={['dataMin - 100', 'dataMax + 100']}
            label={{
              value: 'Densidade (kg/m³)',
              position: 'insideBottom',
              offset: -12,
              style: { fill: 'var(--tinta-suave)', fontSize: 11 },
            }}
          />
          <YAxis
            type="category"
            dataKey="rotulo"
            {...EIXO}
            width={estreita ? 104 : 190}
            tick={{ fill: 'var(--tinta-secundaria)', fontSize: 11 }}
          />
          <Tooltip
            cursor={{ fill: 'var(--grade)', fillOpacity: 0.5 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const ponto = payload[0]?.payload as DensidadeProduto;
              return (
                <Tip
                  titulo={ponto.nomenclatura}
                  linhas={[
                    { cor: CORES[0] as string, rotulo: 'Aparente', valor: `${num(ponto.aparente, 0)} kg/m³` },
                    { cor: CORES[1] as string, rotulo: 'Fresca', valor: `${num(ponto.fresca, 0)} kg/m³` },
                    { cor: CORES[2] as string, rotulo: 'Endurecida 14d', valor: `${num(ponto.endurecida14, 0)} kg/m³` },
                    { cor: CORES[3] as string, rotulo: 'Endurecida 28d', valor: `${num(ponto.endurecida28, 0)} kg/m³` },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="aparente" fill={CORES[0]} isAnimationActive={false} />
          <Bar dataKey="fresca" fill={CORES[1]} isAnimationActive={false} />
          <Bar dataKey="endurecida14" fill={CORES[2]} isAnimationActive={false} />
          <Bar dataKey="endurecida28" fill={CORES[3]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
      <Legenda
        itens={[
          { cor: CORES[0] as string, rotulo: 'Aparente' },
          { cor: CORES[1] as string, rotulo: 'Estado fresco' },
          { cor: CORES[2] as string, rotulo: 'Endurecida aos 14 dias' },
          { cor: CORES[3] as string, rotulo: 'Endurecida aos 28 dias' },
        ]}
      />
    </>
  );
}

/* --- Análise técnica: variação dimensional ou de massa --- */

export function GraficoVariacaoTemporal({
  dados,
  metrica,
}: {
  dados: VariacaoTemporal[];
  metrica: 'dimensional' | 'massa';
}) {
  const chaveDesvio =
    metrica === 'dimensional' ? 'dimensionalDesvio' : 'massaDesvio';
  const comValores = dados.filter((d) => d[metrica] !== null);
  if (comValores.length === 0) {
    return <SemDados>Nenhum ensaio de variação no filtro atual.</SemDados>;
  }
  const unidade = metrica === 'dimensional' ? 'mm/m' : '%';
  const rotulo = metrica === 'dimensional' ? 'Variação dimensional' : 'Variação de massa';

  return (
    <ResponsiveContainer width="100%" height={270}>
      <BarChart data={comValores} margin={{ top: 18, right: 12, bottom: 20, left: 4 }}>
        <CartesianGrid stroke="var(--grade)" vertical={false} />
        <XAxis
          dataKey="idadeDias"
          {...EIXO}
          tickFormatter={(v: number) => `${v}d`}
          label={{
            value: 'Idade do ensaio (dias)',
            position: 'insideBottom',
            offset: -12,
            style: { fill: 'var(--tinta-suave)', fontSize: 11 },
          }}
        />
        <YAxis
          {...EIXO}
          width={60}
          label={{
            value: `${rotulo} (${unidade})`,
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
            const ponto = payload[0]?.payload as VariacaoTemporal;
            const desvio = ponto[chaveDesvio];
            return (
              <Tip
                titulo={`${ponto.idadeDias} dias`}
                linhas={[
                  {
                    cor: CORES[0] as string,
                    rotulo,
                    valor: `${num(ponto[metrica], 3)} ± ${num(desvio, 3)} ${unidade}`,
                  },
                  {
                    cor: 'var(--tinta-suave)',
                    rotulo: 'Corpos de prova',
                    valor: String(
                      metrica === 'dimensional'
                        ? ponto.corposDimensionais
                        : ponto.corposMassa,
                    ),
                  },
                ]}
              />
            );
          }}
        />
        <Bar
          dataKey={metrica}
          fill={CORES[0]}
          radius={[4, 4, 0, 0]}
          maxBarSize={54}
          isAnimationActive={false}
        >
          <ErrorBar
            dataKey={chaveDesvio}
            width={6}
            strokeWidth={1.5}
            stroke="var(--tinta-secundaria)"
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Curvas de variação das formulações escolhidas na comparação. */
export function GraficoVariacaoComparativo({
  formulacoes,
  metrica,
}: {
  formulacoes: Formulacao[];
  metrica: 'dimensionalMedia' | 'massaMedia';
}) {
  const idades = [1, 7, 28];
  const dados = idades.map((idadeDias) => {
    const linha: Record<string, number | null> = { idadeDias };
    for (const f of formulacoes) {
      linha[f.id] =
        f.variacoes.find((v) => v.idadeDias === idadeDias)?.[metrica] ?? null;
    }
    return linha;
  });
  if (!formulacoes.some((f) => f.variacoes.some((v) => v[metrica] !== null))) {
    return <SemDados>Nenhum ensaio de variação nas formulações escolhidas.</SemDados>;
  }
  const ehDimensional = metrica === 'dimensionalMedia';
  const unidade = ehDimensional ? 'mm/m' : '%';

  return (
    <>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={dados} margin={{ top: 12, right: 24, bottom: 20, left: 4 }}>
          <CartesianGrid stroke="var(--grade)" vertical={false} />
          <XAxis
            dataKey="idadeDias"
            {...EIXO}
            tickFormatter={(v: number) => `${v}d`}
            label={{
              value: 'Idade do ensaio (dias)',
              position: 'insideBottom',
              offset: -12,
              style: { fill: 'var(--tinta-suave)', fontSize: 11 },
            }}
          />
          <YAxis
            {...EIXO}
            width={60}
            label={{
              value: `${ehDimensional ? 'Variação dimensional' : 'Variação de massa'} (${unidade})`,
              angle: -90,
              position: 'insideLeft',
              offset: 18,
              style: { fill: 'var(--tinta-suave)', fontSize: 11 },
            }}
          />
          <Tooltip
            cursor={{ stroke: 'var(--eixo)', strokeWidth: 1 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <Tip
                  titulo={`${label} dias`}
                  linhas={payload.map((p, i) => ({
                    cor: CORES[i % CORES.length] as string,
                    rotulo:
                      formulacoes.find((f) => f.id === p.dataKey)?.nomenclatura ??
                      String(p.dataKey),
                    valor: `${num(p.value as number, 3)} ${unidade}`,
                  }))}
                />
              ) : null
            }
          />
          {formulacoes.map((f, i) => (
            <Line
              key={f.id}
              type="monotone"
              dataKey={f.id}
              stroke={CORES[i % CORES.length]}
              strokeWidth={2}
              isAnimationActive={false}
              connectNulls
              dot={{ r: 4, strokeWidth: 2, fill: 'var(--superficie)' }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <Legenda
        itens={formulacoes.map((f, i) => ({
          cor: CORES[i % CORES.length] as string,
          rotulo: f.nomenclatura,
        }))}
      />
    </>
  );
}

/* --- Comparação técnica de 2 a 5 produtos, como no dashboard da planilha --- */

type MetricaComparacaoProdutos =
  | 'retencaoAgua'
  | 'squeezeDeslocamento'
  | 'squeezeCarga'
  | 'flexao28'
  | 'modulo28'
  | 'variacaoDimensional28';

export function GraficoComparacaoProdutos({
  formulacoes,
  metrica,
}: {
  formulacoes: Formulacao[];
  metrica: MetricaComparacaoProdutos;
}) {
  const configuracao: Record<
    MetricaComparacaoProdutos,
    {
      rotulo: string;
      unidade: string;
      casas: number;
      valor: (formulacao: Formulacao) => number | null;
    }
  > = {
    retencaoAgua: {
      rotulo: 'Retenção de água',
      unidade: '%',
      casas: 2,
      valor: (f) => f.calculados.retencaoAgua,
    },
    squeezeDeslocamento: {
      rotulo: 'Deslocamento máximo médio',
      unidade: 'mm',
      casas: 2,
      valor: (f) => f.calculados.squeezeDeslocamentoMedio,
    },
    squeezeCarga: {
      rotulo: 'Carga máxima média',
      unidade: 'N',
      casas: 2,
      valor: (f) => f.calculados.squeezeCargaMedia,
    },
    flexao28: {
      rotulo: 'Tração na flexão aos 28 dias',
      unidade: 'MPa',
      casas: 2,
      valor: (f) =>
        f.resistencias.find(
          (r) => r.tipo === 'FLEXAO' && r.idadeDias === 28,
        )?.media ?? null,
    },
    modulo28: {
      rotulo: 'Módulo dinâmico aos 28 dias',
      unidade: 'MPa',
      casas: 0,
      valor: (f) =>
        f.endurecidos.find((e) => e.idadeDias === 28)?.moduloMedio ?? null,
    },
    variacaoDimensional28: {
      rotulo: 'Variação dimensional aos 28 dias',
      unidade: 'mm/m',
      casas: 3,
      valor: (f) =>
        f.variacoes.find((v) => v.idadeDias === 28)?.dimensionalMedia ?? null,
    },
  };
  const config = configuracao[metrica];
  const dados = formulacoes
    .map((f, indice) => ({
      formulacaoId: f.id,
      nomenclatura: f.nomenclatura,
      rotulo: encurtar(f.nomenclatura.replace('Argamassa de Revestimento_', 'Prod. '), 18),
      valor: config.valor(f),
      cor: CORES[indice % CORES.length] as string,
    }))
    .filter((item) => item.valor !== null);

  if (dados.length === 0) {
    return <SemDados>Nenhum produto escolhido tem esse ensaio preenchido.</SemDados>;
  }

  return (
    <ResponsiveContainer width="100%" height={270}>
      <BarChart data={dados} margin={{ top: 24, right: 10, bottom: 28, left: 4 }}>
        <CartesianGrid stroke="var(--grade)" vertical={false} />
        <XAxis
          dataKey="rotulo"
          {...EIXO}
          interval={0}
          angle={-20}
          textAnchor="end"
          height={54}
          label={{
            value: 'Produto selecionado',
            position: 'insideBottom',
            offset: -22,
            style: { fill: 'var(--tinta-suave)', fontSize: 11 },
          }}
        />
        <YAxis
          {...EIXO}
          width={64}
          tickFormatter={(v: number) => num(v, config.casas === 0 ? 0 : 1)}
          label={{
            value: `${config.rotulo} (${config.unidade})`,
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
            const ponto = payload[0]?.payload as (typeof dados)[number];
            return (
              <Tip
                titulo={ponto.nomenclatura}
                linhas={[
                  {
                    cor: ponto.cor,
                    rotulo: config.rotulo,
                    valor: `${num(ponto.valor, config.casas)} ${config.unidade}`,
                  },
                ]}
              />
            );
          }}
        />
        <Bar dataKey="valor" radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {dados.map((item) => (
            <Cell key={item.formulacaoId} fill={item.cor} />
          ))}
          <LabelList
            dataKey="valor"
            position="top"
            formatter={(valor: number) => num(valor, config.casas)}
            style={{ fill: 'var(--tinta-secundaria)', fontSize: 10 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* --- Correlações das formulações escolhidas, aos 28 dias --- */

type MetricaCorrelacaoComparativa =
  | 'teorAgua'
  | 'densidadeEndurecida28';

export function GraficoCorrelacaoComparativa({
  formulacoes,
  metricaX,
}: {
  formulacoes: Formulacao[];
  metricaX: MetricaCorrelacaoComparativa;
}) {
  const configuracao: Record<
    MetricaCorrelacaoComparativa,
    {
      rotulo: string;
      rotuloEixo: string;
      unidade: string;
      casas: number;
      margem: number;
      valor: (formulacao: Formulacao) => number | null;
    }
  > = {
    teorAgua: {
      rotulo: 'Teor de água da formulação',
      rotuloEixo: 'Teor de água',
      unidade: '%',
      casas: 1,
      margem: 0.5,
      valor: (f) => f.teorAgua,
    },
    densidadeEndurecida28: {
      rotulo: 'Densidade no estado endurecido aos 28 dias',
      rotuloEixo: 'Densidade endurecida 28d',
      unidade: 'kg/m³',
      casas: 0,
      margem: 50,
      valor: (f) =>
        f.endurecidos.find((e) => e.idadeDias === 28)?.densidadeMedia ?? null,
    },
  };
  const config = configuracao[metricaX];
  const candidatos = formulacoes.map((f, indice) => ({
    formulacaoId: f.id,
    nomenclatura: f.nomenclatura,
    x: config.valor(f),
    y: f.calculados.compressao28d,
    cor: CORES[indice % CORES.length] as string,
  }));
  type PontoCompleto = (typeof candidatos)[number] & {
    x: number;
    y: number;
  };
  const pontos = candidatos.filter(
    (p): p is PontoCompleto => p.x !== null && p.y !== null,
  );
  const semParCompleto = candidatos.filter(
    (p) => p.x === null || p.y === null,
  );

  if (pontos.length === 0) {
    return (
      <SemDados>
        Nenhuma formulação escolhida tem {config.rotulo.toLocaleLowerCase()} e
        resistência à compressão aos 28 dias preenchidos. Sem par completo:{' '}
        {candidatos.map((ponto) => ponto.nomenclatura).join(', ')}.
      </SemDados>
    );
  }

  return (
    <>
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 18, right: 18, bottom: 20, left: 4 }}>
          <CartesianGrid stroke="var(--grade)" />
          <XAxis
            type="number"
            dataKey="x"
            name={config.rotulo}
            {...EIXO}
            domain={[
              (minimo: number) => Math.max(0, minimo - config.margem),
              (maximo: number) => maximo + config.margem,
            ]}
            tickFormatter={(v: number) => num(v, config.casas)}
            label={{
              value: `${config.rotuloEixo} (${config.unidade})`,
              position: 'insideBottom',
              offset: -12,
              style: { fill: 'var(--tinta-suave)', fontSize: 11 },
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Resistência à compressão aos 28 dias"
            {...EIXO}
            width={58}
            domain={[
              (minimo: number) => Math.max(0, minimo - 0.5),
              (maximo: number) => maximo + 0.5,
            ]}
            tickFormatter={(v: number) => num(v, 1)}
            label={{
              value: 'Compressão aos 28 dias (MPa)',
              angle: -90,
              position: 'insideLeft',
              offset: 16,
              style: { fill: 'var(--tinta-suave)', fontSize: 11 },
            }}
          />
          <ZAxis range={[90, 90]} />
          <Tooltip
            cursor={{ stroke: 'var(--eixo)', strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const ponto = payload[0]?.payload as (typeof pontos)[number];
              return (
                <Tip
                  titulo={ponto.nomenclatura}
                  linhas={[
                    {
                      cor: ponto.cor,
                      rotulo: config.rotulo,
                      valor: `${num(ponto.x, config.casas)} ${config.unidade}`,
                    },
                    {
                      cor: ponto.cor,
                      rotulo: 'Compressão aos 28 dias',
                      valor: `${num(ponto.y, 2)} MPa`,
                    },
                  ]}
                />
              );
            }}
          />
          <Scatter data={pontos} isAnimationActive={false}>
            {pontos.map((ponto) => (
              <Cell key={ponto.formulacaoId} fill={ponto.cor} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <Legenda
        itens={pontos.map((ponto) => ({
          cor: ponto.cor,
          rotulo: ponto.nomenclatura,
        }))}
      />
      {semParCompleto.length > 0 ? (
        <p className="nota-grafico">
          Sem o par completo e, por isso, fora do gráfico:{' '}
          {semParCompleto.map((ponto) => ponto.nomenclatura).join(', ')}.
        </p>
      ) : null}
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
        <ComposedChart data={dados} margin={{ top: 12, right: 16, bottom: 20, left: 2 }}>
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
              offset: -12,
              style: { fill: 'var(--tinta-suave)', fontSize: 11 },
            }}
          />
          <YAxis
            {...EIXO}
            width={54}
            domain={[0, 100]}
            label={{
              value: 'Retida acumulada (%)',
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

/* --- Frequência granulométrica por peneira --- */

export function GraficoFrequenciaGranulometrica({
  curvas,
}: {
  curvas: CurvaGranulometrica[];
}) {
  if (curvas.length === 0) {
    return <SemDados>Nenhuma distribuição granulométrica no filtro atual.</SemDados>;
  }

  const peneiras = [
    ...new Set(curvas.flatMap((c) => c.pontos.map((p) => p.peneiraMm))),
  ].sort((a, b) => b - a);

  const dados = peneiras.map((mm) => {
    const linha: Record<string, number | string | null> = {
      peneiraMm: mm,
      rotulo: mm === 0 ? 'Fundo' : `${num(mm, 2)} mm`,
    };
    for (const c of curvas) {
      linha[c.formulacaoId] =
        c.pontos.find((p) => p.peneiraMm === mm)?.frequencia ?? null;
    }
    return linha;
  });

  return (
    <>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={dados} margin={{ top: 12, right: 44, bottom: 20, left: 2 }}>
          <CartesianGrid stroke="var(--grade)" vertical={false} />
          <XAxis
            dataKey="rotulo"
            {...EIXO}
            interval={0}
            tick={{ fill: 'var(--tinta-secundaria)', fontSize: 10.5 }}
            label={{
              value: 'Peneira / fundo',
              position: 'insideBottom',
              offset: -12,
              style: { fill: 'var(--tinta-suave)', fontSize: 11 },
            }}
          />
          <YAxis
            {...EIXO}
            width={54}
            domain={[0, 'dataMax + 5']}
            label={{
              value: 'Frequência retida (%)',
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
                  titulo={String(label)}
                  linhas={daCurva.map((p) => {
                    const i = curvas.findIndex(
                      (c) => c.formulacaoId === p.dataKey,
                    );
                    return {
                      cor: CORES[i % CORES.length] as string,
                      rotulo: curvas[i]?.nomenclatura ?? String(p.dataKey),
                      valor:
                        p.value === null || p.value === undefined
                          ? '—'
                          : `${num(Number(p.value), 1)} %`,
                    };
                  })}
                />
              );
            }}
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
        </LineChart>
      </ResponsiveContainer>
      <Legenda
        itens={curvas.map((c, i) => ({
          cor: CORES[i % CORES.length] as string,
          rotulo: c.nomenclatura,
        }))}
      />
      <p className="nota-grafico">
        Esta curva mostra a frequência retida em cada peneira. Ela complementa a
        curva acumulada normativa, que é a usada para comparar com as zonas da
        NBR 7211.
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
    classe: 'P',
  },
  {
    chave: 'densidade' as const,
    rotulo: 'Densidade no estado fresco',
    unidade: 'kg/m³',
    classe: 'D',
  },
  {
    chave: 'retencao' as const,
    rotulo: 'Retenção de água',
    unidade: '%',
    classe: 'U',
  },
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
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={bloco.classes}
          margin={{ top: 18, right: 10, bottom: 20, left: 2 }}
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
            label={{
              value: info
                ? `Classe ${info.classe} — ${info.rotulo}`
                : 'Classe (NBR 13281)',
              position: 'insideBottom',
              offset: -12,
              style: { fill: 'var(--tinta-suave)', fontSize: 11 },
            }}
          />
          <YAxis
            {...EIXO}
            width={52}
            allowDecimals={false}
            label={{
              value: 'Quantidade de formulações',
              angle: -90,
              position: 'insideLeft',
              offset: 16,
              style: { fill: 'var(--tinta-suave)', fontSize: 11 },
            }}
          />
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
  casasX = 2,
  casasY = 2,
}: {
  dados: Correlacao;
  rotuloX: string;
  rotuloY: string;
  unidadeX: string;
  unidadeY: string;
  casasX?: number;
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
        <ScatterChart margin={{ top: 12, right: 18, bottom: 20, left: 4 }}>
          <CartesianGrid stroke="var(--grade)" />
          <XAxis
            type="number"
            dataKey="x"
            {...EIXO}
            domain={['dataMin - 0.4', 'dataMax + 0.4']}
            tickFormatter={(v: number) => num(v, casasX === 0 ? 0 : 1)}
            label={{
              value: `${rotuloX} (${unidadeX})`,
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
            tickFormatter={(v: number) => num(v, casasY === 0 ? 0 : 1)}
            label={{
              value: `${rotuloY} (${unidadeY})`,
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
              const p = payload[0]?.payload as PontoCorrelacao;
              if (!p?.nomenclatura) return null;
              return (
                <Tip
                  titulo={p.nomenclatura}
                  linhas={[
                    {
                      cor: CORES[0] as string,
                      rotulo: rotuloX,
                      valor: `${num(p.x, casasX)} ${unidadeX}`,
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
        <ScatterChart margin={{ top: 12, right: 18, bottom: 20, left: 2 }}>
          <CartesianGrid stroke="var(--grade)" />
          <XAxis
            type="number"
            dataKey="deslocamento"
            {...EIXO}
            domain={['dataMin - 0.5', 'dataMax + 0.5']}
            tickFormatter={(v: number) => num(v, 1)}
            label={{
              value: 'Deslocamento máximo (mm)',
              position: 'insideBottom',
              offset: -12,
              style: { fill: 'var(--tinta-suave)', fontSize: 11 },
            }}
          />
          <YAxis
            type="number"
            dataKey="carga"
            {...EIXO}
            width={56}
            label={{
              value: 'Carga máxima (N)',
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
      <ResponsiveContainer width="100%" height={270}>
        <BarChart
          data={comValores}
          margin={{ top: 16, right: 12, bottom: 20, left: 2 }}
          barCategoryGap={18}
        >
          <CartesianGrid stroke="var(--grade)" vertical={false} />
          <XAxis
            dataKey="idadeDias"
            {...EIXO}
            tickFormatter={(v: number) => `${v}d`}
            tick={{ fill: 'var(--tinta-secundaria)', fontSize: 12, fontWeight: 600 }}
            label={{
              value: 'Idade do ensaio (dias)',
              position: 'insideBottom',
              offset: -12,
              style: { fill: 'var(--tinta-suave)', fontSize: 11 },
            }}
          />
          <YAxis
            {...EIXO}
            width={58}
            label={{
              value: 'Resistência (MPa)',
              angle: -90,
              position: 'insideLeft',
              offset: 16,
              style: { fill: 'var(--tinta-suave)', fontSize: 11 },
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
          { cor: CORES[0] as string, rotulo: 'Resistência à compressão' },
          { cor: CORES[1] as string, rotulo: 'Resistência à tração na flexão' },
        ]}
      />
      <p className="nota-grafico">
        A barra vertical é o desvio padrão entre todos os corpos de prova do
        filtro — a média sozinha esconde a variabilidade do ensaio.
      </p>
    </>
  );
}

/* --- Evolução por formulação (comparação lado a lado) --- */

export function GraficoEvolucaoComparativo({
  curvas,
  metrica,
}: {
  curvas: CurvaEvolucao[];
  metrica: 'compressao' | 'flexao';
}) {
  const rotulo =
    metrica === 'compressao'
      ? 'Resistência à compressão (MPa)'
      : 'Resistência à tração na flexão (MPa)';

  const comDados = curvas.filter((c) =>
    c.pontos.some((p) => p[metrica] !== null),
  );

  if (comDados.length === 0) {
    return (
      <SemDados>
        Nenhuma das formulações tem ensaio de{' '}
        {metrica === 'compressao' ? 'compressão' : 'flexão'} preenchido.
      </SemDados>
    );
  }

  const idades = [3, 7, 14, 28];
  const dados = idades.map((idade) => {
    const linha: Record<string, number | null> = { idadeDias: idade };
    for (const c of comDados) {
      linha[c.formulacaoId] =
        c.pontos.find((p) => p.idadeDias === idade)?.[metrica] ?? null;
    }
    return linha;
  });

  return (
    <>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={dados}
          margin={{ top: 12, right: 44, bottom: 20, left: 2 }}
        >
          <CartesianGrid stroke="var(--grade)" vertical={false} />
          <XAxis
            dataKey="idadeDias"
            {...EIXO}
            tickFormatter={(v: number) => `${v}d`}
            label={{
              value: 'Idade do ensaio (dias)',
              position: 'insideBottom',
              offset: -12,
              style: { fill: 'var(--tinta-suave)', fontSize: 11 },
            }}
          />
          <YAxis
            {...EIXO}
            width={58}
            label={{
              value: rotulo,
              angle: -90,
              position: 'insideLeft',
              offset: 16,
              style: { fill: 'var(--tinta-suave)', fontSize: 11 },
            }}
          />
          <Tooltip
            cursor={{ stroke: 'var(--eixo)', strokeWidth: 1 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const daCurva = payload.filter((p) =>
                comDados.some((c) => c.formulacaoId === p.dataKey),
              );
              if (daCurva.length === 0) return null;
              return (
                <Tip
                  titulo={`${label} dias`}
                  linhas={daCurva.map((p) => {
                    const i = comDados.findIndex(
                      (c) => c.formulacaoId === p.dataKey,
                    );
                    return {
                      cor: CORES[i % CORES.length] as string,
                      rotulo: comDados[i]?.nomenclatura ?? String(p.dataKey),
                      valor:
                        p.value === null || p.value === undefined
                          ? '—'
                          : `${num(Number(p.value), 2)} MPa`,
                    };
                  })}
                />
              );
            }}
          />
          {comDados.map((c, i) => (
            <Line
              key={c.formulacaoId}
              type="monotone"
              dataKey={c.formulacaoId}
              name={c.nomenclatura}
              stroke={CORES[i % CORES.length]}
              strokeWidth={2}
              isAnimationActive={false}
              connectNulls
              dot={{ r: 3.5, strokeWidth: 2, fill: 'var(--superficie)' }}
              activeDot={{ r: 5 }}
            >
              <LabelList
                dataKey={c.formulacaoId}
                content={({ index, x, y, value }) =>
                  index === dados.length - 1 &&
                  value !== undefined &&
                  value !== null ? (
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
          ))}
        </LineChart>
      </ResponsiveContainer>
      <Legenda
        itens={comDados.map((c, i) => ({
          cor: CORES[i % CORES.length] as string,
          rotulo: c.nomenclatura,
        }))}
      />
    </>
  );
}
