/**
 * Um `redirect()` do Next é implementado como exceção.
 *
 * Isso significa que qualquer `catch` no caminho o intercepta — e uma página que
 * responde ao erro com `notFound()` transformaria "sua sessão expirou" num 404,
 * em vez de levar a pessoa ao login. Este teste identifica esses erros para que
 * sejam repassados adiante, intactos.
 */
export function ehRedirecionamento(erro: unknown): boolean {
  return (
    typeof erro === 'object' &&
    erro !== null &&
    'digest' in erro &&
    typeof (erro as { digest: unknown }).digest === 'string' &&
    (erro as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  );
}
