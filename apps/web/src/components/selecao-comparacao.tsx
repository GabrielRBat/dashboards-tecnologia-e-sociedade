'use client';

/**
 * Seleção de até 3 formulações na lista, para abrir a comparação lado a lado.
 *
 * O estado vive neste provedor (sessão da página): sobrevive a filtros e
 * paginação enquanto a pessoa permanece em /formulacoes; ao sair, limpa.
 */

import Link from 'next/link';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const MAXIMO = 3;

interface ItemSelecionado {
  id: string;
  nomenclatura: string;
}

interface ContextoComparacao {
  selecionados: ItemSelecionado[];
  estaSelecionado: (id: string) => boolean;
  alternar: (item: ItemSelecionado) => void;
  limpar: () => void;
  aviso: string | null;
}

const Contexto = createContext<ContextoComparacao | null>(null);

function useComparacao(): ContextoComparacao {
  const ctx = useContext(Contexto);
  if (!ctx) {
    throw new Error('useComparacao precisa estar dentro de ProvedorComparacao.');
  }
  return ctx;
}

export function ProvedorComparacao({ children }: { children: ReactNode }) {
  const [selecionados, setSelecionados] = useState<ItemSelecionado[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);

  const estaSelecionado = useCallback(
    (id: string) => selecionados.some((s) => s.id === id),
    [selecionados],
  );

  const alternar = useCallback((item: ItemSelecionado) => {
    setSelecionados((atual) => {
      const jaTem = atual.some((s) => s.id === item.id);
      if (jaTem) {
        setAviso(null);
        return atual.filter((s) => s.id !== item.id);
      }
      if (atual.length >= MAXIMO) {
        setAviso(`A comparação admite no máximo ${MAXIMO} formulações.`);
        return atual;
      }
      setAviso(null);
      return [...atual, item];
    });
  }, []);

  const limpar = useCallback(() => {
    setSelecionados([]);
    setAviso(null);
  }, []);

  const valor = useMemo(
    () => ({ selecionados, estaSelecionado, alternar, limpar, aviso }),
    [selecionados, estaSelecionado, alternar, limpar, aviso],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function CheckboxComparacao({
  id,
  nomenclatura,
}: {
  id: string;
  nomenclatura: string;
}) {
  const { estaSelecionado, alternar } = useComparacao();
  const marcado = estaSelecionado(id);

  return (
    <label className="checkbox-comparacao">
      <input
        type="checkbox"
        checked={marcado}
        onChange={() => alternar({ id, nomenclatura })}
        aria-label={`Selecionar ${nomenclatura} para comparar`}
      />
    </label>
  );
}

export function BarraComparacao() {
  const { selecionados, limpar, aviso } = useComparacao();

  if (selecionados.length === 0) return null;

  const href = `/formulacoes/comparar?ids=${selecionados.map((s) => s.id).join(',')}`;
  const podeComparar = selecionados.length >= 2;

  return (
    <div className="barra-comparacao" role="region" aria-label="Comparação">
      <div className="barra-comparacao-conteudo">
        <div className="barra-comparacao-info">
          <strong>
            {selecionados.length}/{MAXIMO} selecionada
            {selecionados.length === 1 ? '' : 's'}
          </strong>
          <span className="barra-comparacao-nomes">
            {selecionados.map((s) => s.nomenclatura).join(' · ')}
          </span>
          {aviso ? <span className="barra-comparacao-aviso">{aviso}</span> : null}
          {!podeComparar && !aviso ? (
            <span className="barra-comparacao-aviso">
              Selecione pelo menos 2 formulações para comparar.
            </span>
          ) : null}
        </div>
        <div className="barra-comparacao-acoes">
          <button type="button" className="botao" onClick={limpar}>
            Limpar
          </button>
          {podeComparar ? (
            <Link className="botao botao-primario" href={href}>
              Comparar
            </Link>
          ) : (
            <span className="botao botao-primario" aria-disabled="true">
              Comparar
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
