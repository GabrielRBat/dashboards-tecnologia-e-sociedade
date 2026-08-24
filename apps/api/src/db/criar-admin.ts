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

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import {
  carregarAmbiente,
  explicarErro,
  obterDatabaseUrl,
} from '../config/ambiente';
import * as schema from './schema';
import { usuarios } from './schema';
import {
  TAMANHO_MINIMO_SENHA,
  gerarHash,
  identificadorValido,
  normalizarEmail,
  validarSenha,
} from '../auth/senhas';
import { sortearSenha } from './senha-sorteada';

carregarAmbiente();

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

  if (!identificadorValido(email)) {
    throw new Error(
      `ADMIN_EMAIL inválido: "${email}". Use um e-mail, ou um nome de usuário com pelo menos 3 caracteres (letras, números, ponto, hífen ou sublinhado).`,
    );
  }

  const senhaInformada = process.env.ADMIN_SENHA;
  const senha = senhaInformada || sortearSenha();

  /*
   * Senha curta passa só quando foi digitada de propósito em ADMIN_SENHA — é
   * escolha consciente de quem tem o `.env` na mão. Sorteada, a regra vale
   * inteira. O aviso abaixo deixa o risco à vista em vez de escondê-lo.
   */
  const problema = validarSenha(senha);
  const senhaFraca = Boolean(problema && senhaInformada);
  if (problema && !senhaInformada) throw new Error(problema);

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
