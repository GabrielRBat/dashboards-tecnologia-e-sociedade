import { redirect } from 'next/navigation';
import { ApiForaDoAr } from '@/components/estado';
import { GestaoEquipe } from '@/components/gestao-equipe';
import { ApiIndisponivel, SemPermissao, listarUsuarios } from '@/lib/api';
import { ehRedirecionamento } from '@/lib/erros';
import { obterSessaoAtual } from '@/lib/sessao-servidor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Equipe · Dashboard de Argamassas' };

export default async function PaginaEquipe() {
  const sessao = await obterSessaoAtual();
  if (!sessao) redirect('/login');

  /*
   * A checagem que vale é a da API — esta só evita renderizar uma tela que
   * mostraria erro. Quem não é administrador nem vê o item no menu.
   */
  if (sessao.papel !== 'ADMIN') {
    return (
      <div className="aviso aviso-erro">
        <strong>Acesso restrito.</strong> Só administradores gerenciam a equipe.
      </div>
    );
  }

  let usuarios;
  try {
    usuarios = await listarUsuarios();
  } catch (e) {
    // Sessão vencida vira redirect, que é uma exceção: precisa passar.
    if (ehRedirecionamento(e)) throw e;
    if (e instanceof ApiIndisponivel) return <ApiForaDoAr mensagem={e.message} />;
    if (e instanceof SemPermissao) {
      return (
        <div className="aviso aviso-erro">
          <strong>Acesso restrito.</strong> {e.message}
        </div>
      );
    }
    throw e;
  }

  return (
    <>
      <h1 className="titulo-pagina">Equipe</h1>
      <p className="subtitulo-pagina">
        Quem tem acesso ao sistema. Não há auto-registro: as contas são criadas
        aqui.
      </p>
      <GestaoEquipe usuarios={usuarios} euId={sessao.id} />
    </>
  );
}
