/**
 * Redefine a senha de uma conta pelo terminal — a saída para quando ninguém
 * consegue mais entrar.
 *
 * Uso: `npm run redefinir-senha` na raiz, com o alvo no `.env`:
 *   ADMIN_EMAIL="admin"     (ou o e-mail de quem vai ter a senha trocada)
 *   ADMIN_SENHA="..."       (vazio = sorteia e mostra uma vez)
 *
 * Este comando é referenciado pela mensagem do `criar-admin` e **precisa
 * existir**: sem ele, perder a senha do único administrador tranca o sistema
 * para sempre, já que não há recuperação por e-mail.
 */

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import {
  carregarAmbiente,
  explicarErro,
  obterDatabaseUrl,
} from '../config/ambiente';
import {
  TAMANHO_MINIMO_SENHA,
  gerarHash,
  normalizarEmail,
  validarSenha,
} from '../auth/senhas';
import * as schema from './schema';
import { usuarios } from './schema';
import { sortearSenha } from './senha-sorteada';

carregarAmbiente();

async function main(): Promise<void> {
  const alvo = normalizarEmail(process.env.ADMIN_EMAIL?.trim() ?? '');

  if (!alvo) {
    throw new Error(
      [
        'Defina quem vai ter a senha trocada.',
        '',
        'No .env da raiz:',
        '  ADMIN_EMAIL="admin"          # ou o e-mail da pessoa',
        '  ADMIN_SENHA="..."            # vazio = sorteia e mostra uma vez',
      ].join('\n'),
    );
  }

  const pool = new Pool({ connectionString: obterDatabaseUrl() });
  const db = drizzle(pool, { schema });

  const [usuario] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.email, alvo));

  if (!usuario) {
    const todos = await db.select().from(usuarios);
    await pool.end();
    throw new Error(
      [
        `Não há conta com o identificador "${alvo}".`,
        '',
        todos.length
          ? `Contas existentes: ${todos.map((u) => u.email).join(', ')}`
          : 'Não há nenhuma conta ainda — rode: npm run criar-admin',
      ].join('\n'),
    );
  }

  const informada = process.env.ADMIN_SENHA;
  const senha = informada || sortearSenha();

  /*
   * Senha curta é recusada aqui também, com uma exceção: quando a pessoa a
   * digitou em ADMIN_SENHA de propósito. É uma escolha consciente de quem tem
   * acesso ao servidor e ao `.env`, e barrá-la só levaria a contornar o
   * comando editando o banco na mão. O aviso deixa o risco à vista.
   */
  const problema = validarSenha(senha);
  const senhaFraca = Boolean(problema && informada);

  if (problema && !informada) throw new Error(problema);
  if (problema && !senhaFraca) throw new Error(problema);

  await db
    .update(usuarios)
    .set({
      senhaHash: await gerarHash(senha),
      // Senha sorteada passou pelo terminal e por outra pessoa: trocar no
      // primeiro acesso. Senha escolhida pelo dono não precisa.
      precisaTrocarSenha: !informada,
      atualizadoEm: new Date(),
    })
    .where(eq(usuarios.id, usuario.id));

  console.log('');
  console.log(`  Senha redefinida para ${usuario.nome} <${usuario.email}>.`);
  console.log('');

  if (informada) {
    console.log('    Senha:   a que você definiu em ADMIN_SENHA');
    if (senhaFraca) {
      console.log('');
      console.log('  ATENÇÃO: essa senha não passa na regra do sistema');
      console.log(`  (mínimo de ${TAMANHO_MINIMO_SENHA} caracteres). Serve para`);
      console.log('  desenvolvimento local. Não use num sistema exposto na');
      console.log('  internet — "admin" é a primeira coisa que um ataque tenta.');
    }
  } else {
    console.log(`    Senha:   ${senha}`);
    console.log('');
    console.log('  Anote agora: não é gravada em lugar nenhum e não aparece de');
    console.log('  novo. O sistema pede a troca no primeiro acesso.');
  }
  console.log('');

  await pool.end();
}

main().catch((e: unknown) => {
  console.error(explicarErro(e));
  process.exit(1);
});
