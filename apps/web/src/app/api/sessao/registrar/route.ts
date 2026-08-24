/**
 * Criação de conta.
 *
 * Fala com a API e, dando certo, já grava o cookie de sessão — a pessoa entra
 * direto, sem passar pela tela de login.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_SESSAO, opcoesCookie } from '@/lib/sessao';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

export async function POST(requisicao: Request) {
  let dadosEnviados: unknown;
  try {
    dadosEnviados = await requisicao.json();
  } catch {
    return NextResponse.json({ mensagem: 'Requisição inválida.' }, { status: 400 });
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${BASE}/api/auth/registrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dadosEnviados),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      { mensagem: `Não foi possível falar com a API em ${BASE}.` },
      { status: 503 },
    );
  }

  const corpo: unknown = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    const mensagem =
      corpo && typeof corpo === 'object' && 'message' in corpo
        ? String((corpo as { message: unknown }).message)
        : 'Não foi possível criar a conta.';
    return NextResponse.json({ mensagem }, { status: resposta.status });
  }

  const dados = corpo as { token: string; expiraEmSegundos: number };
  cookies().set(COOKIE_SESSAO, dados.token, opcoesCookie(dados.expiraEmSegundos));

  return NextResponse.json({ criada: true });
}
