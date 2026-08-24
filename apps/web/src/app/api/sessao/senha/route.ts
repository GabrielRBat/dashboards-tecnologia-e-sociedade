/**
 * Troca da própria senha.
 *
 * Passa pelo Next porque o token está num cookie `httpOnly` — o navegador não
 * consegue montar o cabeçalho `Authorization` sozinho.
 */

import { NextResponse } from 'next/server';
import { obterToken } from '@/lib/sessao';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

export async function POST(requisicao: Request) {
  const token = obterToken();
  if (!token) {
    return NextResponse.json({ mensagem: 'Sessão expirada.' }, { status: 401 });
  }

  const corpoEnviado: unknown = await requisicao.json().catch(() => null);

  const resposta = await fetch(`${BASE}/api/auth/trocar-senha`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(corpoEnviado),
    cache: 'no-store',
  });

  const corpo: unknown = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    const mensagem =
      corpo && typeof corpo === 'object' && 'message' in corpo
        ? String((corpo as { message: unknown }).message)
        : 'Não foi possível trocar a senha.';
    return NextResponse.json({ mensagem }, { status: resposta.status });
  }

  return NextResponse.json({ trocada: true });
}
