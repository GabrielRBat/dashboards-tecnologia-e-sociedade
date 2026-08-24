import Link from 'next/link';
import { ApiForaDoAr } from '@/components/estado';
import { ConstrutorDashboard } from '@/components/construtor-dashboard';
import { ApiIndisponivel, obterCatalogoMetricas } from '@/lib/api';
import { ehRedirecionamento } from '@/lib/erros';

export const dynamic = 'force-dynamic';

export default async function PaginaNovoDashboard() {
  let catalogo;
  try {
    catalogo = await obterCatalogoMetricas();
  } catch (e) {
    // Sessão vencida vira redirect, que é uma exceção: precisa passar.
    if (ehRedirecionamento(e)) throw e;
    if (e instanceof ApiIndisponivel) return <ApiForaDoAr mensagem={e.message} />;
    throw e;
  }

  return (
    <>
      <Link className="voltar" href="/dashboards">
        ← Voltar para dashboards
      </Link>
      <h1 className="titulo-pagina">Novo dashboard</h1>
      <p className="subtitulo-pagina">
        Escolha o tipo de gráfico e as métricas. Combinações que produziriam um
        resultado sem significado são recusadas, com o motivo.
      </p>
      <ConstrutorDashboard catalogo={catalogo} dashboard={null} />
    </>
  );
}
