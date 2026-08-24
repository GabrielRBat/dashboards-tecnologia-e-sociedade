'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Usuario } from '@/lib/api';

/** Chama a ponte do Next, que põe o token e repassa à API. */
async function acao(
  corpo: { acao: string; id?: string; dados?: unknown },
): Promise<{ ok: true } | { ok: false; mensagem: string }> {
  const resposta = await fetch('/api/equipe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  const dados: unknown = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    return {
      ok: false,
      mensagem:
        dados && typeof dados === 'object' && 'mensagem' in dados
          ? String((dados as { mensagem: unknown }).mensagem)
          : 'A operação falhou.',
    };
  }
  return { ok: true };
}

/**
 * Sorteia uma senha provisória legível.
 *
 * Sem caracteres ambíguos (l, I, 1, O, 0): ela vai ser lida da tela e repassada
 * a outra pessoa, e "l ou 1?" faz alguém escolher algo fraco no lugar.
 * `crypto.getRandomValues`, nunca `Math.random()`, que é previsível.
 */
function sortearSenha(tamanho = 16): string {
  const alfabeto = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint32Array(tamanho);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join('');
}

export function GestaoEquipe({
  usuarios,
  euId,
}: {
  usuarios: Usuario[];
  euId: string;
}) {
  const router = useRouter();
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [papel, setPapel] = useState<'ADMIN' | 'MEMBRO'>('MEMBRO');
  const [senhaGerada, setSenhaGerada] = useState('');
  const [criado, setCriado] = useState<{ email: string; senha: string } | null>(
    null,
  );

  const executar = useCallback(
    async (corpo: { acao: string; id?: string; dados?: unknown }) => {
      setOcupado(true);
      setErro('');
      const r = await acao(corpo);
      if (!r.ok) setErro(r.mensagem);
      else router.refresh();
      setOcupado(false);
      return r.ok;
    },
    [router],
  );

  async function criarConta(evento: React.FormEvent) {
    evento.preventDefault();
    const senha = senhaGerada || sortearSenha();

    const deu = await executar({
      acao: 'criar',
      dados: { nome, email, senha, papel },
    });

    if (deu) {
      // Mostrado uma vez: a senha não fica gravada em lugar nenhum, e quem a
      // recebe é obrigado a trocá-la no primeiro acesso.
      setCriado({ email, senha });
      setNome('');
      setEmail('');
      setPapel('MEMBRO');
      setSenhaGerada('');
    }
  }

  async function redefinir(u: Usuario) {
    const senha = sortearSenha();
    const deu = await executar({
      acao: 'redefinir-senha',
      id: u.id,
      dados: { senhaNova: senha },
    });
    if (deu) setCriado({ email: u.email, senha });
  }

  async function excluir(u: Usuario) {
    const certeza = window.confirm(
      `Excluir a conta de ${u.nome} (${u.email})? Esta ação não pode ser desfeita.`,
    );
    if (certeza) await executar({ acao: 'remover', id: u.id });
  }

  return (
    <div className="construtor">
      {erro ? (
        <div className="aviso aviso-erro" role="alert">
          {erro}
        </div>
      ) : null}

      {criado ? (
        <div className="aviso aviso-destaque" role="status">
          <strong>Senha provisória de {criado.email}:</strong>
          <code className="senha-provisoria">{criado.senha}</code>
          <p className="nota-grafico" style={{ marginTop: 8 }}>
            Anote e entregue à pessoa por um canal seguro. Ela não aparece de
            novo — não fica guardada em lugar nenhum, só o hash. O sistema exige
            a troca no primeiro acesso.
          </p>
          <button
            type="button"
            className="botao botao-discreto"
            onClick={() => setCriado(null)}
          >
            Já anotei
          </button>
        </div>
      ) : null}

      <section className="cartao">
        <h2 className="cartao-titulo">Nova conta</h2>
        <p className="cartao-legenda">
          A senha é sorteada pelo sistema e mostrada uma única vez.
        </p>

        <form className="barra-filtros" onSubmit={(e) => void criarConta(e)}>
          <label className="campo">
            <span className="campo-rotulo">Nome</span>
            <input
              className="campo-medio"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome de quem vai usar"
            />
          </label>

          <label className="campo">
            <span className="campo-rotulo">E-mail</span>
            <input
              className="campo-medio"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pessoa@exemplo.com"
            />
          </label>

          <label className="campo">
            <span className="campo-rotulo">Papel</span>
            <select
              value={papel}
              onChange={(e) => setPapel(e.target.value as 'ADMIN' | 'MEMBRO')}
            >
              <option value="MEMBRO">Membro</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </label>

          <button
            type="submit"
            className="botao botao-primario"
            disabled={ocupado || !nome || !email}
          >
            {ocupado ? 'Criando…' : 'Criar conta'}
          </button>
        </form>
      </section>

      <section className="cartao">
        <h2 className="cartao-titulo">Contas ({usuarios.length})</h2>
        <div className="tabela-envolucro">
          <table className="tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Papel</th>
                <th>Situação</th>
                <th>Último acesso</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>
                    {u.nome}
                    {u.id === euId ? (
                      <span className="etiqueta" style={{ marginLeft: 6 }}>
                        você
                      </span>
                    ) : null}
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <select
                      value={u.papel}
                      disabled={ocupado}
                      onChange={(e) =>
                        void executar({
                          acao: 'atualizar',
                          id: u.id,
                          dados: { papel: e.target.value },
                        })
                      }
                    >
                      <option value="MEMBRO">Membro</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </td>
                  <td>
                    <span className={u.ativo ? 'etiqueta' : 'etiqueta etiqueta-off'}>
                      {u.ativo ? 'Ativa' : 'Desativada'}
                    </span>
                    {u.precisaTrocarSenha ? (
                      <span className="etiqueta" style={{ marginLeft: 6 }}>
                        troca pendente
                      </span>
                    ) : null}
                  </td>
                  <td className="vazio">
                    {u.ultimoAcessoEm
                      ? new Date(u.ultimoAcessoEm).toLocaleString('pt-BR')
                      : 'nunca entrou'}
                  </td>
                  <td>
                    <div className="acoes-linha">
                      <button
                        type="button"
                        className="botao botao-discreto"
                        disabled={ocupado}
                        onClick={() =>
                          void executar({
                            acao: 'atualizar',
                            id: u.id,
                            dados: { ativo: !u.ativo },
                          })
                        }
                      >
                        {u.ativo ? 'Desativar' : 'Reativar'}
                      </button>
                      <button
                        type="button"
                        className="botao botao-discreto"
                        disabled={ocupado}
                        onClick={() => void redefinir(u)}
                      >
                        Nova senha
                      </button>
                      {u.id === euId ? null : (
                        <button
                          type="button"
                          className="botao botao-discreto botao-perigo"
                          disabled={ocupado}
                          onClick={() => void excluir(u)}
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="nota-grafico">
          Desativar mantém o histórico e corta o acesso na hora — a sessão aberta
          para de valer na requisição seguinte. Excluir apaga a conta. O sistema
          impede rebaixar, desativar ou excluir o último administrador ativo.
        </p>
      </section>
    </div>
  );
}
