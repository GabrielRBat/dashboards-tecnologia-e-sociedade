import Link from 'next/link';
import { ApiForaDoAr } from '@/components/estado';
import { ApiIndisponivel, listarDashboards, type Dashboard } from '@/lib/api';
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
        Painéis montados pela equipe. Você vê os abertos a todos, os dos seus
        grupos e os que criou — quem monta escolhe quem enxerga.
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
              <span
                className="etiqueta-visibilidade"
                data-tipo={d.visibilidade}
                title={descreverVisibilidade(d)}
              >
                {rotuloVisibilidade(d)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function rotuloVisibilidade(d: Dashboard): string {
  if (d.visibilidade === 'PRIVADO') return 'Só de quem criou';
  if (d.visibilidade === 'GRUPOS') {
    return d.grupos.length === 1
      ? '1 grupo'
      : `${d.grupos.length} grupos`;
  }
  return 'Todos';
}

function descreverVisibilidade(d: Dashboard): string {
  if (d.visibilidade === 'PRIVADO') {
    return 'Só quem criou e os administradores enxergam.';
  }
  if (d.visibilidade === 'GRUPOS') {
    return d.grupos.length === 0
      ? 'Restrito a grupos, mas nenhum grupo foi escolhido — só quem criou enxerga.'
      : 'Visível para quem está nos grupos escolhidos.';
  }
  return 'Qualquer pessoa com acesso ao sistema enxerga.';
}
