'use client';

import { useEffect, useState } from 'react';

/**
 * Diz se a tela é estreita, para os gráficos se ajustarem.
 *
 * Alguns ajustes não cabem no CSS: a largura do eixo de um gráfico Recharts é um
 * número em JavaScript, não uma propriedade que uma media query alcance. No
 * ranking, por exemplo, o eixo de nomes ocupa 190 px — numa tela de 320 px isso
 * deixaria 24 px para as barras.
 *
 * Começa em `false` e só decide no efeito: no servidor não há janela para medir,
 * e chutar um valor faria o HTML do servidor divergir do da primeira pintura.
 */
export function useTelaEstreita(limitePx = 720): boolean {
  const [estreita, setEstreita] = useState(false);

  useEffect(() => {
    const consulta = window.matchMedia(`(max-width: ${limitePx}px)`);
    const aplicar = (): void => setEstreita(consulta.matches);

    aplicar();
    consulta.addEventListener('change', aplicar);
    return () => consulta.removeEventListener('change', aplicar);
  }, [limitePx]);

  return estreita;
}
