'use client';

/**
 * Preferência de tema do usuário.
 *
 * São três estados: `sistema` (segue o Windows/navegador), `claro` e `escuro`.
 * A escolha fica no `localStorage` do navegador — é uma preferência por pessoa e
 * por máquina, não um dado do laboratório, então não vai para o banco.
 *
 * O `globals.css` já define as três situações:
 *   :root                            → paleta clara
 *   @media (prefers-color-scheme:dark):root:not([data-tema='claro'])  → escura pelo sistema
 *   :root[data-tema='escuro']        → escura pela escolha explícita
 *
 * Aqui só escrevemos o atributo `data-tema` na tag <html>.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export const TEMAS = ['sistema', 'claro', 'escuro'] as const;
export type Tema = (typeof TEMAS)[number];

/** Chave usada no localStorage. Repetida no script anti-piscada do layout. */
export const CHAVE_TEMA = 'argamassas:tema';

const ehTema = (valor: unknown): valor is Tema =>
  typeof valor === 'string' && (TEMAS as readonly string[]).includes(valor);

function aplicarNoDocumento(tema: Tema): void {
  const raiz = document.documentElement;
  if (tema === 'sistema') raiz.removeAttribute('data-tema');
  else raiz.setAttribute('data-tema', tema);
}

interface ContextoTema {
  tema: Tema;
  definirTema: (tema: Tema) => void;
  /** O tema que está de fato na tela, já resolvido quando a opção é "sistema". */
  temaEfetivo: 'claro' | 'escuro';
}

const Contexto = createContext<ContextoTema | null>(null);

export function ProvedorTema({ children }: { children: ReactNode }) {
  // Começa em "sistema" para o HTML do servidor e do cliente baterem; o valor
  // salvo é lido no efeito abaixo (o script do layout já pintou a tela certa).
  const [tema, setTema] = useState<Tema>('sistema');
  const [sistemaEscuro, setSistemaEscuro] = useState(false);

  useEffect(() => {
    try {
      const salvo = window.localStorage.getItem(CHAVE_TEMA);
      if (ehTema(salvo)) setTema(salvo);
    } catch {
      // Navegador com armazenamento bloqueado: segue no tema do sistema.
    }
  }, []);

  // Acompanha a preferência do sistema para saber o tema efetivo.
  useEffect(() => {
    const consulta = window.matchMedia('(prefers-color-scheme: dark)');
    const atualizar = (): void => setSistemaEscuro(consulta.matches);
    atualizar();
    consulta.addEventListener('change', atualizar);
    return () => consulta.removeEventListener('change', atualizar);
  }, []);

  const definirTema = useCallback((novo: Tema) => {
    setTema(novo);
    aplicarNoDocumento(novo);
    try {
      window.localStorage.setItem(CHAVE_TEMA, novo);
    } catch {
      // Sem persistência: a escolha vale só nesta aba.
    }
  }, []);

  const valor = useMemo<ContextoTema>(
    () => ({
      tema,
      definirTema,
      temaEfetivo:
        tema === 'sistema' ? (sistemaEscuro ? 'escuro' : 'claro') : tema,
    }),
    [tema, definirTema, sistemaEscuro],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useTema(): ContextoTema {
  const contexto = useContext(Contexto);
  if (!contexto) {
    throw new Error('useTema precisa estar dentro de <ProvedorTema>.');
  }
  return contexto;
}

/**
 * Script executado antes da primeira pintura, para a tela já nascer no tema
 * escolhido — sem o flash branco de quem aplica o tema só depois de hidratar.
 */
export const SCRIPT_ANTI_PISCADA = `(function(){try{var t=localStorage.getItem('${CHAVE_TEMA}');if(t==='claro'||t==='escuro'){document.documentElement.setAttribute('data-tema',t);}}catch(e){}})();`;
