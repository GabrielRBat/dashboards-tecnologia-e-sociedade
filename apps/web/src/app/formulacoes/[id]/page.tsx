import Link from 'next/link';
import { Fragment } from 'react';
import { notFound } from 'next/navigation';
import { Cartao, ApiForaDoAr } from '@/components/estado';
import { GraficoGranulometria } from '@/components/graficos';
import { ApiIndisponivel, obterFormulacao } from '@/lib/api';
import {
  categoria,
  data,
  num,
  origem,
  peneira,
  tipoProjeto,
} from '@/lib/formato';

export const dynamic = 'force-dynamic';

const IDADES = [3, 7, 14, 28];

export default async function PaginaFormulacao({
  params,
}: {
  params: { id: string };
}) {
  let f;
  try {
    f = await obterFormulacao(params.id);
  } catch (e) {
    if (e instanceof ApiIndisponivel) {
      return <ApiForaDoAr mensagem={e.message} />;
    }
    notFound();
  }

  const resistencia = (tipo: string, idade: number) =>
    f.resistencias.find((r) => r.tipo === tipo && r.idadeDias === idade);

  return (
    <>
      <Link className="voltar" href="/formulacoes">
        ← Voltar para formulações
      </Link>

      <h1 className="titulo-pagina">{f.nomenclatura}</h1>
      <p className="subtitulo-pagina">
        Formulação nº {f.numeracao} · {tipoProjeto(f.tipoProjeto)} ·{' '}
        {origem(f.origem)} · {data(f.data)}
      </p>

      <div className="grade-detalhe">
        <Cartao titulo="Identificação">
          <dl className="lista-dados">
            <dt>Desenvolvedor</dt>
            <dd>{f.desenvolvedor ?? '—'}</dd>
            <dt>Alimentador da planilha</dt>
            <dd>{f.alimentador ?? '—'}</dd>
            <dt>Avaliador</dt>
            <dd>{f.avaliador ?? '—'}</dd>
            <dt>Preenchimento dos ensaios</dt>
            <dd>{f.calculados.completude}%</dd>
          </dl>
          {f.comentarios ? (
            <p style={{ marginTop: 14, fontSize: 13, color: 'var(--tinta-secundaria)' }}>
              {f.comentarios}
            </p>
          ) : null}
        </Cartao>

        <Cartao titulo="Estado anidro">
          <dl className="lista-dados">
            <dt>Teor de água</dt>
            <dd>{num(f.teorAgua, 1)} %</dd>
            <dt>Massa de água</dt>
            <dd>{num(f.massaAgua, 0)} g</dd>
            <dt>Relação água/ligante</dt>
            <dd>{num(f.calculados.relacaoAguaLigante, 3)}</dd>
            <dt>Teor de finos</dt>
            <dd>{num(f.calculados.teorFinos, 2)} %</dd>
            <dt>Densidade aparente</dt>
            <dd>{num(f.calculados.densidadeAparente, 1)} kg/m³</dd>
          </dl>
        </Cartao>

        <Cartao titulo="Estado fresco">
          <dl className="lista-dados">
            <dt>Retenção de água</dt>
            <dd>{num(f.calculados.retencaoAgua, 2)} %</dd>
            <dt>Densidade</dt>
            <dd>{num(f.calculados.densidadeFresco, 1)} kg/m³</dd>
            <dt>Squeeze-flow — deslocamento</dt>
            <dd>{num(f.calculados.squeezeDeslocamentoMedio, 2)} mm</dd>
            <dt>Squeeze-flow — carga</dt>
            <dd>{num(f.calculados.squeezeCargaMedia, 2)} N</dd>
          </dl>
        </Cartao>
      </div>

      <div className="grade-graficos">
        <Cartao
          titulo="Resistências por idade"
          legenda="Média dos corpos de prova, em MPa (desvio padrão entre parênteses)"
          largura="total"
        >
          <div className="tabela-envolucro" style={{ border: 'none' }}>
            <table className="tabela">
              <thead>
                <tr>
                  <th>Ensaio</th>
                  {IDADES.map((i) => (
                    <th key={i} className="numerico">
                      {i} dias
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { tipo: 'FLEXAO', rotulo: 'Tração na flexão (3 CPs)' },
                  { tipo: 'COMPRESSAO', rotulo: 'Compressão (6 CPs)' },
                ].map((linha) => (
                  <tr key={linha.tipo}>
                    <td>{linha.rotulo}</td>
                    {IDADES.map((idade) => {
                      const r = resistencia(linha.tipo, idade);
                      return (
                        <td key={idade} className="numerico">
                          {r?.media === null || r === undefined ? (
                            <span className="vazio">—</span>
                          ) : (
                            <>
                              {num(r.media, 2)}
                              {r.desvioPadrao !== null ? (
                                <span
                                  style={{
                                    color: 'var(--tinta-suave)',
                                    fontSize: 12,
                                  }}
                                >
                                  {' '}
                                  ({num(r.desvioPadrao, 2)})
                                </span>
                              ) : null}
                            </>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Cartao>

        <Cartao
          titulo="Estado endurecido"
          legenda="Densidade e módulo de elasticidade dinâmico por corpo de prova"
          largura="total"
        >
          {f.endurecidos.length === 0 ? (
            <p className="vazio" style={{ fontSize: 13 }}>
              Sem corpos de prova registrados.
            </p>
          ) : (
            <div className="tabela-envolucro" style={{ border: 'none' }}>
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Idade</th>
                    <th>CP</th>
                    <th className="numerico">Volume (cm³)</th>
                    <th className="numerico">Massa (g)</th>
                    <th className="numerico">Massa esp. (kg/m³)</th>
                    <th className="numerico">Módulo (MPa)</th>
                  </tr>
                </thead>
                <tbody>
                  {f.endurecidos.flatMap((bloco) => [
                    ...bloco.corpos.map((cp) => (
                      <tr key={`${bloco.idadeDias}-${cp.indice}`}>
                        <td>{bloco.idadeDias} dias</td>
                        <td>CP {cp.indice}</td>
                        <td className="numerico">{num(cp.volume, 2)}</td>
                        <td className="numerico">{num(cp.massa, 0)}</td>
                        <td className="numerico">{num(cp.massaEspecifica, 1)}</td>
                        <td className="numerico">{num(cp.modulo, 0)}</td>
                      </tr>
                    )),
                    <tr
                      key={`${bloco.idadeDias}-media`}
                      style={{ fontWeight: 600 }}
                    >
                      <td>{bloco.idadeDias} dias</td>
                      <td>Média</td>
                      <td className="numerico">—</td>
                      <td className="numerico">—</td>
                      <td className="numerico">{num(bloco.densidadeMedia, 1)}</td>
                      <td className="numerico">{num(bloco.moduloMedio, 0)}</td>
                    </tr>,
                  ])}
                </tbody>
              </table>
            </div>
          )}
        </Cartao>

        <Cartao titulo="Composição" legenda="Teor de cada material, em % da massa seca">
          {f.componentes.length === 0 ? (
            <p className="vazio" style={{ fontSize: 13 }}>
              Composição não informada na planilha.
            </p>
          ) : (
            <dl className="lista-dados">
              {f.componentes
                .slice()
                .sort((a, b) => b.teor - a.teor)
                .map((c) => (
                  <Fragment key={c.materialId}>
                    <dt>
                      {c.material.nome}
                      <span
                        style={{
                          color: 'var(--tinta-suave)',
                          fontSize: 12,
                          marginLeft: 6,
                        }}
                      >
                        {categoria(c.material.categoria)}
                      </span>
                    </dt>
                    <dd>{num(c.teor, 2)} %</dd>
                  </Fragment>
                ))}
            </dl>
          )}
        </Cartao>

        <Cartao
          titulo="Distribuição granulométrica"
          legenda="Frequência de partículas por diâmetro de peneira"
        >
          {f.granulometria.length === 0 ? (
            <p className="vazio" style={{ fontSize: 13 }}>
              Sem granulometria registrada.
            </p>
          ) : (
            <GraficoGranulometria
              curvas={[
                {
                  formulacaoId: f.id,
                  nomenclatura: f.nomenclatura,
                  pontos: f.granulometria.map((p) => ({
                    peneiraMm: p.peneiraMm,
                    rotulo: peneira(p.peneiraMm),
                    frequencia: p.frequencia,
                  })),
                },
              ]}
            />
          )}
        </Cartao>
      </div>
    </>
  );
}
