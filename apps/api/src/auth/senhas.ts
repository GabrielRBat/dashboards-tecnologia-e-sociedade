/**
 * Hash e verificação de senhas, e as regras do que é uma senha aceitável.
 *
 * Fica em arquivo próprio, sem NestJS por perto, para poder ser testado direto e
 * para haver **um único lugar** que decide como uma senha vira hash. Espalhar
 * isso é como se criam contas gravadas em texto puro.
 */

import { compare, hash } from 'bcryptjs';

/**
 * Custo do bcrypt.
 *
 * 12 leva cerca de 250 ms numa máquina comum — devagar de propósito: é isso que
 * torna caro testar milhões de senhas contra um banco vazado. Não baixe para
 * "melhorar a performance do login"; a lentidão é a funcionalidade.
 */
const CUSTO = 12;

/**
 * Usamos **bcryptjs**, e não `bcrypt`.
 *
 * O `bcrypt` compila código nativo na instalação. Este projeto já trocou o
 * Prisma pelo Drizzle exatamente para não depender de binário fora do npm — em
 * rede corporativa restrita e em parte das hospedagens isso quebra. O bcryptjs é
 * JavaScript puro, mais lento, e para uma equipe de dez pessoas a diferença não
 * aparece.
 */
export function gerarHash(senha: string): Promise<string> {
  return hash(senha, CUSTO);
}

export function conferirSenha(senha: string, hashGuardado: string): Promise<boolean> {
  return compare(senha, hashGuardado);
}

export const TAMANHO_MINIMO_SENHA = 10;

/**
 * Limite do bcrypt: ele ignora tudo depois do 72º **byte**. Sem barrar aqui,
 * duas senhas longas com o mesmo começo abririam a mesma conta.
 */
export const TAMANHO_MAXIMO_SENHA = 72;

/**
 * Diz se a senha serve, e o que há de errado quando não serve.
 *
 * A regra é comprimento, não a exigência de símbolos e maiúsculas: essas fazem
 * as pessoas escolherem `Senha@123` e anotarem num papel. Comprimento é o que
 * realmente encarece um ataque.
 */
export function validarSenha(senha: unknown): string | null {
  if (typeof senha !== 'string' || senha.length === 0) {
    return 'Informe a senha.';
  }
  if (senha.trim().length !== senha.length) {
    return 'A senha não pode começar nem terminar com espaço.';
  }
  if (senha.length < TAMANHO_MINIMO_SENHA) {
    return `A senha precisa ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`;
  }
  if (Buffer.byteLength(senha, 'utf8') > TAMANHO_MAXIMO_SENHA) {
    return `A senha pode ter no máximo ${TAMANHO_MAXIMO_SENHA} bytes.`;
  }
  return null;
}

/** Normaliza o e-mail para comparação: minúsculas e sem espaço nas pontas. */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailPareceValido(email: string): boolean {
  return FORMATO_EMAIL.test(email);
}
