'use client';

/**
 * Lista do que falta para a senha ser aceita.
 *
 * Um botão desabilitado sem explicação é um beco: a pessoa vê que não dá para
 * continuar e não descobre o que corrigir. Aqui cada exigência aparece o tempo
 * todo, e vai sendo marcada conforme é cumprida — dá para saber o que falta
 * antes de tentar, e não depois de um erro.
 *
 * O estado "ainda não mexeu no campo" é diferente de "está errado": marcar tudo
 * de vermelho antes da primeira tecla trata a pessoa como se já tivesse errado.
 */

export const MINIMO_SENHA = 10;

export interface Requisito {
  texto: string;
  atendido: boolean;
}

/** Monta os requisitos de uma senha nova, com a confirmação. */
export function requisitosDaSenha(
  senha: string,
  confirmacao: string,
): Requisito[] {
  return [
    {
      texto: `Pelo menos ${MINIMO_SENHA} caracteres`,
      atendido: senha.length >= MINIMO_SENHA,
    },
    {
      texto: 'Sem espaço no começo nem no fim',
      atendido: senha.length === 0 || senha.trim() === senha,
    },
    {
      texto: 'As duas digitadas são iguais',
      atendido: senha.length > 0 && senha === confirmacao,
    },
  ];
}

export function ListaRequisitos({
  requisitos,
  mostrar,
}: {
  requisitos: Requisito[];
  /** Falso enquanto a pessoa não começou a digitar. */
  mostrar: boolean;
}) {
  return (
    <ul className="requisitos-senha" aria-label="Requisitos da senha">
      {requisitos.map((r) => {
        const estado = !mostrar ? 'neutro' : r.atendido ? 'ok' : 'falta';
        return (
          <li key={r.texto} data-estado={estado}>
            <span aria-hidden="true" className="requisito-marca">
              {estado === 'ok' ? '✓' : estado === 'falta' ? '•' : '•'}
            </span>
            {r.texto}
            {/* Leitor de tela não enxerga cor nem símbolo: o estado vai em texto. */}
            {mostrar ? (
              <span className="sr-apenas">
                {r.atendido ? ' — cumprido' : ' — ainda falta'}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Diz, em uma frase, por que o botão está bloqueado.
 *
 * A lista acima mostra o que falta na senha; esta frase cobre o resto do
 * formulário — um campo em branco, por exemplo, que não aparece na lista.
 */
export function motivoBloqueio(
  campos: { rotulo: string; preenchido: boolean }[],
  requisitos: Requisito[],
): string | null {
  const vazios = campos.filter((c) => !c.preenchido);
  if (vazios.length === 1) return `Falta preencher: ${vazios[0]?.rotulo}.`;
  if (vazios.length > 1) {
    return `Falta preencher: ${vazios.map((c) => c.rotulo).join(', ')}.`;
  }

  const pendentes = requisitos.filter((r) => !r.atendido);
  if (pendentes.length === 0) return null;

  return pendentes.length === 1
    ? `Falta: ${pendentes[0]?.texto.toLowerCase()}.`
    : `Falta: ${pendentes.map((r) => r.texto.toLowerCase()).join('; ')}.`;
}
