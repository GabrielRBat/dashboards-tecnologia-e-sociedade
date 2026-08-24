import Link from 'next/link';
import { ApiForaDoAr } from '@/components/estado';
import { ApiIndisponivel, listarDashboards } from '@/lib/api';
import { ehRedirecionamento } from '@/lib/erros';

export const dynamic = 'force-dynamic';

export default async function PaginaDashboards() {
  let dashboards;
  try {
    dashboards = await listarDashboards();
  } catch (e) {
    // Sessão vencida vira redirect, que é uma exceção: precisa passar.
    if (ehRedirecionamento(e)) throw e;
    if (e instanceof ApiIndisponivel) return <ApiForaDoAr mensagem={e.message} />;
    throw e;
  }

  return (
    <>
      <h1 className="titulo-pagina">Dashboards</h1>
      <p className="subtitulo-pagina">
        Painéis montados pela equipe, com as métricas que cada análise precisa.
        São <strong>compartilhados</strong>: todo mundo vê e pode editar os mesmos.
      </p>

      <div className="acoes-grade">
        <Link className="botao botao-primario" href="/dashboards/novo">
          Novo dashboard
        </Link>
      </div>

      {dashboards.length === 0 ? (
        <div className="aviso">
          Nenhum dashboard ainda. Crie o primeiro escolhendo as métricas que
          interessam — o construtor só deixa cruzar o que faz sentido.
        </div>
      ) : (
        <div className="grade-detalhe">
          {dashboards.map((d) => (
            <Link key={d.id} className="cartao cartao-link" href={`/dashboards/${d.id}`}>
              <h2 className="cartao-titulo">{d.nome}</h2>
              {d.descricao ? (
                <p className="cartao-legenda">{d.descricao}</p>
              ) : null}
              <p className="kpi-nota">
                {d.paineis.length} gráfico(s) · atualizado em{' '}
                {new Date(d.atualizadoEm).toLocaleDateString('pt-BR')}
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
