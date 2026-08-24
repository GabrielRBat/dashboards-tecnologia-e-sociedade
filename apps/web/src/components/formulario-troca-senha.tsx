'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ListaRequisitos,
  motivoBloqueio,
  requisitosDaSenha,
} from './requisitos-senha';

/** Troca da própria senha, conferindo a atual. */
export function FormularioTrocaSenha() {
  const router = useRouter();
  const [senhaAtual, setSenhaAtual] = useState('');
  const [senhaNova, setSenhaNova] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState('');
  const [pronto, setPronto] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const requisitos = requisitosDaSenha(senhaNova, confirmacao);
  const igualAtual = senhaNova.length > 0 && senhaNova === senhaAtual;

  const bloqueio =
    motivoBloqueio(
      [
        { rotulo: 'senha atual', preenchido: senhaAtual.length > 0 },
        { rotulo: 'senha nova', preenchido: senhaNova.length > 0 },
        { rotulo: 'a repetição da senha nova', preenchido: confirmacao.length > 0 },
      ],
      requisitos,
    ) ??
    (igualAtual ? 'A senha nova precisa ser diferente da atual.' : null);

  const podeEnviar = !enviando && bloqueio === null;

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro('');
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
      </label>

      <ListaRequisitos
        requisitos={requisitos}
        mostrar={senhaNova.length > 0 || confirmacao.length > 0}
      />

      {igualAtual ? (
        <p className="nota-grafico nota-alerta">
          A senha nova é igual à atual — escolha outra.
        </p>
      ) : null}

      {erro ? (
        <p className="aviso aviso-erro" role="alert">
          {erro}
        </p>
      ) : null}

      <div className="acao-com-motivo">
        <button type="submit" className="botao botao-primario" disabled={!podeEnviar}>
          {enviando ? 'Trocando…' : 'Trocar senha'}
        </button>
        {/*
          O motivo fica ao lado do botão bloqueado, e não escondido num "tente e
          descubra". `aria-live` faz o leitor de tela anunciar a mudança.
        */}
        {bloqueio && !enviando ? (
          <p className="motivo-bloqueio" aria-live="polite">
            {bloqueio}
          </p>
        ) : null}
      </div>
    </form>
  );
}
