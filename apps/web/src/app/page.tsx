import { Suspense } from 'react';
import { BarraFiltros } from '@/components/filtros';
import {
  GraficoComparativo,
  GraficoDispersao,
  GraficoDistribuicao,
  GraficoEvolucao,
  GraficoGranulometria,
} from '@/components/graficos';
import { ApiForaDoAr, Cartao, Kpi } from '@/components/estado';
import {
  ApiIndisponivel,
  ParametrosBusca,
  montarQuery,
  obterComparativo,
  obterDispersao,
  obterEvolucaoMedia,
  obterGranulometria,
  obterOpcoes,
  obterResumo,
} from '@/lib/api';
import { inteiro, num } from '@/lib/formato';

export const dynamic = 'force-dynamic';

export default async function PaginaVisaoGeral({
  searchParams,
}: {
  searchParams: ParametrosBusca;
}) {
  const query = montarQuery(searchParams);

  try {
    const [resumo, evolucao, comparativo, dispersao, granulometria, opcoes] =
      await Promise.all([
        obterResumo(query),
        obterEvolucaoMedia(query),
        obterComparativo(query),
        obterDispersao(query),
        obterGranulometria(query),
        obterOpcoes(),
      ]);

    return (
      <>
        <h1 className="titulo-pagina">Visão geral</h1>
        <p className="subtitulo-pagina">
          Formulações de argamassa desenvolvidas e ensaiadas pelo laboratório.
        </p>

        <Suspense fallback={null}>
          <BarraFiltros desenvolvedores={opcoes.desenvolvedores} />
        </Suspense>

        <div className="grade-kpis">
          <Kpi
            rotulo="Formulações"
            valor={inteiro(resumo.totalFormulacoes)}
            nota={`${inteiro(resumo.totalComEnsaios)} com ensaios registrados`}
          />
          <Kpi
            rotulo="Compressão 28 dias"
            valor={num(resumo.compressao28dMedia, 2)}
            unidade="MPa"
            nota="Média das formulações filtradas"
          />
          <Kpi
            rotulo="Flexão 28 dias"
            valor={num(resumo.flexao28dMedia, 2)}
            unidade="MPa"
            nota="Tração na flexão, média"
          />
          <Kpi
            rotulo="Retenção de água"
            valor={num(resumo.retencaoAguaMedia, 1)}
            unidade="%"
            nota="Estado fresco, média"
          />
          <Kpi
            rotulo="Preenchimento"
            valor={String(resumo.completudeMedia)}
            unidade="%"
            nota="Dos ensaios previstos por formulação"
          />
        </div>

        <div className="grade-graficos">
          <Cartao
            titulo="Evolução da resistência por idade"
            legenda="Média das formulações filtradas, em MPa"
          >
            <GraficoEvolucao dados={evolucao} />
          </Cartao>

          <Cartao
            titulo="Distribuição por tipo de projeto"
            legenda="Quantidade de formulações"
          >
            <GraficoDistribuicao dados={resumo.porTipoProjeto} />
          </Cartao>

          <Cartao
            titulo="Relação água/ligante e resistência"
            legenda="Cada ponto é uma formulação — compressão aos 28 dias"
          >
            <GraficoDispersao dados={dispersao} />
          </Cartao>

          <Cartao
            titulo="Curvas granulométricas"
            legenda="Frequência de partículas por diâmetro de peneira"
          >
            <GraficoGranulometria curvas={granulometria} />
          </Cartao>

          <Cartao
            titulo="Formulações com maior resistência aos 28 dias"
            legenda="Resistência à compressão, em MPa"
            largura={2}
          >
            <GraficoComparativo dados={comparativo} />
          </Cartao>
        </div>
      </>
    );
  } catch (e) {
    if (e instanceof ApiIndisponivel) {
      return <ApiForaDoAr mensagem={e.message} />;
    }
    throw e;
  }
}
