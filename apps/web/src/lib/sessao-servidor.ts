import 'server-only';
import { obterToken } from './sessao';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

export interface SessaoAtual {
  id: string;
  nome: string;
  email: string;
  papel: 'ADMIN' | 'MEMBRO';
  precisaTrocarSenha: boolean;
}

/**
 * Quem está logado, perguntando à API.
 *
 * Poderíamos ler o conteúdo do token sem sair daqui e economizar a requisição —
 * mas o conteúdo do token não é verdade verificada: ele diz o que era verdade
 * quando foi emitido, até doze horas atrás. Quem foi desativado ou rebaixado
 * nesse meio-tempo continuaria aparecendo como administrador no cabeçalho.
 *
 * Devolve `null` em vez de lançar: o cabeçalho aparece em toda página, inclusive
 * na de login, e um erro aqui derrubaria a aplicação inteira.
 */
export async function obterSessaoAtual(): Promise<SessaoAtual | null> {
  const token = obterToken();
  if (!token) return null;

  try {
    const resposta = await fetch(`${BASE}/api/auth/eu`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!resposta.ok) return null;
    return (await resposta.json()) as SessaoAtual;
  } catch {
    return null;
  }
}
