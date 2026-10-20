import { Suspense } from 'react';
import { BarraFiltros } from '@/components/filtros';
import {
  GraficoClassificacao,
  GraficoComparativo,
  GraficoCorrelacao,
  GraficoDensidadesProduto,
  GraficoDispersao,
  GraficoDispersaoIdade,
  GraficoDistribuicao,
  GraficoEvolucao,
  GraficoFrequenciaGranulometrica,
  GraficoGranulometria,
  GraficoRegistrosPorMes,
  GraficoResponsaveis,
  GraficoSqueezeFlow,
  GraficoVariacaoTemporal,
} from '@/components/graficos';
import { ApiForaDoAr, Cartao, Kpi } from '@/components/estado';
import { GradeGraficos, type ItemGrade } from '@/components/grade-graficos';
import {
  ApiIndisponivel,
  ParametrosBusca,
  montarQuery,
  obterOpcoes,
  obterPainel,
} from '@/lib/api';
import { ehRedirecionamento } from '@/lib/erros';
import { inteiro, num } from '@/lib/formato';

export const dynamic = 'force-dynamic';

export default async function PaginaVisaoGeral({
  searchParams,
}: {
  searchParams: ParametrosBusca;
}) {
  const query = montarQuery(searchParams);

  try {
    // Um endpoint só para os dez recortes: são todos do mesmo conjunto
    // filtrado, e uma requisição por gráfico faria o banco repetir a leitura.
    const [painel, opcoes] = await Promise.all([
      obterPainel(query),
      obterOpcoes(),
    ]);

    const {
      resumo,
      evolucao,
      comparativo,
      dispersao,
      granulometria,
      classificacao,
      correlacoes,
      squeezeFlow: squeeze,
      dispersaoIdade,
      densidades,
      variacaoTemporal,
    } = painel;

    /*
     * Cada gráfico tem um `id` estável: é ele que fica salvo quando a pessoa
     * reordena o painel. Renomear um id descarta a ordem salva de todo mundo,
     * então trate-os como identificadores, não como rótulos.
     */
    const graficos: ItemGrade[] = [
      {
        id: 'evolucao',
        titulo: 'Evolução da resistência por idade',
        node: (
          <Cartao
            titulo="Evolução da resistência por idade"
            legenda="Média das formulações filtradas, em MPa"
          >
            <GraficoEvolucao dados={evolucao} />
          </Cartao>
        ),
      },
      {
        id: 'distribuicao',
        titulo: 'Distribuição por tipo de projeto',
        node: (
          <Cartao
            titulo="Distribuição por tipo de projeto"
            legenda="Quantidade de formulações"
          >
            <GraficoDistribuicao dados={resumo.porTipoProjeto} />
          </Cartao>
        ),
      },
      {
        id: 'responsaveis',
        titulo: 'Produtos por responsável',
        largura: 2,
        node: (
          <Cartao
            titulo="Produtos por responsável"
            legenda="Participação no desenvolvimento, alimentação da planilha e avaliação"
          >
            <GraficoResponsaveis dados={resumo.porResponsavel} />
          </Cartao>
        ),
      },
      {
        id: 'registros-mes',
        titulo: 'Registros por mês',
        node: (
          <Cartao
            titulo="Registros por mês"
            legenda="Data de cadastro das formulações filtradas"
          >
            <GraficoRegistrosPorMes dados={resumo.porMes} />
          </Cartao>
        ),
      },
      {
        id: 'agua-ligante',
        titulo: 'Relação água/ligante e resistência',
        node: (
          <Cartao
            titulo="Relação água/ligante e resistência"
            legenda="Cada ponto é uma formulação — compressão aos 28 dias"
          >
            <GraficoDispersao dados={dispersao} />
          </Cartao>
        ),
      },
      {
        id: 'dispersao-idade',
        titulo: 'Resistência e dispersão por idade',
        node: (
          <Cartao
            titulo="Resistência e dispersão por idade"
            legenda="Média dos corpos de prova, com desvio padrão"
          >
            <GraficoDispersaoIdade dados={dispersaoIdade} />
          </Cartao>
        ),
      },
      {
        id: 'granulometria',
        titulo: 'Curvas granulométricas e zonas da NBR 7211',
        largura: 2,
        node: (
          <Cartao
            titulo="Curvas granulométricas e zonas da NBR 7211"
            legenda="Retida acumulada por peneira, com as faixas normativas"
          >
            <GraficoGranulometria
              curvas={granulometria.curvas}
              zonas={granulometria.zonas}
            />
          </Cartao>
        ),
      },
      {
        id: 'frequencia-granulometrica',
        titulo: 'Frequência retida por peneira',
        largura: 2,
        node: (
          <Cartao
            titulo="Frequência retida por peneira"
            legenda="Distribuição de partículas por faixa granulométrica"
          >
            <GraficoFrequenciaGranulometrica curvas={granulometria.curvas} />
          </Cartao>
        ),
      },
      {
        id: 'classes-compressao',
        titulo: 'Classes de resistência à compressão',
        node: (
          <Cartao
            titulo="Classes de resistência à compressão"
            legenda="Distribuição pelas classes P da NBR 13281"
          >
            <GraficoClassificacao dados={classificacao} familia="compressao" />
          </Cartao>
        ),
      },
      {
        id: 'classes-retencao',
        titulo: 'Classes de retenção de água',
        node: (
          <Cartao
            titulo="Classes de retenção de água"
            legenda="Distribuição pelas classes U da NBR 13281"
          >
            <GraficoClassificacao dados={classificacao} familia="retencao" />
          </Cartao>
        ),
      },
      {
        id: 'classes-densidade',
        titulo: 'Classes de densidade no estado fresco',
        node: (
          <Cartao
            titulo="Classes de densidade no estado fresco"
            legenda="Distribuição pelas classes D da NBR 13281"
          >
            <GraficoClassificacao dados={classificacao} familia="densidade" />
          </Cartao>
        ),
      },
      {
        id: 'squeeze-flow',
        titulo: 'Squeeze-flow: carga e deslocamento',
        node: (
          <Cartao
            titulo="Squeeze-flow: carga e deslocamento"
            legenda="Comportamento reológico no estado fresco"
          >
            <GraficoSqueezeFlow dados={squeeze} />
          </Cartao>
        ),
      },
      {
        id: 'retencao-squeeze',
        titulo: 'Retenção de água e squeeze-flow',
        node: (
          <Cartao
            titulo="Retenção de água e squeeze-flow"
            legenda="Retenção versus deslocamento médio no estado fresco"
          >
            <GraficoCorrelacao
              dados={correlacoes.retencaoSqueeze}
              rotuloX="Retenção de água"
              rotuloY="Deslocamento no squeeze-flow"
              unidadeX="%"
              unidadeY="mm"
            />
          </Cartao>
        ),
      },
      {
        id: 'flexao-compressao',
        titulo: 'Flexão e compressão aos 28 dias',
        node: (
          <Cartao
            titulo="Flexão e compressão aos 28 dias"
            legenda="Correlação entre os dois ensaios mecânicos"
          >
            <GraficoCorrelacao
              dados={correlacoes.flexaoCompressao}
              rotuloX="Resistência à compressão"
              rotuloY="Resistência à tração na flexão"
              unidadeX="MPa"
              unidadeY="MPa"
            />
          </Cartao>
        ),
      },
      {
        id: 'modulo-compressao',
        titulo: 'Módulo de elasticidade e compressão',
        node: (
          <Cartao
            titulo="Módulo de elasticidade e compressão"
            legenda="Módulo dinâmico por ultrassom aos 28 dias"
          >
            <GraficoCorrelacao
              dados={correlacoes.moduloCompressao}
              rotuloX="Resistência à compressão"
              rotuloY="Módulo de elasticidade dinâmico"
              unidadeX="MPa"
              unidadeY="MPa"
              casasY={0}
            />
          </Cartao>
        ),
      },
      {
        id: 'modulo-flexao',
        titulo: 'Módulo de elasticidade e flexão',
        node: (
          <Cartao
            titulo="Módulo de elasticidade e flexão"
            legenda="Ensaios aos 28 dias, com produto e idade identificados"
          >
            <GraficoCorrelacao
              dados={correlacoes.moduloFlexao}
              rotuloX="Resistência à tração na flexão"
              rotuloY="Módulo de elasticidade dinâmico"
              unidadeX="MPa"
              unidadeY="MPa"
              casasY={0}
            />
          </Cartao>
        ),
      },
      {
        id: 'modulo-variacao-dimensional',
        titulo: 'Módulo e variação dimensional',
        node: (
          <Cartao
            titulo="Módulo e variação dimensional"
            legenda="Resultados aos 28 dias, conforme o dashboard da planilha"
          >
            <GraficoCorrelacao
              dados={correlacoes.moduloVariacaoDimensional}
              rotuloX="Módulo de elasticidade dinâmico"
              rotuloY="Variação dimensional"
              unidadeX="MPa"
              unidadeY="mm/m"
              casasX={0}
              casasY={3}
            />
          </Cartao>
        ),
      },
      {
        id: 'modulo-densidade-endurecida',
        titulo: 'Módulo de elasticidade e densidade endurecida',
        node: (
          <Cartao
            titulo="Módulo de elasticidade e densidade endurecida"
            legenda="Corpos de prova aos 28 dias no estado endurecido"
          >
            <GraficoCorrelacao
              dados={correlacoes.moduloDensidadeEndurecida}
              rotuloX="Densidade média endurecida"
              rotuloY="Módulo de elasticidade dinâmico"
              unidadeX="kg/m³"
              unidadeY="MPa"
              casasY={0}
            />
          </Cartao>
        ),
      },
      {
        id: 'ranking-28d',
        titulo: 'Formulações com maior resistência aos 28 dias',
        largura: 2,
        node: (
          <Cartao
            titulo="Formulações com maior resistência aos 28 dias"
            legenda="Resistência à compressão, em MPa"
          >
            <GraficoComparativo dados={comparativo} />
          </Cartao>
        ),
      },
      {
        id: 'densidades-produto',
        titulo: 'Densidades por produto',
        largura: 2,
        node: (
          <Cartao
            titulo="Densidades por produto"
            legenda="Estados anidro, fresco e endurecido; até 12 formulações do filtro"
          >
            <GraficoDensidadesProduto dados={densidades} />
          </Cartao>
        ),
      },
      {
        id: 'variacao-dimensional',
        titulo: 'Variação dimensional no tempo',
        node: (
          <Cartao
            titulo="Variação dimensional no tempo"
            legenda="Média dos corpos de prova, com desvio padrão"
          >
            <GraficoVariacaoTemporal
              dados={variacaoTemporal}
              metrica="dimensional"
            />
          </Cartao>
        ),
      },
      {
        id: 'variacao-massa',
        titulo: 'Variação de massa no tempo',
        node: (
          <Cartao
            titulo="Variação de massa no tempo"
            legenda="Perdas aparecem com sinal negativo; média com desvio padrão"
          >
            <GraficoVariacaoTemporal dados={variacaoTemporal} metrica="massa" />
          </Cartao>
        ),
      },
    ];

    return (
      <>
        <h1 className="titulo-pagina">Visão geral</h1>
        <p className="subtitulo-pagina">
          Formulações de argamassa desenvolvidas e ensaiadas pelo laboratório.
        </p>

        <Suspense fallback={null}>
          <BarraFiltros
            desenvolvedores={opcoes.desenvolvedores}
            alimentadores={opcoes.alimentadores}
            avaliadores={opcoes.avaliadores}
          />
        </Suspense>

        <div className="grade-kpis">
          <Kpi
            rotulo="Formulações"
            valor={inteiro(resumo.totalFormulacoes)}
            nota={`${inteiro(resumo.totalComEnsaios)} com ensaios registrados`}
          />
          <Kpi
            rotulo="Dados completos"
            valor={inteiro(resumo.totalCompletos)}
            nota="Formulações com todos os blocos previstos"
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

        <GradeGraficos itens={graficos} />
      </>
    );
  } catch (e) {
    // Sessão vencida vira redirect, que é uma exceção: precisa passar.
    if (ehRedirecionamento(e)) throw e;
    if (e instanceof ApiIndisponivel) {
      return <ApiForaDoAr mensagem={e.message} />;
    }
    throw e;
  }
}
