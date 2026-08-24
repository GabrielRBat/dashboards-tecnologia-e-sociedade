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
  { href: '/equipe', rotulo: 'Equipe', curto: 'Equipe', soAdmin: true },
];

export function Navegacao({ ehAdmin = false }: { ehAdmin?: boolean }) {
  const pathname = usePathname();

  /*
   * Esconder o item não é a proteção — a API recusa quem não é administrador de
   * qualquer forma. É só não oferecer um caminho que terminaria em "sem
   * permissão".
   */
  const visiveis = ITENS.filter((i) => !i.soAdmin || ehAdmin);

  return (
    <nav className="navegacao">
      {visiveis.map((item) => {
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
