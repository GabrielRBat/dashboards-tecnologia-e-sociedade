/**
 * Ponte para os endpoints de usuários da API.
 *
 * A tela de equipe é um componente de cliente e não alcança o cookie httpOnly;
 * este arquivo põe o token no cabeçalho. A autorização continua sendo da API —
 * aqui não há verificação de papel, e não deve haver: duas fontes de verdade
 * para permissão é como uma delas fica desatualizada.
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
        ...(corpoEnviado ? { 'Content-Type': 'application/json' } : {}),
      },
      body: corpoEnviado ? JSON.stringify(corpoEnviado) : undefined,
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
  const { acao, id, dados } = (await requisicao.json()) as {
    acao:
      | 'criar'
      | 'atualizar'
      | 'redefinir-senha'
      | 'remover'
      | 'grupo-criar'
      | 'grupo-atualizar'
      | 'grupo-remover';
    id?: string;
    dados?: unknown;
  };

  switch (acao) {
    case 'criar':
      return repassar('/usuarios', 'POST', dados);
    case 'atualizar':
      return repassar(`/usuarios/${id}`, 'PUT', dados);
    case 'redefinir-senha':
      return repassar(`/usuarios/${id}/redefinir-senha`, 'POST', dados);
    case 'remover':
      return repassar(`/usuarios/${id}`, 'DELETE');
    case 'grupo-criar':
      return repassar('/grupos', 'POST', dados);
    case 'grupo-atualizar':
      return repassar(`/grupos/${id}`, 'PUT', dados);
    case 'grupo-remover':
      return repassar(`/grupos/${id}`, 'DELETE');
    default:
      return NextResponse.json({ mensagem: 'Ação desconhecida.' }, { status: 400 });
  }
}
