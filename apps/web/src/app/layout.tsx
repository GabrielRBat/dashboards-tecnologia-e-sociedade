import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Navegacao } from '@/components/navegacao';
import { ProvedorTema, SCRIPT_ANTI_PISCADA } from '@/components/tema';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dashboard de Argamassas',
  description:
    'Visualização dos ensaios e formulações de argamassa do laboratório',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
                <span className="marca-sigla">CX</span>
                Dashboard de Argamassas
              </span>
              <Suspense fallback={null}>
                <Navegacao />
              </Suspense>
            </div>
          </header>
          <main className="principal">{children}</main>
        </div>
        </ProvedorTema>
      </body>
    </html>
  );
}
