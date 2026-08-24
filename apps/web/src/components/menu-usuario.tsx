'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/** Quem está logado, e como sair. */
export function MenuUsuario({
  nome,
  papel,
}: {
  nome: string;
  papel: 'ADMIN' | 'MEMBRO';
}) {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);

  async function sair() {
    setSaindo(true);
    // Apagar o cookie é responsabilidade do servidor: ele é httpOnly, então o
    // JavaScript daqui não o alcança nem para removê-lo.
    await fetch('/api/sessao', { method: 'DELETE' });
    router.push('/login');
    router.refresh();
  }

  // Só o primeiro nome: o cabeçalho é estreito, e no celular o nome completo
  // empurraria a navegação.
  const primeiro = nome.trim().split(/\s+/)[0] ?? nome;

  return (
    <div className="menu-usuario">
      <Link className="usuario-nome" href="/trocar-senha" title={`${nome} — trocar senha`}>
        {primeiro}
        {papel === 'ADMIN' ? <span className="etiqueta-papel">admin</span> : null}
      </Link>
      <button
        type="button"
        className="botao botao-discreto"
        onClick={() => void sair()}
        disabled={saindo}
      >
        {saindo ? 'Saindo…' : 'Sair'}
      </button>
    </div>
  );
}
