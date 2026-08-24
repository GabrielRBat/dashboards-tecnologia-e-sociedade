import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MenuUsuario } from '@/components/menu-usuario';
import { Navegacao } from '@/components/navegacao';
import { ProvedorTema, SCRIPT_ANTI_PISCADA } from '@/components/tema';
import { obterSessaoAtual } from '@/lib/sessao-servidor';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dashboard de Argamassas',
  description:
    'Visualização dos ensaios e formulações de argamassa do laboratório',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /*
   * Quem está logado, para o cabeçalho. Devolve `null` na tela de login e
   * quando a sessão venceu — nesses casos o cabeçalho aparece só com a marca,
   * sem navegação, que não teria para onde levar.
   */
  const sessao = await obterSessaoAtual();
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Aplica o tema salvo antes da primeira pintura, evitando o flash claro. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_ANTI_PISCADA }} />
      </head>
      <body>
        <ProvedorTema>
        <div className="app">
          <header className="cabecalho">
            <div className="cabecalho-conteudo">
              <span className="marca">
                <span className="marca-sigla">AR</span>
                Dashboard de Argamassas
              </span>
              {sessao ? (
                <>
                  <Suspense fallback={null}>
                    <Navegacao ehAdmin={sessao.papel === 'ADMIN'} />
                  </Suspense>
                  <MenuUsuario nome={sessao.nome} papel={sessao.papel} />
                </>
              ) : null}
            </div>
          </header>
          <main className="principal">{children}</main>
        </div>
        </ProvedorTema>
      </body>
    </html>
  );
}
