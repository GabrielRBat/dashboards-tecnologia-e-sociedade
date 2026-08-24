'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ListaRequisitos,
  motivoBloqueio,
  requisitosDaSenha,
} from './requisitos-senha';

/**
 * Criação de conta.
 *
 * A pessoa escolhe a própria senha, então não há troca obrigatória depois —
 * ninguém além dela chegou a saber a senha.
 */
export function FormularioRegistro() {
  const router = useRouter();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const requisitos = requisitosDaSenha(senha, confirmacao);
  const bloqueio = motivoBloqueio(
    [
      { rotulo: 'nome', preenchido: nome.trim().length > 0 },
      { rotulo: 'e-mail', preenchido: email.trim().length > 0 },
      { rotulo: 'senha', preenchido: senha.length > 0 },
      { rotulo: 'a repetição da senha', preenchido: confirmacao.length > 0 },
    ],
    requisitos,
  );
  const podeEnviar = !enviando && bloqueio === null;

  async function criar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const resposta = await fetch('/api/sessao/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, senha }),
      });

      const corpo: unknown = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        const mensagem =
          corpo && typeof corpo === 'object' && 'mensagem' in corpo
            ? String((corpo as { mensagem: unknown }).mensagem)
            : 'Não foi possível criar a conta.';

        setErro(
          resposta.status === 429
            ? 'Muitas contas criadas deste endereço. Tente de novo mais tarde.'
            : mensagem,
        );
        setEnviando(false);
        return;
      }

      // A API já devolveu a sessão e o cookie foi gravado: entra direto.
      router.push('/');
      router.refresh();
    } catch {
      setErro('Não foi possível falar com o servidor. Tente de novo.');
      setEnviando(false);
    }
  }

  return (
    <form className="formulario-login" onSubmit={(e) => void criar(e)}>
      <label className="campo">
        <span className="campo-rotulo">Nome</span>
        <input
          name="nome"
          autoComplete="name"
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Como você quer ser chamado"
        />
      </label>

      <label className="campo">
        <span className="campo-rotulo">E-mail</span>
        <input
          type="email"
          name="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@exemplo.com"
        />
      </label>

      <label className="campo">
        <span className="campo-rotulo">Senha</span>
        <input
          type="password"
          name="senha"
          autoComplete="new-password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
      </label>

      <label className="campo">
        <span className="campo-rotulo">Repita a senha</span>
        <input
          type="password"
          name="confirmacao"
          autoComplete="new-password"
          required
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
        />
      </label>

      <ListaRequisitos
        requisitos={requisitos}
        mostrar={senha.length > 0 || confirmacao.length > 0}
      />

      {erro ? (
        <p className="aviso aviso-erro" role="alert">
          {erro}
        </p>
      ) : null}

      <div className="acao-com-motivo">
        <button type="submit" className="botao botao-primario" disabled={!podeEnviar}>
          {enviando ? 'Criando…' : 'Criar conta'}
        </button>
        {bloqueio && !enviando ? (
          <p className="motivo-bloqueio" aria-live="polite">
            {bloqueio}
          </p>
        ) : null}
      </div>
    </form>
  );
}
