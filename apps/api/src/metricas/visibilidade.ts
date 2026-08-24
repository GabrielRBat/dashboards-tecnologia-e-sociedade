/**
 * Quem enxerga e quem edita um dashboard.
 *
 * Funções puras, sem banco, para poderem ser testadas exaustivamente. Regra de
 * acesso escondida dentro de uma consulta SQL é regra que ninguém revisa — e
 * aqui um engano não devolve dado errado, devolve dado de quem não deveria vê-lo.
 */

export type Visibilidade = 'TODOS' | 'GRUPOS' | 'PRIVADO';

export interface DashboardParaAcesso {
  criadoPor: string | null;
  visibilidade: Visibilidade;
  /** Ids dos grupos que enxergam, quando a visibilidade é `GRUPOS`. */
  grupos: string[];
}

export interface QuemPergunta {
  id: string;
  papel: 'ADMIN' | 'MEMBRO';
  /** Ids dos grupos a que a pessoa pertence. */
  grupos: string[];
}

/**
 * Pode ver?
 *
 * - **Administrador vê tudo.** Sem isso, o dashboard privado de quem saiu da
 *   equipe ficaria órfão e invisível para sempre, sem ninguém capaz de limpá-lo.
 * - **Quem criou sempre vê o próprio**, mesmo que tenha saído de todos os grupos
 *   que escolheu — do contrário perderia acesso ao que fez.
 * - **`GRUPOS` sem nenhum grupo marcado não vira "todos".** Fica igual a
 *   privado: na dúvida, restringir. O contrário publicaria o painel para a
 *   equipe inteira por causa de um campo esquecido.
 */
export function podeVer(
  dashboard: DashboardParaAcesso,
  quem: QuemPergunta,
): boolean {
  if (quem.papel === 'ADMIN') return true;
  if (dashboard.criadoPor !== null && dashboard.criadoPor === quem.id) return true;

  switch (dashboard.visibilidade) {
    case 'TODOS':
      return true;
    case 'GRUPOS':
      return dashboard.grupos.some((g) => quem.grupos.includes(g));
    case 'PRIVADO':
      return false;
    default:
      // Visibilidade desconhecida (banco adiante do código): negar.
      return false;
  }
}

/**
 * Pode editar ou excluir?
 *
 * Mais estrito que ver, de propósito: enxergar um painel não dá o direito de
 * mudá-lo para todo mundo. Autor e administrador, só.
 *
 * **Dashboard sem autor é editável por qualquer pessoa que o veja.** São os
 * criados antes de existir login: não há dono para reclamar, e travá-los em
 * "só administrador" tiraria da equipe algo que hoje é dela.
 */
export function podeEditar(
  dashboard: DashboardParaAcesso,
  quem: QuemPergunta,
): boolean {
  if (quem.papel === 'ADMIN') return true;
  if (dashboard.criadoPor === null) return podeVer(dashboard, quem);
  return dashboard.criadoPor === quem.id;
}

/** Texto curto do porquê da recusa, para a mensagem de erro. */
export function motivoSemAcesso(dashboard: DashboardParaAcesso): string {
  if (dashboard.visibilidade === 'PRIVADO') {
    return 'Este dashboard é particular de quem o criou.';
  }
  if (dashboard.visibilidade === 'GRUPOS') {
    return dashboard.grupos.length === 0
      ? 'Este dashboard está restrito a grupos, mas nenhum grupo foi escolhido — só quem o criou o enxerga.'
      : 'Este dashboard é visível apenas para alguns grupos, e você não está neles.';
  }
  return 'Você não tem acesso a este dashboard.';
}
