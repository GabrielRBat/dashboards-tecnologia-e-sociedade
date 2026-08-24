'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Formulário de login.
 *
 * Manda as credenciais para `/api/sessao`, do próprio Next, que fala com a API e
 * grava o cookie `httpOnly`. O token nunca passa por este componente — se
 * passasse, estaria ao alcance de qualquer script da página.
 */
export function FormularioLogin() {
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  /*
   * Quem chegou aqui por sessão vencida merece saber disso. Sem o aviso, a
   * pessoa acha que perdeu o acesso ou que o sistema falhou.
   */
  const expirou = params.get('motivo') === 'expirada';

  async function entrar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro('');
    setEnviando(true);

    try {
      const resposta = await fetch('/api/sessao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });

      const corpo: unknown = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        const mensagem =
          corpo && typeof corpo === 'object' && 'mensagem' in corpo
            ? String((corpo as { mensagem: unknown }).mensagem)
            : 'Não foi possível entrar.';

        setErro(
          resposta.status === 429
            ? 'Muitas tentativas seguidas. Espere um minuto e tente de novo.'
            : mensagem,
        );
        setEnviando(false);
        return;
      }

      const dados = corpo as { precisaTrocarSenha?: boolean };

      /*
       * `destino` vem do middleware, que guarda a página que a pessoa tentou
       * abrir. Só aceitamos caminhos internos: um destino como
       * `https://site-falso/` transformaria o login numa ponte para golpe.
       */
      const bruto = params.get('destino') ?? '/';
      const destino = bruto.startsWith('/') && !bruto.startsWith('//') ? bruto : '/';

      router.push(dados.precisaTrocarSenha ? '/trocar-senha' : destino);
      router.refresh();
    } catch {
      setErro('Não foi possível falar com o servidor. Tente de novo.');
      setEnviando(false);
    }
  }

  return (
    <form className="formulario-login" onSubmit={(e) => void entrar(e)}>
      <label className="campo">
        <span className="campo-rotulo">E-mail ou usuário</span>
        <input
          /*
           * `text`, e não `email`: contas criadas pelo terminal podem ter um
           * identificador simples (`admin`), e o navegador recusaria enviar o
           * formulário com `type="email"`. Quem valida é a API.
           */
          type="text"
          name="email"
          autoComplete="username"
          autoCapitalize="off"
          spellCheck={false}
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
          autoComplete="current-password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
      </label>

      {expirou && !erro ? (
        <p className="aviso" role="status">
          Sua sessão expirou. Entre de novo para continuar de onde parou.
        </p>
      ) : null}

      {erro ? (
        <p className="aviso aviso-erro" role="alert">
          {erro}
        </p>
      ) : null}

      <button
        type="submit"
        className="botao botao-primario"
        disabled={enviando || !email || !senha}
      >
        {enviando ? 'Entrando…' : 'Entrar'}
      </button>

      <p className="nota-grafico">
        Esqueceu a senha? Peça a um administrador da equipe para redefini-la em
        Configurações → Equipe.
      </p>
    </form>
  );
}
