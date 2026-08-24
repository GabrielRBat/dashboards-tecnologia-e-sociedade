import { Suspense } from 'react';
import Link from 'next/link';
import { FormularioRegistro } from '@/components/formulario-registro';

export const metadata = { title: 'Criar conta · Dashboard de Argamassas' };

export default function PaginaRegistrar() {
  return (
    <div className="tela-login">
      <div className="cartao cartao-login">
        <span className="marca marca-login">
          <span className="marca-sigla">AR</span>
          Dashboard de Argamassas
        </span>

        <h1 className="titulo-login">Criar conta</h1>
        <p className="cartao-legenda">
          Contas novas entram como <strong>membro</strong>: veem e montam
          dashboards, mas não gerenciam a equipe.
        </p>

        <Suspense fallback={null}>
          <FormularioRegistro />
        </Suspense>

        <p className="nota-grafico" style={{ marginTop: 14 }}>
          Já tem conta? <Link href="/login">Entrar</Link>.
        </p>
      </div>
    </div>
  );
}
