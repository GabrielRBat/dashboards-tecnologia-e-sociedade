import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { BarraFiltros } from '@/components/filtros';
import { ApiForaDoAr, Cartao } from '@/components/estado';
import { GradeGraficos, type ItemGrade } from '@/components/grade-graficos';
import { PainelCustomizado } from '@/components/painel-customizado';
import {
  ApiIndisponivel,
  ParametrosBusca,
  montarQuery,
  obterDadosDashboard,
  obterOpcoes,
} from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function PaginaDashboard({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: ParametrosBusca;
}) {
  const query = montarQuery(searchParams);

  let dados;
  let opcoes;
  try {
    [dados, opcoes] = await Promise.all([
      obterDadosDashboard(params.id, query),
      obterOpcoes(),
    ]);
  } catch (e) {
    if (e instanceof ApiIndisponivel) return <ApiForaDoAr mensagem={e.message} />;
    notFound();
  }

  const itens: ItemGrade[] = dados.paineis.map((p) => ({
    id: p.id,
    titulo: p.titulo,
    node: (
      <Cartao titulo={p.titulo} legenda={legendaDoPainel(p.tipo)}>
        <PainelCustomizado painel={p} />
      </Cartao>
    ),
  }));

  return (
    <>
      <Link className="voltar" href="/dashboards">
        ← Voltar para dashboards
      </Link>

      <div className="cabecalho-pagina">
        <div>
          <h1 className="titulo-pagina">{dados.dashboard.nome}</h1>
          <p className="subtitulo-pagina">
            {dados.dashboard.descricao ??
              'Painel montado pela equipe.'}{' '}
            {dados.totalFormulacoes} formulação(ões) no recorte atual.
          </p>
        </div>
        <Link className="botao" href={`/dashboards/${params.id}/editar`}>
          Editar
        </Link>
      </div>

      <Suspense fallback={null}>
        <BarraFiltros desenvolvedores={opcoes.desenvolvedores} />
      </Suspense>

      {itens.length === 0 ? (
        <div className="aviso">
          Este dashboard ainda não tem gráficos.{' '}
          <Link href={`/dashboards/${params.id}/editar`}>Adicione o primeiro.</Link>
        </div>
      ) : (
        <GradeGraficos itens={itens} />
      )}
    </>
  );
}

function legendaDoPainel(tipo: string): string {
  if (tipo === 'dispersao') return 'Cada ponto é uma formulação';
  if (tipo === 'barras') return 'Formulações agrupadas por categoria';
  return 'Quantas formulações em cada faixa';
}
