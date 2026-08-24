/**
 * Encerra uma sessão que não vale mais e leva ao login.
 *
 * Existe porque o cookie precisa ser **apagado**, e um Server Component não pode
 * escrever cookie — só um Route Handler pode. Sem apagá-lo, o middleware veria
 * o cookie inválido, acharia que há sessão, devolveria a pessoa para a página, a
 * página descobriria o 401 e mandaria de volta para cá: um laço sem fim.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_SESSAO, opcoesCookie } from '@/lib/sessao';

export async function GET(requisicao: Request) {
  const url = new URL(requisicao.url);
  const bruto = url.searchParams.get('destino') ?? '/';
  // Só caminhos internos: um destino externo faria disto uma ponte para golpe.
  const destino = bruto.startsWith('/') && !bruto.startsWith('//') ? bruto : '/';

  cookies().set(COOKIE_SESSAO, '', opcoesCookie(0));

  const login = new URL('/login', url.origin);
  login.searchParams.set('destino', destino);
  login.searchParams.set('motivo', 'expirada');

  return NextResponse.redirect(login);
}
