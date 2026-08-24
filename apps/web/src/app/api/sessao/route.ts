/**
 * Rotas de sessão do frontend.
 *
 * Existem para o token virar um cookie `httpOnly` no domínio do Next. A API
 * responde noutra porta; se ela gravasse o cookie, ele pertenceria a ela e o
 * frontend não o alcançaria. Aqui o Next chama a API, recebe o token e o guarda
 * de um jeito que o JavaScript da página não consegue ler.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_SESSAO, opcoesCookie } from '@/lib/sessao';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

/** Login: troca e-mail e senha por um cookie de sessão. */
export async function POST(requisicao: Request) {
  let credenciais: { email?: string; senha?: string };
  try {
    credenciais = (await requisicao.json()) as { email?: string; senha?: string };
  } catch {
    return NextResponse.json({ mensagem: 'Requisição inválida.' }, { status: 400 });
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: credenciais.email,
        senha: credenciais.senha,
      }),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      { mensagem: `Não foi possível falar com a API em ${BASE}. Ela está rodando?` },
      { status: 503 },
    );
  }

  const corpo: unknown = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    const mensagem =
      corpo && typeof corpo === 'object' && 'message' in corpo
        ? String((corpo as { message: unknown }).message)
        : 'Não foi possível entrar.';
    // Repassa o status da API: 401 para credencial errada, 429 para excesso de
    // tentativas — a tela de login trata os dois de formas diferentes.
    return NextResponse.json({ mensagem }, { status: resposta.status });
  }

  const dados = corpo as {
    token: string;
    expiraEmSegundos: number;
    usuario: { precisaTrocarSenha: boolean };
  };

  cookies().set(COOKIE_SESSAO, dados.token, opcoesCookie(dados.expiraEmSegundos));

  // O token não volta no corpo: ele já está no cookie, e devolvê-lo aqui o
  // colocaria ao alcance do JavaScript da página — justamente o que evitamos.
  return NextResponse.json({
    precisaTrocarSenha: dados.usuario.precisaTrocarSenha,
  });
}

/** Sair: apaga o cookie. */
export async function DELETE() {
  cookies().set(COOKIE_SESSAO, '', opcoesCookie(0));
  return NextResponse.json({ saiu: true });
}
