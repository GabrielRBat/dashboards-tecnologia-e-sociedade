'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITENS = [
  { href: '/', rotulo: 'Visão geral' },
  { href: '/dashboards', rotulo: 'Dashboards' },
  { href: '/formulacoes', rotulo: 'Formulações' },
  { href: '/importar', rotulo: 'Importar planilha' },
  { href: '/configuracoes', rotulo: 'Configurações' },
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
          <Link key={item.href} href={item.href} data-ativo={ativo}>
            {item.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
