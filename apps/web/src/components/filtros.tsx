'use client';

/** Barra de filtros: escreve na URL, e as páginas leem os searchParams. */

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { ROTULOS_ORIGEM, ROTULOS_TIPO_PROJETO } from '@/lib/formato';

export function BarraFiltros({
  desenvolvedores,
}: {
  desenvolvedores: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pendente, iniciar] = useTransition();

  const atualizar = (chave: string, valor: string): void => {
    const novos = new URLSearchParams(params.toString());
    if (valor) novos.set(chave, valor);
    else novos.delete(chave);
    // Qualquer mudança de filtro volta para a primeira página.
    novos.delete('pagina');
    iniciar(() => router.push(`${pathname}?${novos.toString()}`));
  };

  const limpar = (): void => {
    iniciar(() => router.push(pathname));
  };

  const valor = (chave: string): string => params.get(chave) ?? '';
  const temFiltro = [
    'busca',
    'tipoProjeto',
    'origem',
    'desenvolvedor',
    'dataInicio',
    'dataFim',
  ].some((c) => params.get(c));

  return (
    <div className="barra-filtros">
      <label className="campo">
        <span className="campo-rotulo">Buscar</span>
        <input
          type="search"
          placeholder="Nomenclatura, nº ou comentário"
          defaultValue={valor('busca')}
          onChange={(e) => atualizar('busca', e.target.value)}
          style={{ minWidth: 230 }}
        />
      </label>

      <label className="campo">
        <span className="campo-rotulo">Tipo de projeto</span>
        <select
          value={valor('tipoProjeto')}
          onChange={(e) => atualizar('tipoProjeto', e.target.value)}
        >
          <option value="">Todos</option>
          {Object.entries(ROTULOS_TIPO_PROJETO).map(([codigo, rotulo]) => (
            <option key={codigo} value={codigo}>
              {rotulo}
            </option>
          ))}
        </select>
      </label>

      <label className="campo">
        <span className="campo-rotulo">Origem</span>
        <select
          value={valor('origem')}
          onChange={(e) => atualizar('origem', e.target.value)}
        >
          <option value="">Todas</option>
          {Object.entries(ROTULOS_ORIGEM).map(([codigo, rotulo]) => (
            <option key={codigo} value={codigo}>
              {rotulo}
            </option>
          ))}
        </select>
      </label>

      <label className="campo">
        <span className="campo-rotulo">Desenvolvedor</span>
        <select
          value={valor('desenvolvedor')}
          onChange={(e) => atualizar('desenvolvedor', e.target.value)}
        >
          <option value="">Todos</option>
          {desenvolvedores.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>

      <label className="campo">
        <span className="campo-rotulo">De</span>
        <input
          type="date"
          value={valor('dataInicio')}
          onChange={(e) => atualizar('dataInicio', e.target.value)}
          style={{ minWidth: 140 }}
        />
      </label>

      <label className="campo">
        <span className="campo-rotulo">Até</span>
        <input
          type="date"
          value={valor('dataFim')}
          onChange={(e) => atualizar('dataFim', e.target.value)}
          style={{ minWidth: 140 }}
        />
      </label>

      <button
        type="button"
        className="botao"
        onClick={limpar}
        disabled={!temFiltro || pendente}
      >
        {pendente ? 'Aplicando…' : 'Limpar filtros'}
      </button>
    </div>
  );
}
