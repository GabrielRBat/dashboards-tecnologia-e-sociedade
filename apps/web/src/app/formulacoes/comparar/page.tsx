import Link from 'next/link';
import { Fragment } from 'react';
import { Cartao, ApiForaDoAr } from '@/components/estado';
import {
  GraficoEvolucaoComparativo,
  GraficoGranulometria,
} from '@/components/graficos';
import {
  ApiIndisponivel,
  Formulacao,
  ParametrosBusca,
  listarFormulacoes,
  montarQuery,
  obterEvolucaoPorFormulacao,
  obterGranulometria,
} from '@/lib/api';
import { ehRedirecionamento } from '@/lib/erros';
import { data, num, origem, tipoProjeto } from '@/lib/formato';

export const dynamic = 'force-dynamic';

const MAXIMO = 3;

/** Extrai até 3 ids únicos da query (`ids=a,b` ou `ids=a&ids=b`). */
function lerIds(params: ParametrosBusca): string[] {
  const bruto = params.ids;
  if (!bruto) return [];
  const lista = Array.isArray(bruto) ? bruto : [bruto];
  const ids = lista
    .flatMap((v) => String(v).split(','))
    .map((v) => v.trim())
    .filter(Boolean);
  return [...new Set(ids)].slice(0, MAXIMO);
}

function mediaResistencia(
  f: Formulacao,
  tipo: 'COMPRESSAO' | 'FLEXAO',
  idade: number,
): number | null {
  return (
    f.resistencias.find((r) => r.tipo === tipo && r.idadeDias === idade)
      ?.media ?? null
  );
}

function celula(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  return String(valor);
}

type LinhaTabela = {
  grupo: string;
  rotulo: string;
  valores: (string | number | null)[];
};

export default async function PaginaCompararFormulacoes({
  searchParams,
}: {
  searchParams: ParametrosBusca;
}) {
  const ids = lerIds(searchParams);

  if (ids.length < 2) {
    return (
      <>
        <Link className="voltar" href="/formulacoes">
          ← Voltar para formulações
        </Link>
        <h1 className="titulo-pagina">Comparar formulações</h1>
        <div className="aviso">
          Selecione pelo menos 2 formulações na lista (máximo {MAXIMO}) para
          comparar o ciclo de ensaios.
        </div>
      </>
    );
  }

  const query = montarQuery({ ids, porPagina: String(MAXIMO) });

  try {
    const [pagina, evolucao, granulometria] = await Promise.all([
      listarFormulacoes(query),
      obterEvolucaoPorFormulacao(query),
      obterGranulometria(query),
    ]);

    // Mantém a ordem em que a pessoa selecionou na URL.
    const porId = new Map(pagina.itens.map((f) => [f.id, f]));
    const formulacoes = ids
      .map((id) => porId.get(id))
      .filter((f): f is Formulacao => Boolean(f));

    if (formulacoes.length < 2) {
      return (
        <>
          <Link className="voltar" href="/formulacoes">
            ← Voltar para formulações
          </Link>
          <h1 className="titulo-pagina">Comparar formulações</h1>
          <div className="aviso">
            Não foi possível carregar as formulações pedidas. Volte à lista e
            selecione de novo.
          </div>
        </>
      );
    }

    const curvasOrdenadas = ids
      .map((id) => evolucao.find((c) => c.formulacaoId === id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c));

    const linhas: LinhaTabela[] = [
      {
        grupo: 'Identificação',
        rotulo: 'Nº',
        valores: formulacoes.map((f) => f.numeracao),
      },
      {
        grupo: 'Identificação',
        rotulo: 'Tipo de projeto',
        valores: formulacoes.map((f) => tipoProjeto(f.tipoProjeto)),
      },
      {
        grupo: 'Identificação',
        rotulo: 'Origem',
        valores: formulacoes.map((f) => origem(f.origem)),
      },
      {
        grupo: 'Identificação',
        rotulo: 'Data',
        valores: formulacoes.map((f) => data(f.data)),
      },
      {
        grupo: 'Identificação',
        rotulo: 'Desenvolvedor',
        valores: formulacoes.map((f) => f.desenvolvedor),
      },
      {
        grupo: 'Estado anidro',
        rotulo: 'Relação água/ligante',
        valores: formulacoes.map((f) =>
          num(f.calculados.relacaoAguaLigante, 3),
        ),
      },
      {
        grupo: 'Estado anidro',
        rotulo: 'Teor de finos (%)',
        valores: formulacoes.map((f) => num(f.calculados.teorFinos, 2)),
      },
      {
        grupo: 'Estado anidro',
        rotulo: 'Densidade aparente (kg/m³)',
        valores: formulacoes.map((f) => num(f.calculados.densidadeAparente, 1)),
      },
      {
        grupo: 'Estado anidro',
        rotulo: 'Módulo de finura',
        valores: formulacoes.map((f) => num(f.calculados.moduloFinura, 2)),
      },
      {
        grupo: 'Estado fresco',
        rotulo: 'Retenção de água (%)',
        valores: formulacoes.map((f) => num(f.calculados.retencaoAgua, 2)),
      },
      {
        grupo: 'Estado fresco',
        rotulo: 'Densidade (kg/m³)',
        valores: formulacoes.map((f) => num(f.calculados.densidadeFresco, 0)),
      },
      {
        grupo: 'Estado fresco',
        rotulo: 'Squeeze — deslocamento (mm)',
        valores: formulacoes.map((f) =>
          num(f.calculados.squeezeDeslocamentoMedio, 2),
        ),
      },
      {
        grupo: 'Estado fresco',
        rotulo: 'Squeeze — carga (N)',
        valores: formulacoes.map((f) => num(f.calculados.squeezeCargaMedia, 2)),
      },
      ...([3, 7, 14, 28] as const).flatMap((idade) => [
        {
          grupo: 'Estado endurecido',
          rotulo: `Compressão ${idade}d (MPa)`,
          valores: formulacoes.map((f) =>
            num(mediaResistencia(f, 'COMPRESSAO', idade), 2),
          ),
        },
        {
          grupo: 'Estado endurecido',
          rotulo: `Flexão ${idade}d (MPa)`,
          valores: formulacoes.map((f) =>
            num(mediaResistencia(f, 'FLEXAO', idade), 2),
          ),
        },
      ]),
      {
        grupo: 'Estado endurecido',
        rotulo: 'Densidade aos 28d (kg/m³)',
        valores: formulacoes.map(
          (f) =>
            num(
              f.endurecidos.find((e) => e.idadeDias === 28)?.densidadeMedia ??
                null,
              0,
            ),
        ),
      },
      {
        grupo: 'Estado endurecido',
        rotulo: 'Módulo de elasticidade 28d (MPa)',
        valores: formulacoes.map(
          (f) =>
            num(
              f.endurecidos.find((e) => e.idadeDias === 28)?.moduloMedio ?? null,
              0,
            ),
        ),
      },
    ];

    let grupoAtual = '';

    return (
      <>
        <Link className="voltar" href="/formulacoes">
          ← Voltar para formulações
        </Link>

        <h1 className="titulo-pagina">Comparar formulações</h1>
        <p className="subtitulo-pagina">
          Ciclo de ensaios lado a lado — escolha qual formulação utilizar.
        </p>

        <ul className="lista-comparadas">
          {formulacoes.map((f, i) => (
            <li key={f.id}>
              <span
                className="lista-comparadas-marca"
                style={{ background: `var(--serie-${i + 1})` }}
              />
              <Link href={`/formulacoes/${f.id}`}>{f.nomenclatura}</Link>
              <span className="lista-comparadas-meta">
                nº {f.numeracao} · {tipoProjeto(f.tipoProjeto)}
              </span>
            </li>
          ))}
        </ul>

        <div className="grade-graficos">
          <Cartao
            titulo="Evolução da resistência à compressão"
            legenda="Médias por idade — cada linha é uma formulação"
          >
            <GraficoEvolucaoComparativo
              curvas={curvasOrdenadas}
              metrica="compressao"
            />
          </Cartao>
          <Cartao
            titulo="Evolução da resistência à tração na flexão"
            legenda="Médias por idade — cada linha é uma formulação"
          >
            <GraficoEvolucaoComparativo
              curvas={curvasOrdenadas}
              metrica="flexao"
            />
          </Cartao>
        </div>

        <Cartao
          titulo="Ciclo de ensaios — tabela comparativa"
          legenda="Anidro, fresco e endurecido"
        >
          <div className="tabela-envolucro">
            <table className="tabela tabela-comparacao">
              <thead>
                <tr>
                  <th scope="col">Ensaio / propriedade</th>
                  {formulacoes.map((f, i) => (
                    <th key={f.id} scope="col">
                      <span
                        className="lista-comparadas-marca"
                        style={{ background: `var(--serie-${i + 1})` }}
                      />{' '}
                      {f.nomenclatura}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhas.map((linha) => {
                  const novoGrupo = linha.grupo !== grupoAtual;
                  grupoAtual = linha.grupo;
                  return (
                    <Fragment key={`${linha.grupo}-${linha.rotulo}`}>
                      {novoGrupo ? (
                        <tr className="grupo-tabela">
                          <th colSpan={formulacoes.length + 1} scope="colgroup">
                            {linha.grupo}
                          </th>
                        </tr>
                      ) : null}
                      <tr>
                        <th scope="row">{linha.rotulo}</th>
                        {linha.valores.map((v, i) => (
                          <td key={formulacoes[i]?.id ?? i} className="numerico">
                            {celula(v)}
                          </td>
                        ))}
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Cartao>

        <div className="grade-graficos" style={{ marginTop: 18 }}>
          <Cartao
            titulo="Curvas granulométricas"
            legenda="Retida acumulada com as zonas da NBR 7211"
            largura={2}
          >
            <GraficoGranulometria
              curvas={ids
                .map((id) =>
                  granulometria.curvas.find((c) => c.formulacaoId === id),
                )
                .filter((c): c is NonNullable<typeof c> => Boolean(c))}
              zonas={granulometria.zonas}
            />
          </Cartao>
        </div>
      </>
    );
  } catch (e) {
    if (ehRedirecionamento(e)) throw e;
    if (e instanceof ApiIndisponivel) {
      return <ApiForaDoAr mensagem={e.message} />;
    }
    throw e;
  }
}
