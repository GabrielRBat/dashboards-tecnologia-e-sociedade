import { randomInt } from 'node:crypto';

/**
 * Sorteia uma senha legível de digitar e forte o bastante.
 *
 * Sem caracteres ambíguos (l, I, 1, O, 0): esta senha vai ser lida de um
 * terminal e digitada à mão, e "l ou 1?" faz a pessoa desistir e escolher algo
 * fraco. `randomInt` do módulo `crypto` — `Math.random()` não serve para nada
 * que proteja acesso.
 */
export function sortearSenha(tamanho = 20): string {
  const alfabeto = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let senha = '';
  for (let i = 0; i < tamanho; i += 1) {
    senha += alfabeto[randomInt(alfabeto.length)];
  }
  return senha;
}
