import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ApiForaDoAr } from '@/components/estado';
import { ConstrutorDashboard } from '@/components/construtor-dashboard';
import {
  ApiIndisponivel,
  listarGrupos,
  obterCatalogoMetricas,
  obterDashboard,
} from '@/lib/api';
import { ehRedirecionamento } from '@/lib/erros';

export const dynamic = 'force-dynamic';

export default async function PaginaEditarDashboard({
  params,
}: {
  params: { id: string };
}) {
  let catalogo;
  let dashboard;
  let grupos: Awaited<ReturnType<typeof listarGrupos>> = [];
  try {
    [catalogo, dashboard] = await Promise.all([
      obterCatalogoMetricas(),
      obterDashboard(params.id),
    ]);
    grupos = await listarGrupos().catch(() => []);
  } catch (e) {
    // Sessão vencida vira redirect, que é uma exceção: precisa passar.
    if (ehRedirecionamento(e)) throw e;
    if (e instanceof ApiIndisponivel) return <ApiForaDoAr mensagem={e.message} />;
    notFound();
  }

  return (
    <>
      <Link className="voltar" href={`/dashboards/${params.id}`}>
        ← Voltar para o dashboard
      </Link>
      <h1 className="titulo-pagina">Editar “{dashboard.nome}”</h1>
      <p className="subtitulo-pagina">
        Este dashboard é compartilhado — as mudanças valem para toda a equipe.
      </p>
      <ConstrutorDashboard
        catalogo={catalogo}
        dashboard={dashboard}
        grupos={grupos}
      />
    </>
  );
}
