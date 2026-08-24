'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/** Troca da própria senha, conferindo a atual. */
export function FormularioTrocaSenha() {
  const router = useRouter();
  const [senhaAtual, setSenhaAtual] = useState('');
  const [senhaNova, setSenhaNova] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState('');
  const [pronto, setPronto] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const curta = senhaNova.length > 0 && senhaNova.length < 10;
  const diferem = confirmacao.length > 0 && senhaNova !== confirmacao;

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro('');

    // Conferir aqui evita uma ida ao servidor para dizer o óbvio; a validação
    // que vale continua sendo a da API.
    if (senhaNova !== confirmacao) {
      setErro('A confirmação não confere com a senha nova.');
      return;
    }

    setEnviando(true);
    try {
      const resposta = await fetch('/api/sessao/senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senhaAtual, senhaNova }),
      });
      const corpo: unknown = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        setErro(
          corpo && typeof corpo === 'object' && 'mensagem' in corpo
            ? String((corpo as { mensagem: unknown }).mensagem)
            : 'Não foi possível trocar a senha.',
        );
        setEnviando(false);
        return;
      }

      setPronto(true);
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1200);
    } catch {
      setErro('Não foi possível falar com o servidor.');
      setEnviando(false);
    }
  }

  if (pronto) {
    return (
      <p className="aviso" role="status">
        <strong>Senha trocada.</strong> Levando você para a visão geral…
      </p>
    );
  }

  return (
    <form className="formulario-login" onSubmit={(e) => void enviar(e)}>
      <label className="campo">
        <span className="campo-rotulo">Senha atual</span>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={senhaAtual}
          onChange={(e) => setSenhaAtual(e.target.value)}
        />
      </label>

      <label className="campo">
        <span className="campo-rotulo">Senha nova</span>
        <input
          type="password"
          autoComplete="new-password"
          required
          value={senhaNova}
          onChange={(e) => setSenhaNova(e.target.value)}
        />
        <span className="nota-grafico" style={{ margin: '2px 0 0' }}>
          {curta
            ? 'Faltam caracteres: o mínimo é 10.'
            : 'Pelo menos 10 caracteres. Uma frase curta funciona bem.'}
        </span>
      </label>

      <label className="campo">
        <span className="campo-rotulo">Repita a senha nova</span>
        <input
          type="password"
          autoComplete="new-password"
          required
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
        />
        {diferem ? (
          <span className="nota-grafico" style={{ margin: '2px 0 0' }}>
            As duas não conferem.
          </span>
        ) : null}
      </label>

      {erro ? (
        <p className="aviso aviso-erro" role="alert">
          {erro}
        </p>
      ) : null}

      <button
        type="submit"
        className="botao botao-primario"
        disabled={enviando || curta || diferem || !senhaAtual || !senhaNova}
      >
        {enviando ? 'Trocando…' : 'Trocar senha'}
      </button>
    </form>
  );
}
