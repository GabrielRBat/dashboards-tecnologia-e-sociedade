# Dashboard de Argamassas

Aplicação web para dar visibilidade aos dados de ensaios e formulações de
argamassa do laboratório — substituindo a leitura direta da
"Planilha de Registro e cálculo", que tem 202 colunas e cujas abas de dashboard
nunca foram preenchidas.

Cada formulação passa por caracterização nos três estados (anidro, fresco e
endurecido) e o sistema calcula, a partir dos dados brutos, todos os valores
derivados: densidades, retenção de água, médias e desvios de resistência,
módulo de elasticidade dinâmico e relação água/ligante.

> **Importante:** três fórmulas da planilha original têm erro, e o sistema aplica
> a versão correta. Isso faz alguns números divergirem da planilha, de propósito.
> O detalhe está em [`docs/CALCULOS.md`](docs/CALCULOS.md) — vale a leitura antes
> de comparar resultados.

---

## O que já funciona

- **Visão geral** — indicadores do conjunto filtrado, evolução da resistência por
  idade (3/7/14/28 dias), distribuição por tipo de projeto, dispersão entre
  relação água/ligante e resistência, curvas granulométricas e ranking das
  formulações mais resistentes aos 28 dias.
- **Formulações** — tabela com todos os registros e os valores já calculados,
  com busca e filtros por tipo de projeto, origem, desenvolvedor e período.
- **Detalhe da formulação** — composição, os três estados, resistências por
  idade com desvio padrão, corpos de prova do estado endurecido e granulometria.
- **Importar planilha** — sobe o arquivo `.xlsx` do laboratório e grava as
  formulações, com relatório de linhas lidas, importadas e avisos por linha.
- **Configurações** — escolha do tema (Automático, Claro ou Escuro) e
  informações da instalação.

Ainda **não** há login — por decisão de sequência, a autenticação entra depois
(ver *Próximos passos*).

---

## Como rodar

Pré-requisitos: **Node 20+** e **PostgreSQL 16** (ou Docker).

**Windows (PowerShell) — caminho curto:**

```powershell
.\subir.ps1
```

O script confere o Node, cria o `.env`, sobe o PostgreSQL, instala as
dependências, cria as tabelas, popula os dados de exemplo e inicia a aplicação.
Se algo faltar, ele para e diz exatamente o que fazer.

Opções: `.\subir.ps1 -PularSeed` (não repopula o banco) e
`.\subir.ps1 -SomenteBanco` (só prepara o banco).

**Windows (PowerShell) — passo a passo:**

```powershell
npm install
Copy-Item .env.example .env      # um .env na raiz basta
docker compose up -d             # sobe o PostgreSQL
npm run db:migrate               # cria as tabelas
npm run db:seed                  # popula com dados de exemplo
npm run dev                      # sobe API e frontend
```

**macOS / Linux:**

```bash
npm install
cp .env.example .env
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

O `.env` fica **só na raiz** do projeto — a API o encontra sozinha, subindo as
pastas a partir de onde estiver rodando. Não é preciso duplicá-lo em `apps/api`.

Se algum comando falhar, a mensagem diz o que fazer: `.env` faltando, banco fora
do ar, credenciais recusadas ou migrações ainda não aplicadas têm cada um a sua
instrução.

### Se a porta 5432 já estiver ocupada

É comum a máquina já ter um PostgreSQL próprio (o instalador do Windows, por
exemplo) ocupando a 5432. Nesse caso o banco do projeto não sobe, ou pior: os
comandos tentam falar com o PostgreSQL errado e falham com **erro de
autenticação**.

A solução é escolher outra porta no `.env` da raiz — em **dois** lugares:

```dotenv
DB_PORT=5433
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/argamassas"
```

`DB_PORT` é a porta que o container publica na sua máquina (o `docker-compose.yml`
a lê); a `DATABASE_URL` é por onde a API se conecta. As duas precisam combinar.
Dentro do container o PostgreSQL segue na 5432 — só o lado de fora muda.

- Frontend: <http://localhost:3000>
- API: <http://localhost:3333/api>
- Verificação rápida: <http://localhost:3333/api/saude>

Para subir só um dos dois: `npm run dev:api` ou `npm run dev:web`.

---

## Estrutura

```
Dashboard/
├── apps/
│   ├── api/                    # NestJS + Drizzle ORM
│   │   ├── drizzle/            # migrações SQL geradas
│   │   └── src/
│   │       ├── calculos/       # fórmulas do laboratório (puras, testadas)
│   │       ├── config/         # carregamento do .env e mensagens de erro
│   │       ├── db/             # schema, conexão, migrate e seed
│   │       ├── formulacoes/    # consulta e mapeamento das formulações
│   │       ├── importacao/     # leitura da planilha .xlsx
│   │       ├── indicadores/    # agregações do dashboard
│   │       └── materiais/      # cadastro de insumos
│   └── web/                    # Next.js (App Router)
│       └── src/
│           ├── app/            # páginas
│           ├── components/     # gráficos, filtros, cartões, tema
│           └── lib/            # cliente da API e formatação
├── packages/shared/            # tipos compartilhados
└── docs/CALCULOS.md            # as fórmulas e as divergências da planilha
```

### Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14 (App Router), React, Recharts |
| Backend | NestJS 10 |
| Banco | PostgreSQL 16 + Drizzle ORM |
| Planilhas | ExcelJS |
| Testes | Jest |

Tudo em TypeScript, em modo estrito.

> **Por que Drizzle e não Prisma?** O Prisma baixa binários próprios de um
> servidor fora do npm. Isso quebra em rede corporativa restrita e em parte dos
> serviços de hospedagem. O Drizzle é TypeScript puro instalado pelo npm, sem
> binário nenhum.

---

## Tema

Em **Configurações → Aparência** o usuário escolhe entre três opções:

| Opção | Comportamento |
|---|---|
| Automático | Segue a configuração do Windows/navegador e muda junto com ela |
| Claro | Fundo claro sempre, mesmo com o sistema no escuro |
| Escuro | Fundo escuro sempre, mesmo com o sistema no claro |

A escolha fica no `localStorage` do navegador — é preferência de cada pessoa em
cada máquina, não um dado do laboratório, então não vai para o banco. Um script
no `<head>` aplica o tema antes da primeira pintura, evitando o flash claro ao
carregar. Se o navegador bloquear o armazenamento, o sistema segue funcionando no
tema do sistema operacional.

Os gráficos acompanham o tema porque as cores vêm de variáveis CSS: o modo escuro
usa passos próprios da paleta, escolhidos para a superfície escura, e não uma
inversão automática das cores claras.

## Modelo de dados

| Tabela | O que guarda |
|---|---|
| `formulacoes` | Uma linha da planilha: identificação, teor de água e os dados brutos dos estados anidro e fresco. |
| `materiais` | Cadastro de insumos (cimentos, cales, fíleres, areias, aditivos, fibras). Substitui as 36 colunas fixas da planilha por um cadastro que o laboratório pode ampliar. |
| `componentes_formulacao` | Teor de cada material numa formulação, em % da massa seca. |
| `pontos_granulometricos` | Frequência (%) por diâmetro de peneira. |
| `ensaios_resistencia` | Valores por CP de flexão (3 CPs) e compressão (6 CPs), por idade. |
| `corpos_de_prova_endurecidos` | Dimensões, massa e leituras de ultrassom de cada CP aos 14 e 28 dias. |

Valores calculados **não são gravados** — a API os deriva na leitura, a partir
das funções em `calculos/`. Assim uma correção de fórmula vale imediatamente
para todo o histórico, sem migração de dados.

---

## Importação da planilha

O importador lê a aba **"planilha de alimentação"** a partir da **linha 11**.

- Linhas sem numeração ou sem nomenclatura são ignoradas (são o template vazio).
- Células de erro do Excel (`#DIV/0!`, `#NAME?`) entram como vazias.
- As colunas calculadas da planilha são ignoradas — a API recalcula tudo.
- A gravação é por número da formulação, então **reimportar a mesma planilha
  atualiza** os registros em vez de duplicar.

O mapa de colunas está em `apps/api/src/importacao/layout-planilha.ts`. Se a
planilha mudar de layout, é o único arquivo a ajustar.

---

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe API e frontend juntos (via `concurrently`, funciona no Windows) |
| `npm run build` | Compila tudo |
| `npm run test` | Testes unitários da API |
| `npm run db:generate` | Gera migração a partir do schema |
| `npm run db:migrate` | Aplica as migrações |
| `npm run db:seed` | Popula o banco com dados de exemplo |
| `npm run db:studio` | Abre o Drizzle Studio |

### Dados de exemplo

O seed grava a formulação real da planilha ("Argamassa de Revestimento_1", com
os valores originais) e gera outras 63 plausíveis em torno dela. Os números são
determinísticos: rodar o seed duas vezes produz o mesmo banco.

Os dados gerados respeitam a física dos ensaios — a resistência acompanha a
relação água/ligante e a retenção de água fica entre 78% e 98%.

---

## Próximos passos

1. Autenticação (login, sessão, proteção de rotas) — os usuários da equipe.
2. Cadastro e edição de formulações pela interface, sem depender da planilha.
3. Exportação dos dados filtrados.
4. Deploy.

---

## Convenções de trabalho

Este projeto segue o procedimento definido em [`AGENT.md`](AGENT.md):
toda alteração de código passa por **testar → corrigir → testar → revisar →
atualizar a documentação → pedir autorização antes de commitar**.

O contexto do projeto está em [`context.md`](context.md) e o histórico de
mudanças em [`changelog.md`](changelog.md).
