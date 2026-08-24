import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_SESSAO } from '@/lib/sessao';

/**
 * Proteção das rotas do frontend.
 *
 * **Isto é conveniência, não segurança.** O middleware só olha se existe cookie
 * de sessão; ele não valida a assinatura do token. Quem manda de verdade é a
 * API, que confere o token e o usuário no banco a cada requisição — sem ela,
 * bastaria forjar um cookie qualquer para ver os dados.
 *
 * O que o middleware resolve é a experiência: manda para o login antes de
 * carregar uma tela que só mostraria erro.
 */

/** Rotas que existem justamente para quem ainda não entrou. */
const ROTAS_ABERTAS = ['/login', '/registrar'];

export function middleware(requisicao: NextRequest) {
  const { pathname, search } = requisicao.nextUrl;
  const temSessao = Boolean(requisicao.cookies.get(COOKIE_SESSAO)?.value);
  const rotaAberta = ROTAS_ABERTAS.some((r) => pathname.startsWith(r));

  if (!temSessao && !rotaAberta) {
    const destino = requisicao.nextUrl.clone();
    destino.pathname = '/login';
    /*
     * Guarda para onde a pessoa queria ir, e devolve depois do login. Sem isso,
     * abrir um link de uma formulação específica com a sessão vencida jogaria a
     * pessoa na visão geral, e ela teria de procurar o registro de novo.
     */
    destino.search = `?destino=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(destino);
  }

  // Já autenticado não tem o que fazer na tela de login.
  if (temSessao && rotaAberta) {
    const destino = requisicao.nextUrl.clone();
    destino.pathname = '/';
    destino.search = '';
    return NextResponse.redirect(destino);
  }

  /*
   * O caminho atual segue num cabeçalho para o servidor: quando a sessão vence,
   * o cliente da API precisa saber para onde devolver a pessoa depois do login,
   * e um Server Component não enxerga a URL sozinho.
   */
  const cabecalhos = new Headers(requisicao.headers);
  cabecalhos.set('x-pathname', pathname + search);
  return NextResponse.next({ request: { headers: cabecalhos } });
}

export const config = {
  /*
   * Deixa de fora os arquivos internos do Next, o favicon e as rotas de API do
   * próprio frontend — `/api/sessao` precisa responder ao login de quem ainda
   * não tem cookie, e barrá-la aqui tornaria impossível entrar.
   */
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|api/).*)'],
};
