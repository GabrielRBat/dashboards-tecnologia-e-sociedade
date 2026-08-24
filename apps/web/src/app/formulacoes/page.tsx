import Link from 'next/link';
import { Suspense } from 'react';
import { BarraFiltros } from '@/components/filtros';
import { ApiForaDoAr } from '@/components/estado';
import {
  ApiIndisponivel,
  ParametrosBusca,
  listarFormulacoes,
  montarQuery,
  obterOpcoes,
} from '@/lib/api';
import { data, num, origem, tipoProjeto } from '@/lib/formato';

export const dynamic = 'force-dynamic';

export default async function PaginaFormulacoes({
  searchParams,
}: {
  searchParams: ParametrosBusca;
}) {
  const query = montarQuery(searchParams);

  try {
    const [pagina, opcoes] = await Promise.all([
      listarFormulacoes(query),
      obterOpcoes(),
    ]);

    const primeira = (pagina.pagina - 1) * pagina.porPagina + 1;
    const ultima = Math.min(pagina.pagina * pagina.porPagina, pagina.total);
    const totalPaginas = Math.max(1, Math.ceil(pagina.total / pagina.porPagina));

    const linkPagina = (n: number): string => {
      const p = new URLSearchParams();
      for (const [k, v] of Object.entries(searchParams)) {
        if (k === 'pagina' || v === undefined) continue;
        if (Array.isArray(v)) v.forEach((x) => p.append(k, x));
        else p.set(k, v);
      }
      p.set('pagina', String(n));
      return `/formulacoes?${p.toString()}`;
    };

    return (
      <>
        <h1 className="titulo-pagina">Formulações</h1>
        <p className="subtitulo-pagina">
          Todos os registros da planilha de alimentação, com os valores já
          calculados.
        </p>

        <Suspense fallback={null}>
          <BarraFiltros desenvolvedores={opcoes.desenvolvedores} />
        </Suspense>

        {pagina.total === 0 ? (
          <div className="aviso">
            Nenhuma formulação encontrada com esses filtros.
          </div>
        ) : (
          <>
            <div className="tabela-envolucro">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Nº</th>
                    <th>Nomenclatura</th>
                    <th>Tipo</th>
                    <th>Origem</th>
                    <th>Data</th>
                    <th>Desenvolvedor</th>
                    <th className="numerico">Água/lig.</th>
                    <th className="numerico">Ret. água (%)</th>
                    <th className="numerico">Dens. fresco</th>
                    <th className="numerico">Flexão 28d</th>
                    <th className="numerico">Compr. 28d</th>
                    <th>Preenchimento</th>
                  </tr>
                </thead>
                <tbody>
                  {pagina.itens.map((f) => (
                    <tr key={f.id}>
                      <td className="numerico">{f.numeracao}</td>
                      <td>
                        <Link
                          href={`/formulacoes/${f.id}`}
                          style={{ fontWeight: 550 }}
                        >
                          {f.nomenclatura}
                        </Link>
                      </td>
                      <td>
                        {f.tipoProjeto ? (
                          <span className="etiqueta" title={tipoProjeto(f.tipoProjeto)}>
                            {f.tipoProjeto}
                          </span>
                        ) : (
                          <span className="vazio">—</span>
                        )}
                      </td>
                      <td>{origem(f.origem)}</td>
                      <td>{data(f.data)}</td>
                      <td>{f.desenvolvedor ?? <span className="vazio">—</span>}</td>
                      <td className="numerico">
                        {num(f.calculados.relacaoAguaLigante, 3)}
                      </td>
                      <td className="numerico">
                        {num(f.calculados.retencaoAgua, 1)}
                      </td>
                      <td className="numerico">
                        {num(f.calculados.densidadeFresco, 0)}
                      </td>
                      <td className="numerico">{num(f.calculados.flexao28d, 2)}</td>
                      <td className="numerico">
                        {num(f.calculados.compressao28d, 2)}
                      </td>
                      <td>
                        <span className="barra-completude">
                          <span className="barra-trilho">
                            <span
                              className="barra-preenchida"
                              style={{ width: `${f.calculados.completude}%` }}
                            />
                          </span>
                          <span className="numerico" style={{ fontSize: 12 }}>
                            {f.calculados.completude}%
                          </span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="paginacao">
              <span>
                {primeira}–{ultima} de {pagina.total}
              </span>
              {pagina.pagina > 1 ? (
                <Link className="botao" href={linkPagina(pagina.pagina - 1)}>
                  Anterior
                </Link>
              ) : null}
              {pagina.pagina < totalPaginas ? (
                <Link className="botao" href={linkPagina(pagina.pagina + 1)}>
                  Próxima
                </Link>
              ) : null}
            </div>
          </>
        )}
      </>
    );
  } catch (e) {
    if (e instanceof ApiIndisponivel) {
      return <ApiForaDoAr mensagem={e.message} />;
    }
    throw e;
  }
}
