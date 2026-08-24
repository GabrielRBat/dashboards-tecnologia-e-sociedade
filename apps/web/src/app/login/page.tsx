import { Suspense } from 'react';
import Link from 'next/link';
import { FormularioLogin } from '@/components/formulario-login';

export const metadata = { title: 'Entrar · Dashboard de Argamassas' };

export default function PaginaLogin() {
  return (
    <div className="tela-login">
      <div className="cartao cartao-login">
        <span className="marca marca-login">
          <span className="marca-sigla">AR</span>
          Dashboard de Argamassas
        </span>

        <h1 className="titulo-login">Entrar</h1>
        <p className="cartao-legenda">
          Acesso aos ensaios e formulações do laboratório.
        </p>

        <Suspense fallback={null}>
          <FormularioLogin />
        </Suspense>

        <p className="nota-grafico" style={{ marginTop: 14 }}>
          Ainda não tem conta? <Link href="/registrar">Criar conta</Link>.
        </p>
      </div>
    </div>
  );
}
