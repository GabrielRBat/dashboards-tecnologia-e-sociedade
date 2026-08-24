/**
 * Sessão do lado do frontend.
 *
 * **O token fica num cookie `httpOnly`, não no `localStorage`.** É a decisão de
 * segurança mais importante desta camada: qualquer script que rode na página
 * — uma dependência comprometida, um trecho injetado — lê o `localStorage`
 * inteiro e leva a sessão embora. Um cookie `httpOnly` é invisível para
 * JavaScript; só o servidor o enxerga.
 *
 * O cookie é gravado pelo **próprio Next**, não pela API. A API responde em
 * `:3333` e o navegador guardaria o cookie para aquele domínio, fora do alcance
 * do frontend em `:3000`. Então: a rota do Next chama a API, recebe o token e o
 * grava como cookie no seu próprio domínio; depois, cada requisição de servidor
 * o lê e o envia no cabeçalho `Authorization`.
 */

import { cookies } from 'next/headers';

export const COOKIE_SESSAO = 'argamassas_sessao';

/** Lê o token da sessão. Só funciona em componente/rota de servidor. */
export function obterToken(): string | null {
  return cookies().get(COOKIE_SESSAO)?.value ?? null;
}

/** Opções do cookie, num lugar só para não divergirem entre gravar e apagar. */
export function opcoesCookie(maxAgeSegundos: number) {
  return {
    httpOnly: true,
    // Em produção o site roda em HTTPS e o cookie não deve trafegar sem ele.
    // Em desenvolvimento é http://localhost, onde `secure` impediria o login.
    secure: process.env.NODE_ENV === 'production',
    /*
     * `lax` bloqueia o envio do cookie em requisições vindas de outro site, o
     * que corta a maior parte dos ataques de CSRF, sem quebrar a navegação
     * normal por links.
     */
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSegundos,
  };
}
