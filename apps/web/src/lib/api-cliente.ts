'use client';

/**
 * Chamadas feitas do navegador.
 *
 * Separado de `api.ts` por dois motivos, e os dois importam:
 *
 * 1. **`api.ts` lê o cookie de sessão** com `next/headers`, que só existe no
 *    servidor. Importá-lo de um componente de cliente quebra a compilação.
 * 2. **O navegador não tem o token** — o cookie é `httpOnly`. Por isso tudo
 *    aqui passa pelas rotas do próprio Next, que acrescentam o cabeçalho.
 */

import type {
  Dashboard,
  PainelCalculado,
  PainelConfig,
  TipoPainel,
  Validacao,
  Visibilidade,
} from './api';

async function ponte<T>(corpo: {
  acao: string;
  id?: string;
  dados?: unknown;
  query?: string;
}): Promise<T> {
  const resposta = await fetch('/api/dashboards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });

  const dados: unknown = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    throw new Error(
      dados && typeof dados === 'object' && 'mensagem' in dados
        ? String((dados as { mensagem: unknown }).mensagem)
        : `A API respondeu ${resposta.status}.`,
    );
  }

  return dados as T;
}

export const validarPainel = (
  tipo: TipoPainel,
  metricaX: string,
  metricaY?: string | null,
) => {
  const q = new URLSearchParams({ tipo, metricaX });
  if (metricaY) q.set('metricaY', metricaY);
  return ponte<Validacao>({ acao: 'validar', query: q.toString() });
};

export const previaPainel = (painel: PainelConfig, filtros: string) =>
  ponte<PainelCalculado>({
    acao: 'previa',
    dados: {
      painel,
      filtros: Object.fromEntries(new URLSearchParams(filtros.replace(/^\?/, ''))),
    },
  });

export const criarDashboard = (dados: {
  nome: string;
  descricao?: string;
  paineis?: PainelConfig[];
  visibilidade?: Visibilidade;
  grupos?: string[];
}) => ponte<Dashboard>({ acao: 'criar', dados });

export const salvarDashboard = (
  id: string,
  dados: {
    nome?: string;
    descricao?: string;
    paineis?: PainelConfig[];
    visibilidade?: Visibilidade;
    grupos?: string[];
  },
) => ponte<Dashboard>({ acao: 'salvar', id, dados });

export const excluirDashboard = (id: string) =>
  ponte<{ removido: boolean }>({ acao: 'excluir', id });
