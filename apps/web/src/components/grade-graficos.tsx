'use client';

/**
 * Grade de gráficos que a pessoa reordena arrastando.
 *
 * Duas decisões que valem explicação:
 *
 * 1. **A ordem muda via `order` do CSS, não remontando o DOM.** Os cartões saem
 *    do servidor na ordem padrão e ficam onde estão; só a propriedade `order` de
 *    cada um muda. Reordenar o array de filhos remontaria os gráficos a cada
 *    arrasto — e são doze SVGs com centenas de formas.
 *
 * 2. **A ordem fica no `localStorage`, não no banco.** É preferência de cada
 *    pessoa em cada máquina, igual ao tema. Ninguém quer que reorganizar o
 *    próprio painel mude o painel do colega.
 *
 * Arrastar é gesto de mouse. A mesma alça é um botão que aceita as setas do
 * teclado, senão a funcionalidade simplesmente não existiria para quem não usa
 * mouse.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/** Chave no localStorage. */
export const CHAVE_ORDEM = 'argamassas:ordem-graficos';

export interface ItemGrade {
  /** Identificador estável do gráfico — é o que fica salvo. */
  id: string;
  /** Nome usado nos avisos de leitor de tela e no título da alça. */
  titulo: string;
  /** Quantas colunas o cartão ocupa. */
  largura?: 1 | 2 | 'total';
  node: ReactNode;
}

function classeLargura(largura: ItemGrade['largura']): string {
  if (largura === 'total') return ' grafico-largo';
  if (largura === 2) return ' grafico-duplo';
  return '';
}

/**
 * Concilia a ordem salva com os gráficos que existem hoje.
 *
 * A lista de gráficos muda entre versões. Sem isto, quem salvou uma ordem antes
 * de um gráfico novo nunca o veria, e um gráfico removido deixaria um buraco.
 * Regra: mantém os salvos que ainda existem, na ordem salva, e põe os novos no
 * fim.
 */
export function conciliarOrdem(salva: string[], atuais: string[]): string[] {
  const existe = new Set(atuais);
  const mantidos = salva.filter((id) => existe.has(id));
  const jaPostos = new Set(mantidos);
  return [...mantidos, ...atuais.filter((id) => !jaPostos.has(id))];
}

/** Move um item de uma posição para outra, devolvendo um array novo. */
export function mover(ordem: string[], de: number, para: number): string[] {
  if (de === para || de < 0 || para < 0 || de >= ordem.length) return ordem;
  const destino = Math.max(0, Math.min(ordem.length - 1, para));
  const copia = [...ordem];
  const [item] = copia.splice(de, 1);
  if (item === undefined) return ordem;
  copia.splice(destino, 0, item);
  return copia;
}

export function GradeGraficos({ itens }: { itens: ItemGrade[] }) {
  const idsPadrao = useMemo(() => itens.map((i) => i.id), [itens]);
  const [ordem, setOrdem] = useState<string[]>(idsPadrao);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');
  /*
   * Ordem de antes do arrasto. Como a grade se reorganiza ao vivo enquanto a
   * pessoa arrasta, soltar fora ou apertar Esc precisa desfazer a prévia — sem
   * isto, desistir de um arrasto deixaria o painel bagunçado.
   */
  const ordemAntesDoArrasto = useRef<string[] | null>(null);
  /*
   * Quem está sendo arrastado, em espelho síncrono — mesmo motivo da `ordemRef`.
   * O `dragover` pode chegar antes de o React re-renderizar com o novo estado, e
   * aí o handler leria `arrastando` ainda nulo e ignoraria o primeiro movimento.
   */
  const arrastandoRef = useRef<string | null>(null);

  const iniciarArrasto = useCallback((id: string) => {
    ordemAntesDoArrasto.current = ordemRef.current;
    arrastandoRef.current = id;
    setArrastando(id);
  }, []);
  /*
   * Espelho síncrono da ordem. Segurar a seta dispara vários `keydown` antes de
   * o React re-renderizar; lendo o estado do closure, todos veriam a ordem
   * antiga e só o primeiro movimento valeria. A ref é atualizada dentro do
   * `salvar`, então o evento seguinte já enxerga o resultado do anterior.
   */
  const ordemRef = useRef<string[]>(idsPadrao);

  // A ordem salva só existe no cliente. Aplicá-la no primeiro efeito mantém o
  // HTML do servidor e o da primeira pintura iguais, sem erro de hidratação.
  useEffect(() => {
    try {
      const bruto = window.localStorage.getItem(CHAVE_ORDEM);
      if (bruto) {
        const salva: unknown = JSON.parse(bruto);
        if (Array.isArray(salva) && salva.every((v) => typeof v === 'string')) {
          const conciliada = conciliarOrdem(salva, idsPadrao);
          ordemRef.current = conciliada;
          setOrdem(conciliada);
        }
      }
    } catch {
      // Armazenamento bloqueado ou JSON corrompido: fica na ordem padrão.
    }
  }, [idsPadrao]);

  /** Aplica na tela sem gravar — é o que desenha a prévia durante o arrasto. */
  const aplicar = useCallback((nova: string[]) => {
    ordemRef.current = nova;
    setOrdem(nova);
  }, []);

  const salvar = useCallback((nova: string[]) => {
    ordemRef.current = nova;
    setOrdem(nova);
    try {
      window.localStorage.setItem(CHAVE_ORDEM, JSON.stringify(nova));
    } catch {
      // Sem armazenamento a ordem vale só para esta sessão — melhor que travar.
    }
  }, []);

  const moverPara = useCallback(
    (id: string, delta: number) => {
      const atual = ordemRef.current;
      const de = atual.indexOf(id);
      if (de === -1) return;
      const para = de + delta;
      if (para < 0 || para >= atual.length) return;

      salvar(mover(atual, de, para));

      const titulo = itens.find((i) => i.id === id)?.titulo ?? id;
      setAviso(`${titulo} movido para a posição ${para + 1} de ${atual.length}.`);
    },
    [itens, salvar],
  );

  /**
   * Prévia ao vivo: assim que o cursor entra sobre outro cartão, a grade já se
   * reorganiza e o espaço abre onde o cartão vai cair. Mostrar só um contorno no
   * alvo deixaria a pessoa adivinhando o resultado.
   */
  const previsualizar = useCallback(
    (idAlvo: string) => {
      const emArrasto = arrastandoRef.current;
      if (!emArrasto || emArrasto === idAlvo) return;
      const atual = ordemRef.current;
      const de = atual.indexOf(emArrasto);
      const para = atual.indexOf(idAlvo);
      if (de === -1 || para === -1 || de === para) return;
      aplicar(mover(atual, de, para));
    },
    [aplicar],
  );

  /** Confirma a posição que a prévia já mostrou. */
  const confirmar = useCallback(() => {
    const emArrasto = arrastandoRef.current;
    if (!emArrasto) return;
    const atual = ordemRef.current;
    ordemAntesDoArrasto.current = null;
    arrastandoRef.current = null;
    salvar(atual);

    const posicao = atual.indexOf(emArrasto) + 1;
    const titulo = itens.find((i) => i.id === emArrasto)?.titulo ?? emArrasto;
    setAviso(`${titulo} movido para a posição ${posicao} de ${atual.length}.`);
    setArrastando(null);
  }, [itens, salvar]);

  /** Arrasto abandonado (soltou fora da grade, ou Esc): desfaz a prévia. */
  const cancelar = useCallback(() => {
    const original = ordemAntesDoArrasto.current;
    if (original) aplicar(original);
    ordemAntesDoArrasto.current = null;
    arrastandoRef.current = null;
    setArrastando(null);
  }, [aplicar]);

  const restaurar = useCallback(() => {
    ordemRef.current = idsPadrao;
    setOrdem(idsPadrao);
    try {
      window.localStorage.removeItem(CHAVE_ORDEM);
    } catch {
      /* nada a fazer */
    }
    setAviso('Ordem padrão restaurada.');
  }, [idsPadrao]);

  const foiAlterada =
    ordem.length === idsPadrao.length &&
    ordem.some((id, i) => id !== idsPadrao[i]);

  return (
    <>
      <div className="acoes-grade">
        <p className="dica-grade">
          Arraste um cartão pela alça <span aria-hidden="true">⠿</span> para
          reorganizar o painel. A ordem fica salva neste navegador.
        </p>
        {foiAlterada ? (
          <button type="button" className="botao botao-discreto" onClick={restaurar}>
            Restaurar ordem padrão
          </button>
        ) : null}
      </div>

      <div
        className="grade-graficos"
        data-reordenando={arrastando !== null}
        onDragOver={(e) => {
          if (arrastandoRef.current) e.preventDefault();
        }}
        onDrop={(e) => {
          // Soltar no vão entre cartões vale como soltar na posição da prévia.
          e.preventDefault();
          confirmar();
        }}
      >
        {itens.map((item) => {
          const posicao = ordem.indexOf(item.id);
          const indice = posicao === -1 ? itens.length : posicao;

          return (
            <div
              key={item.id}
              className={`item-grade${classeLargura(item.largura)}`}
              style={{ order: indice }}
              data-arrastando={arrastando === item.id}
              data-arrastando-algo={arrastando !== null}
              onDragOver={(e) => {
                if (!arrastandoRef.current) return;
                // Sem o preventDefault o navegador recusa o drop neste alvo.
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                previsualizar(item.id);
              }}
              onDrop={(e) => {
                e.preventDefault();
                confirmar();
              }}
            >
              <button
                type="button"
                className="alca-arraste"
                draggable
                aria-label={`Reordenar ${item.titulo}. Posição ${indice + 1} de ${itens.length}. Use as setas para mover.`}
                title="Arraste para reordenar, ou use as setas do teclado"
                onDragStart={(e) => {
                  iniciarArrasto(item.id);
                  e.dataTransfer.effectAllowed = 'move';
                  // O Firefox só inicia o arrasto se houver algum dado definido.
                  e.dataTransfer.setData('text/plain', item.id);
                }}
                onDragEnd={() => {
                  // Roda depois do `drop`. Se houve drop, `confirmar` já zerou a
                  // ordem original e não há o que desfazer.
                  cancelar();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    moverPara(item.id, -1);
                  } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    moverPara(item.id, 1);
                  }
                }}
              >
                <span aria-hidden="true">⠿</span>
              </button>

              {/*
                * Arrastar é gesto de mouse e as setas exigem teclado físico. Em
                * tela de toque não existiria jeito nenhum de reordenar, então
                * estes dois botões aparecem onde não há hover disponível.
                */}
              <div className="mover-toque">
                <button
                  type="button"
                  className="botao-mover"
                  aria-label={`Mover ${item.titulo} para trás`}
                  disabled={indice === 0}
                  onClick={() => moverPara(item.id, -1)}
                >
                  <span aria-hidden="true">‹</span>
                </button>
                <button
                  type="button"
                  className="botao-mover"
                  aria-label={`Mover ${item.titulo} para frente`}
                  disabled={indice === itens.length - 1}
                  onClick={() => moverPara(item.id, 1)}
                >
                  <span aria-hidden="true">›</span>
                </button>
              </div>
              {item.node}
            </div>
          );
        })}
      </div>

      {/* Anuncia a nova posição a quem usa leitor de tela. */}
      <p className="sr-apenas" role="status" aria-live="polite">
        {aviso}
      </p>
    </>
  );
}
