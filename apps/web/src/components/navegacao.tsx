'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/*
 * Cada item tem um rótulo curto para telas estreitas. Em 360 px os cinco nomes
 * completos somam mais que a largura da tela; encurtar o texto é preferível a
 * esconder a navegação atrás de um menu, que custa um toque a mais e some com a
 * noção de onde a pessoa está.
 */
const ITENS = [
  { href: '/', rotulo: 'Visão geral', curto: 'Visão' },
  { href: '/dashboards', rotulo: 'Dashboards', curto: 'Painéis' },
  { href: '/formulacoes', rotulo: 'Formulações', curto: 'Fórmulas' },
  { href: '/importar', rotulo: 'Importar planilha', curto: 'Importar' },
  { href: '/configuracoes', rotulo: 'Configurações', curto: 'Ajustes' },
];

export function Navegacao() {
  const pathname = usePathname();

  return (
    <nav className="navegacao">
      {ITENS.map((item) => {
        const ativo =
          item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            data-ativo={ativo}
            aria-current={ativo ? 'page' : undefined}
          >
            <span className="nav-rotulo-longo">{item.rotulo}</span>
            <span className="nav-rotulo-curto">{item.curto}</span>
          </Link>
        );
      })}
    </nav>
  );
}
