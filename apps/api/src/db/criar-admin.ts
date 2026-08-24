/**
 * Cria o primeiro administrador — ou avisa que já existe um.
 *
 * Uso: `npm run criar-admin` na raiz.
 *
 * Este é o único caminho para a primeira conta. Não há auto-registro na API
 * (a especificação pede cadastro por administrador), e sem esta ponte o sistema
 * subiria trancado, sem ninguém para abrir a porta.
 *
 * A senha vem de `ADMIN_SENHA`; se não houver, é sorteada e impressa **uma vez**
 * no terminal. Deixar uma senha padrão no código seria a mesma em toda
 * instalação, e a primeira conta é justamente a de administrador.
 */

import { randomBytes, randomInt } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import {
  carregarAmbiente,
  explicarErro,
  obterDatabaseUrl,
} from '../config/ambiente';
import * as schema from './schema';
import { usuarios } from './schema';
import { gerarHash, emailPareceValido, normalizarEmail, validarSenha } from '../auth/senhas';

carregarAmbiente();

/**
 * Sorteia uma senha legível de digitar e forte o bastante.
 *
 * Sem caracteres ambíguos (l, I, 1, O, 0): esta senha vai ser lida de um
 * terminal e digitada à mão, e "l ou 1?" faz a pessoa desistir e escolher algo
 * fraco. `randomInt` do módulo `crypto` — `Math.random()` não serve para nada
 * que proteja acesso.
 */
function sortearSenha(tamanho = 20): string {
  const alfabeto = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let senha = '';
  for (let i = 0; i < tamanho; i += 1) {
    senha += alfabeto[randomInt(alfabeto.length)];
  }
  return senha;
}

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: obterDatabaseUrl() });
  const db = drizzle(pool, { schema });

  const existentes = await db.select().from(usuarios);
  const admins = existentes.filter((u) => u.papel === 'ADMIN');

  if (admins.length > 0) {
    console.log('Já existe administrador cadastrado:');
    for (const a of admins) {
      console.log(`  ${a.nome} <${a.email}>${a.ativo ? '' : ' (desativado)'}`);
    }
    console.log('');
    console.log('Novas contas são criadas pela tela Configurações → Equipe.');
    console.log('Esqueceu a senha? Rode:  npm run redefinir-senha');
    await pool.end();
    return;
  }

  const nome = process.env.ADMIN_NOME?.trim() || 'Administrador';
  const email = normalizarEmail(
    process.env.ADMIN_EMAIL?.trim() || 'admin@laboratorio.local',
  );

  if (!emailPareceValido(email)) {
    throw new Error(`ADMIN_EMAIL não é um e-mail válido: ${email}`);
  }

  const senhaInformada = process.env.ADMIN_SENHA;
  const senha = senhaInformada || sortearSenha();

  const problema = validarSenha(senha);
  if (problema) throw new Error(`ADMIN_SENHA recusada: ${problema}`);

  await db.insert(usuarios).values({
    nome,
    email,
    senhaHash: await gerarHash(senha),
    papel: 'ADMIN',
    // Senha sorteada passou pelo terminal: trocar no primeiro acesso.
    precisaTrocarSenha: !senhaInformada,
  });

  console.log('');
  console.log('  Administrador criado.');
  console.log('');
  console.log(`    E-mail:  ${email}`);
  if (senhaInformada) {
    console.log('    Senha:   a que você definiu em ADMIN_SENHA');
  } else {
    console.log(`    Senha:   ${senha}`);
    console.log('');
    console.log('  Anote agora: esta senha não é gravada em lugar nenhum e não');
    console.log('  aparece de novo. O sistema pede a troca no primeiro acesso.');
  }
  console.log('');

  await pool.end();
}

main().catch((e: unknown) => {
  console.error(explicarErro(e));
  process.exit(1);
});

export { sortearSenha, randomBytes };
