'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Grupo, Usuario } from '@/lib/api';

/**
 * Grupos — as equipes internas que decidem quem vê quais dashboards.
 *
 * A lista de membros é editada por caixas de seleção, e não por um campo de
 * digitar: o conjunto é pequeno e conhecido, e escolher de uma lista evita o
 * erro de digitar o e-mail de alguém que não existe.
 */
export function GestaoGrupos({
  grupos,
  usuarios,
}: {
  grupos: Grupo[];
  usuarios: Usuario[];
}) {
  const router = useRouter();
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [novoMembros, setNovoMembros] = useState<string[]>([]);
  const [editando, setEditando] = useState<string | null>(null);

  const executar = useCallback(
    async (corpo: { acao: string; id?: string; dados?: unknown }) => {
      setOcupado(true);
      setErro('');
      const resposta = await fetch('/api/equipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      });
      const dados: unknown = await resposta.json().catch(() => null);
      setOcupado(false);

      if (!resposta.ok) {
        setErro(
          dados && typeof dados === 'object' && 'mensagem' in dados
            ? String((dados as { mensagem: unknown }).mensagem)
            : 'A operação falhou.',
        );
        return false;
      }
      router.refresh();
      return true;
    },
    [router],
  );

  async function criar(evento: React.FormEvent) {
    evento.preventDefault();
    const deu = await executar({
      acao: 'grupo-criar',
      dados: { nome, descricao, membros: novoMembros },
    });
    if (deu) {
      setNome('');
      setDescricao('');
      setNovoMembros([]);
    }
  }

  async function alternarMembro(grupo: Grupo, usuarioId: string) {
    const atuais = grupo.membros.map((m) => m.id);
    const novos = atuais.includes(usuarioId)
      ? atuais.filter((id) => id !== usuarioId)
      : [...atuais, usuarioId];

    await executar({
      acao: 'grupo-atualizar',
      id: grupo.id,
      dados: { membros: novos },
    });
  }

  async function excluir(grupo: Grupo) {
    const certeza = window.confirm(
      `Excluir o grupo "${grupo.nome}"?\n\n` +
        'Os dashboards que só este grupo enxergava passam a ser vistos apenas ' +
        'por quem os criou e pelos administradores. As contas não são afetadas.',
    );
    if (certeza) await executar({ acao: 'grupo-remover', id: grupo.id });
  }

  const ativos = usuarios.filter((u) => u.ativo);

  return (
    <div className="construtor">
      {erro ? (
        <div className="aviso aviso-erro" role="alert">
          {erro}
        </div>
      ) : null}

      <section className="cartao">
        <h2 className="cartao-titulo">Novo grupo</h2>
        <p className="cartao-legenda">
          Um grupo reúne pessoas para dar acesso de uma vez. Quando alguém entra
          ou sai, os dashboards acompanham sozinhos.
        </p>

        <form onSubmit={(e) => void criar(e)}>
          <div className="barra-filtros" style={{ marginBottom: 12 }}>
            <label className="campo">
              <span className="campo-rotulo">Nome</span>
              <input
                className="campo-medio"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Reologia"
              />
            </label>
            <label className="campo">
              <span className="campo-rotulo">Descrição (opcional)</span>
              <input
                className="campo-medio"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="O que este grupo faz"
              />
            </label>
            <button
              type="submit"
              className="botao botao-primario"
              disabled={ocupado || !nome.trim()}
            >
              {ocupado ? 'Criando…' : 'Criar grupo'}
            </button>
          </div>

          <fieldset className="escolha-pessoas">
            <legend className="campo-rotulo">Quem entra</legend>
            {ativos.length === 0 ? (
              <p className="cartao-legenda">Nenhuma conta ativa ainda.</p>
            ) : (
              ativos.map((u) => (
                <label key={u.id} className="pessoa-opcao">
                  <input
                    type="checkbox"
                    checked={novoMembros.includes(u.id)}
                    onChange={(e) =>
                      setNovoMembros((atuais) =>
                        e.target.checked
                          ? [...atuais, u.id]
                          : atuais.filter((id) => id !== u.id),
                      )
                    }
                  />
                  {u.nome}
                </label>
              ))
            )}
          </fieldset>
        </form>
      </section>

      <section className="cartao">
        <h2 className="cartao-titulo">Grupos ({grupos.length})</h2>

        {grupos.length === 0 ? (
          <p className="cartao-legenda">
            Nenhum grupo ainda. Sem grupos, um dashboard só pode ser aberto a
            todos ou particular de quem o criou.
          </p>
        ) : (
          <ul className="lista-grupos">
            {grupos.map((g) => (
              <li key={g.id} className="grupo-item">
                <div className="grupo-cabecalho">
                  <div>
                    <strong>{g.nome}</strong>
                    {g.descricao ? (
                      <span className="grupo-descricao">{g.descricao}</span>
                    ) : null}
                  </div>
                  <div className="acoes-linha">
                    <button
                      type="button"
                      className="botao botao-discreto"
                      onClick={() =>
                        setEditando((atual) => (atual === g.id ? null : g.id))
                      }
                    >
                      {editando === g.id ? 'Fechar' : 'Editar quem entra'}
                    </button>
                    <button
                      type="button"
                      className="botao botao-discreto botao-perigo"
                      disabled={ocupado}
                      onClick={() => void excluir(g)}
                    >
                      Excluir
                    </button>
                  </div>
                </div>

                <p className="grupo-membros">
                  {g.membros.length === 0
                    ? 'Ninguém neste grupo — nenhum dashboard restrito a ele é visto por outra pessoa.'
                    : g.membros.map((m) => m.nome).join(', ')}
                </p>

                {editando === g.id ? (
                  <fieldset className="escolha-pessoas">
                    <legend className="campo-rotulo">Quem entra</legend>
                    {ativos.map((u) => (
                      <label key={u.id} className="pessoa-opcao">
                        <input
                          type="checkbox"
                          disabled={ocupado}
                          checked={g.membros.some((m) => m.id === u.id)}
                          onChange={() => void alternarMembro(g, u.id)}
                        />
                        {u.nome}
                      </label>
                    ))}
                  </fieldset>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
