/**
 * Ponte autenticada para upload de planilha.
 *
 * A tela de importação roda no navegador, onde o token da sessão não é visível
 * porque fica em cookie `httpOnly`. Por isso o arquivo passa primeiro por esta
 * rota do Next, que lê o cookie no servidor e encaminha o upload para a API com
 * o cabeçalho `Authorization`.
 */

import { NextResponse } from 'next/server';
import { obterToken } from '@/lib/sessao';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

export async function POST(requisicao: Request) {
  const token = obterToken();
  if (!token) {
    return NextResponse.json({ mensagem: 'Sessão expirada.' }, { status: 401 });
  }

  let corpo: FormData;
  try {
    corpo = await requisicao.formData();
  } catch {
    return NextResponse.json(
      { mensagem: 'Não foi possível ler o arquivo enviado.' },
      { status: 400 },
    );
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${BASE}/api/importacao/planilha`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: corpo,
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      { mensagem: 'Não foi possível falar com a API.' },
      { status: 503 },
    );
  }

  const dados: unknown = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    const mensagem =
      dados && typeof dados === 'object' && 'message' in dados
        ? String((dados as { message: unknown }).message)
        : 'A importação falhou.';
    return NextResponse.json({ mensagem }, { status: resposta.status });
  }

  return NextResponse.json(dados);
}
