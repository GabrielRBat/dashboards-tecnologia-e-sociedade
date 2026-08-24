/**
 * Carregamento das variáveis de ambiente.
 *
 * Procura o arquivo `.env` subindo os diretórios a partir daqui — assim funciona
 * tanto com um `.env` na raiz do monorepo quanto com um dentro de `apps/api`,
 * sem precisar manter cópias sincronizadas. O mais próximo vence, porque o
 * `dotenv` não sobrescreve variável já definida.
 *
 * Também funciona rodando pelo código-fonte (tsx) ou pelo compilado (dist).
 */

import { existsSync } from 'node:fs';
import { dirname, join, parse } from 'node:path';
import { config } from 'dotenv';

/** Diretórios inspecionados na última chamada — usado nas mensagens de erro. */
let ultimosCaminhos: string[] = [];

function diretoriosAcima(inicio: string): string[] {
  const raizDoDisco = parse(inicio).root;
  const caminhos: string[] = [];
  let atual = inicio;

  while (true) {
    caminhos.push(atual);
    if (atual === raizDoDisco) break;
    const pai = dirname(atual);
    if (pai === atual) break;
    atual = pai;
  }

  return caminhos;
}

/**
 * Carrega o `.env` mais próximo (e os de níveis acima, como complemento).
 * Chame no início de qualquer processo que precise de `DATABASE_URL`.
 */
export function carregarAmbiente(): void {
  const partida =
    typeof __dirname === 'string' ? __dirname : process.cwd();

  const encontrados: string[] = [];

  for (const diretorio of diretoriosAcima(partida)) {
    const arquivo = join(diretorio, '.env');
    if (existsSync(arquivo)) {
      config({ path: arquivo });
      encontrados.push(arquivo);
    }
  }

  ultimosCaminhos = encontrados;
}

/**
 * Devolve a `DATABASE_URL` ou explica exatamente o que fazer para criá-la.
 * Mensagem em vez de `undefined`: quem roda o seed pela primeira vez precisa
 * saber qual arquivo criar e onde.
 */
export function obterDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url) return url;

  const achados = ultimosCaminhos.length
    ? `Arquivos .env encontrados: ${ultimosCaminhos.join(', ')} — nenhum define DATABASE_URL.`
    : 'Nenhum arquivo .env foi encontrado a partir desta pasta até a raiz do disco.';

  throw new Error(
    [
      'DATABASE_URL não definida.',
      '',
      achados,
      '',
      'Para resolver, na raiz do projeto:',
      '  Windows (PowerShell):  Copy-Item .env.example .env',
      '  macOS / Linux:         cp .env.example .env',
      '',
      'Um único .env na raiz do projeto basta — a API o encontra sozinha.',
    ].join('\n'),
  );
}

/**
 * Transforma o erro num texto útil para quem está rodando o comando.
 * Banco fora do ar é o tropeço mais comum na primeira execução, e a mensagem
 * crua do driver ("connect ECONNREFUSED 127.0.0.1:5432") não diz o que fazer.
 */
export function explicarErro(erro: unknown): string {
  const mensagem = erro instanceof Error ? erro.message : String(erro);

  if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(mensagem)) {
    return [
      `Não foi possível conectar ao banco de dados (${mensagem}).`,
      '',
      'Confira se o PostgreSQL está no ar:',
      '  docker compose up -d',
      '',
      'e se a DATABASE_URL do seu .env aponta para ele.',
    ].join('\n');
  }

  if (/password authentication failed|autentica/i.test(mensagem)) {
    return [
      `O banco recusou as credenciais da DATABASE_URL (${mensagem}).`,
      '',
      'Quase sempre isso é outro PostgreSQL ocupando a porta — o do Windows, por',
      'exemplo — em vez do banco do projeto. Para usar o do projeto numa porta',
      'livre, ajuste no .env da raiz:',
      '  DB_PORT=5433',
      '  DATABASE_URL="postgresql://postgres:postgres@localhost:5433/argamassas"',
      '',
      'e suba o banco de novo: docker compose up -d',
    ].join('\n');
  }

  if (/database .* does not exist/i.test(mensagem)) {
    return [
      `O banco indicado na DATABASE_URL não existe (${mensagem}).`,
      '',
      'Crie o banco ou use o Postgres do projeto: docker compose up -d',
    ].join('\n');
  }

  if (/relation .* does not exist/i.test(mensagem)) {
    return [
      `Tabela não encontrada (${mensagem}).`,
      '',
      'Rode as migrações antes do seed: npm run db:migrate',
    ].join('\n');
  }

  return mensagem;
}
