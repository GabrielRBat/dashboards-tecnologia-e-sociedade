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

  const url = new URL(requisicao.url);
  const validar = url.searchParams.get('acao') === 'validar';

  let resposta: Response;
  try {
    resposta = await fetch(
      `${BASE}/api/importacao/planilha${validar ? '/validar' : ''}`,
      {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: corpo,
      cache: 'no-store',
      },
    );
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

export async function GET(requisicao: Request) {
  const token = obterToken();
  if (!token) {
    return NextResponse.json({ mensagem: 'Sessão expirada.' }, { status: 401 });
  }

  const url = new URL(requisicao.url);
  const template = url.searchParams.get('acao') === 'template';

  let resposta: Response;
  try {
    resposta = await fetch(
      `${BASE}/api/importacao/${template ? 'template' : 'historico'}`,
      {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      },
    );
  } catch {
    return NextResponse.json(
      { mensagem: 'Não foi possível falar com a API.' },
      { status: 503 },
    );
  }

  if (template && resposta.ok) {
    const dados = await resposta.arrayBuffer();
    return new Response(dados, {
      headers: {
        'Content-Type':
          resposta.headers.get('Content-Type') ??
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition':
          resposta.headers.get('Content-Disposition') ??
          'attachment; filename="template-importacao-argamassas.xlsx"',
      },
    });
  }

  const dados: unknown = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    const mensagem =
      dados && typeof dados === 'object' && 'message' in dados
        ? String((dados as { message: unknown }).message)
        : 'Não foi possível carregar o histórico.';
    return NextResponse.json({ mensagem }, { status: resposta.status });
  }

  return NextResponse.json(dados);
}
