/**
 * Ponte do construtor de dashboards.
 *
 * O construtor é componente de cliente e **não alcança o cookie `httpOnly`** —
 * é justamente esse o ponto do cookie. Sem esta ponte, as chamadas sairiam do
 * navegador sem token e voltariam 401.
 *
 * A autorização continua toda na API: aqui só se acrescenta o cabeçalho.
 */

import { NextResponse } from 'next/server';
import { obterToken } from '@/lib/sessao';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

async function repassar(
  caminho: string,
  metodo: string,
  corpoEnviado?: unknown,
): Promise<NextResponse> {
  const token = obterToken();
  if (!token) {
    return NextResponse.json({ mensagem: 'Sessão expirada.' }, { status: 401 });
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${BASE}/api${caminho}`, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(corpoEnviado !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: corpoEnviado !== undefined ? JSON.stringify(corpoEnviado) : undefined,
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      { mensagem: 'Não foi possível falar com a API.' },
      { status: 503 },
    );
  }

  const corpo: unknown = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    const mensagem =
      corpo && typeof corpo === 'object' && 'message' in corpo
        ? String((corpo as { message: unknown }).message)
        : 'A operação falhou.';
    return NextResponse.json({ mensagem }, { status: resposta.status });
  }

  return NextResponse.json(corpo);
}

export async function POST(requisicao: Request) {
  const { acao, id, dados, query } = (await requisicao.json()) as {
    acao: 'validar' | 'previa' | 'criar' | 'salvar' | 'excluir';
    id?: string;
    dados?: unknown;
    query?: string;
  };

  switch (acao) {
    case 'validar':
      return repassar(`/dashboards/validar?${query ?? ''}`, 'GET');
    case 'previa':
      return repassar('/dashboards/previa', 'POST', dados);
    case 'criar':
      return repassar('/dashboards', 'POST', dados);
    case 'salvar':
      return repassar(`/dashboards/${id}`, 'PUT', dados);
    case 'excluir':
      return repassar(`/dashboards/${id}`, 'DELETE');
    default:
      return NextResponse.json({ mensagem: 'Ação desconhecida.' }, { status: 400 });
  }
}
