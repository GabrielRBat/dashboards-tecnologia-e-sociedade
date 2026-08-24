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

- **Visão geral** — indicadores do conjunto filtrado e doze gráficos:

  | Gráfico | O que mostra |
  |---|---|
  | Evolução da resistência por idade | Compressão e flexão aos 3/7/14/28 dias |
  | Resistência e dispersão por idade | A mesma média com **desvio padrão** entre os corpos de prova |
  | Curvas granulométricas | Retida acumulada em escala log, sobre as **zonas ótima e utilizável da NBR 7211** |
  | Classes de compressão, retenção e densidade | Distribuição pelas classes **P, U e D da NBR 13281** |
  | Squeeze-flow | Carga × deslocamento, comportamento reológico no estado fresco |
  | Flexão × compressão | Correlação entre os dois ensaios mecânicos, com reta de tendência e R² |
  | Módulo de elasticidade × compressão | Módulo dinâmico por ultrassom aos 28 dias |
  | Relação água/ligante × resistência | Cada ponto é uma formulação |
  | Distribuição por tipo de projeto | Quantidade de formulações |
  | Ranking aos 28 dias | Formulações mais resistentes |

  Os gráficos normativos seguem o que a literatura da área publica — curva
  granulométrica em escala logarítmica com as faixas da norma atrás, média com
  barra de erro, correlações com R². As convenções adotadas (e o que os dados de
  hoje **não** permitem desenhar) estão em [`docs/CALCULOS.md`](docs/CALCULOS.md).
  Os cartões são **reposicionáveis**: arraste pela alça e a grade se reorganiza
  ao vivo, mostrando onde o cartão vai cair. A ordem fica salva no navegador de
  cada pessoa. Funciona também pelo teclado (setas, com a alça em foco) e por
  toque (botões ‹ › que aparecem em aparelhos sem cursor).
- **Dashboards customizados** — monte seus próprios gráficos escolhendo as
  métricas. O construtor **recusa cruzamentos que não fazem sentido** e diz por
  quê (ver abaixo). Os dashboards ficam no banco e são compartilhados com a
  equipe.
- **Formulações** — tabela com todos os registros e os valores já calculados,
  com busca e filtros por tipo de projeto, origem, desenvolvedor e período.
- **Detalhe da formulação** — composição, os três estados, resistências por
  idade com desvio padrão, corpos de prova do estado endurecido e granulometria.
- **Importar planilha** — sobe o arquivo `.xlsx` do laboratório e grava as
  formulações, com relatório de linhas lidas, importadas e avisos por linha.
- **Configurações** — escolha do tema (Automático, Claro ou Escuro) e
  informações da instalação.

- **Contas e acesso** — login com e-mail e senha, criação de conta, troca de
  senha e gestão da equipe pelo administrador.

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
│   │       ├── calculos/       # fórmulas (calculos.ts) e normas (normas.ts)
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
└── docs/CALCULOS.md            # fórmulas, divergências da planilha e normas
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

## Aparência

A interface acompanha o tema do sistema (ver *Tema*). No escuro, o fundo é preto
com dois halos de gradiente, e sobre ele ficam painéis translúcidos — cabeçalho,
cartões, filtros e tabelas. No claro, o mesmo desenho com a paleta invertida.

Duas decisões de desempenho, porque o efeito de vidro é fácil de tornar caro:

- **Só o cabeçalho tem desfoque de verdade** (`backdrop-filter`). Ele obriga o
  navegador a reamostrar o que está atrás a cada quadro; num elemento fixo e
  único isso se paga, espalhado por uma dúzia de cartões, não. Os cartões usam
  translucidez e um fio de luz na aresta — mesma leitura, custo de pintura comum.
- **O gradiente do fundo vive numa camada `fixed` atrás de tudo**, não no fundo
  do `body`. Assim é pintado uma vez; no `body` cada rolagem repintaria o degradê
  inteiro.

As animações (entrada dos cartões, elevação no hover, sublinhado da navegação)
mexem só em `opacity` e `transform`, que o compositor resolve sem recalcular
layout. Quem tem **"reduzir movimento"** ligado no sistema recebe a interface
parada — os realces de hover continuam, sem deslocamento.

## No celular e no tablet

A interface funciona de 320 px (iPhone SE) para cima. Duas coisas guiaram os
ajustes, e vale saber a diferença porque elas não são a mesma:

- **Largura** decide o *layout*: a navegação passa a rolar na horizontal com
  rótulos curtos, os filtros viram uma coluna só, os indicadores ficam em duas
  colunas abaixo de 400 px.
- **Ausência de cursor** (`hover: none`) decide o *toque*: alvos de 44 px,
  campos com fonte de 16 px, e os botões `‹ ›` no lugar da alça de arrasto.

A separação importa: um tablet de 1024 px é tão de dedo quanto um celular, e um
monitor pequeno com mouse não precisa de botão grande.

Três detalhes que costumam passar batido:

| Detalhe | Por quê |
|---|---|
| Campos com **16 px** no toque | Abaixo disso o Safari do iPhone dá zoom sozinho ao focar, e a página fica torta |
| `min-width: 0` nos itens de grade | Grid item não encolhe abaixo do conteúdo por padrão; um cartão com tabela larga empurrava a página inteira para fora da tela |
| Sombra na borda da tabela | As doze colunas não cabem em tela pequena; sem o aviso visual ninguém descobre que a tabela continua rolando |

No **ranking dos 28 dias**, o eixo de nomes encolhe de 190 px para 104 px no
celular e a nomenclatura é cortada **pelo começo** — "Argamassa Colante_7" vira
"Colante_7". Cortar pelo fim transformaria duas formulações diferentes no mesmo
rótulo, já que o que as distingue é o número final.

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

## Contas e acesso

Sessão por **JWT** (Passport no NestJS), senha guardada como hash **bcrypt**.

### Primeiro acesso

Depois de subir o banco, crie o administrador:

```bash
npm run criar-admin
```

Ele sorteia uma senha forte e a mostra **uma única vez** no terminal — anote,
porque ela não fica gravada em lugar nenhum (só o hash) e o sistema pede a troca
no primeiro acesso. Para definir a senha você mesmo, preencha `ADMIN_SENHA` no
`.env` antes de rodar.

Rodar o comando de novo quando já existe administrador não cria outro: ele
apenas mostra quem já está cadastrado.

### Como funciona

| Papel | Pode |
|---|---|
| **Membro** | Ver os ensaios, montar e editar dashboards |
| **Administrador** | Tudo isso, mais criar contas, mudar papéis, desativar e redefinir senhas em **Equipe** |

Há **duas** formas de uma conta nascer: qualquer pessoa cria a sua em
`/registrar`, ou um administrador cria em **Equipe** (com senha provisória
sorteada, que a pessoa troca no primeiro acesso). Contas novas são sempre
**Membro** — o papel nunca vem da requisição, só de um administrador depois.

> **Atenção:** o auto-registro é **aberto a qualquer e-mail**, por decisão
> registrada em [`ESPECIFICACOES.md`](ESPECIFICACOES.md#41-autenticação). Quem
> alcançar o endereço do sistema pode criar conta e ver os dados do laboratório.
> Para fechar, remova a rota `POST /api/auth/registrar` e a página `/registrar`.

### Decisões de segurança

| Decisão | Motivo |
|---|---|
| Token em cookie **`httpOnly`**, não em `localStorage` | Qualquer script na página lê o `localStorage` e leva a sessão junto. O cookie `httpOnly` é invisível para JavaScript |
| O cookie é gravado pelo **Next**, não pela API | A API responde noutra porta; o cookie ficaria no domínio dela, fora do alcance do frontend |
| Guard **global**: tudo nasce protegido | Só o que tem `@Publico()` fica aberto. Proteger rota a rota deixa endpoint novo exposto por esquecimento |
| Papel e situação relidos **do banco** a cada requisição | Desativar alguém vale na hora, e não quando o token vencer, doze horas depois |
| Mesma mensagem para senha errada e e-mail inexistente | Diferenciar entregaria a lista de quem tem conta. O tempo de resposta também é igualado, com um hash de mentira |
| **5 tentativas de login por minuto** por IP | O bcrypt atrasa a força bruta; o limite é o que a impede |
| `JWT_SEGREDO` sem valor padrão, mínimo de 32 caracteres | Um padrão no código valeria para toda instalação, e quem o lesse forjaria um token de administrador. A API recusa subir sem ele |
| **bcryptjs**, e não `bcrypt` | O `bcrypt` compila binário nativo. O projeto já trocou o Prisma pelo Drizzle pelo mesmo motivo |
| Sessão de **12 horas**, sem refresh token | Cobre um dia de trabalho e expira. Refresh precisaria ser guardado e revogado — mais superfície de ataque sem problema a resolver aqui |

O sistema também impede rebaixar, desativar ou excluir o **último administrador
ativo** — sem isso, seria possível ficar sem ninguém capaz de criar contas, e
sem caminho de volta pela interface.

## Busca e filtros

O campo de busca procura, de uma vez, em quatro lugares:

| Onde | Como casa |
|---|---|
| Nomenclatura | Trecho em qualquer posição — `Contrapiso` traz todos os contrapisos |
| Comentários | Idem |
| Desenvolvedor | Idem — `Fulano_2` traz as formulações dessa pessoa |
| Numeração | **Só número exato** — `48` traz a formulação nº 48 |

Cuidado com números curtos: `1` casa com o texto de `Revestimento_1`, `_10`,
`_21`… além da formulação nº 1. Para achar uma formulação específica pelo
número, o seletor da tabela é mais direto.

A busca **filtra o painel inteiro**, não só a tabela — os doze gráficos passam a
falar do subconjunto encontrado. Digitar não dispara uma consulta por tecla: o
campo espera 350 ms de pausa antes de navegar, senão "Contrapiso" custaria dez
recargas do painel, nove delas jogadas fora.

Todos os filtros vivem na URL, então um recorte pode ser copiado e enviado a
outra pessoa: `/?busca=Contrapiso&tipoProjeto=RC`.

## Dashboards customizados

Em **Dashboards → Novo dashboard** dá para montar gráficos com as métricas que a
análise pedir. São três formas:

| Tipo | Para quê | Precisa de |
|---|---|---|
| **Dispersão** | Ver se duas medidas andam juntas; sai com reta de tendência e R² | Duas métricas **contínuas** |
| **Barras por categoria** | Comparar grupos (tipo de projeto, origem, classe da norma) | Uma **categoria** e uma medida contínua para resumir |
| **Distribuição** | Quantas formulações caem em cada faixa ou categoria | Uma métrica, contínua ou categórica |

### Por que algumas combinações são recusadas

O construtor não deixa montar um gráfico que engana. O que decide é o **nível do
dado**, mais do que a unidade:

- **Níveis diferentes não se cruzam.** Retenção de água é um valor por
  formulação; frequência retida é um valor por peneira. Alinhar os dois produz um
  gráfico com aparência de resultado sem ser um.
- **Dispersão exige duas medidas contínuas.** Com uma categoria num dos eixos, os
  pontos se enfileiram em colunas e a reta de tendência vira ruído com cara de
  descoberta.
- **Barras exigem categoria no eixo horizontal.** Uma medida contínua não forma
  grupos.
- **A mesma métrica nos dois eixos** dá R² = 1 sempre. É uma reta, não um achado.

Quando o cruzamento é legítimo mas pede leitura cuidadosa, aparece uma ressalva
em vez de um bloqueio — por exemplo, cruzar compressão aos 3 e aos 28 dias mede o
ganho de resistência com o tempo, não duas propriedades independentes.

**A validação vale no servidor, não só na tela.** Uma requisição direta à API com
um cruzamento inválido é recusada com o mesmo motivo — senão bastaria contornar a
interface para o gráfico enganoso passar a existir para toda a equipe.

O R² também vem traduzido em palavras ("relação fraca — pouco confiável para
prever"), porque o número sozinho leva a superinterpretar.

### Onde ficam salvos

Na tabela `dashboards`, em `jsonb` — são configuração de tela, não dado de
laboratório. **Como ainda não há login, são compartilhados e sem dono:** qualquer
pessoa vê, edita e exclui os de qualquer outra. A exclusão pede confirmação. Com
a autenticação, entra a coluna de autor.

> A **ordem dos gráficos** dentro de um dashboard segue a mesma regra da visão
> geral: fica no navegador de cada pessoa, e é reposicionável por arrasto.

## Modelo de dados

| Tabela | O que guarda |
|---|---|
| `formulacoes` | Uma linha da planilha: identificação, teor de água e os dados brutos dos estados anidro e fresco. |
| `materiais` | Cadastro de insumos (cimentos, cales, fíleres, areias, aditivos, fibras). Substitui as 36 colunas fixas da planilha por um cadastro que o laboratório pode ampliar. |
| `componentes_formulacao` | Teor de cada material numa formulação, em % da massa seca. |
| `pontos_granulometricos` | Frequência (%) por diâmetro de peneira. |
| `ensaios_resistencia` | Valores por CP de flexão (3 CPs) e compressão (6 CPs), por idade. |
| `corpos_de_prova_endurecidos` | Dimensões, massa e leituras de ultrassom de cada CP aos 14 e 28 dias. |
| `dashboards` | Painéis montados pela equipe. Os gráficos ficam em `jsonb` — é configuração de tela, e nenhuma consulta precisa filtrar por painel. |

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
| `npm run build` | Compila tudo (**pare o `npm run dev` antes** — ver abaixo) |
| `npm run test` | Testes unitários da API |
| `npm run db:generate` | Gera migração a partir do schema |
| `npm run db:migrate` | Aplica as migrações |
| `npm run db:seed` | Popula o banco com dados de exemplo |
| `npm run criar-admin` | Cria o primeiro administrador (mostra a senha uma vez) |
| `npm run db:studio` | Abre o Drizzle Studio |

> **Não rode `npm run build` com o `npm run dev` aberto.** Os dois escrevem na
> mesma pasta `.next`; o build de produção sobrescreve os arquivos que o modo de
> desenvolvimento está servindo, e o navegador passa a receber 404 nos scripts —
> a página abre, mas nada interativo funciona. Se acontecer: pare tudo, apague
> `apps/web/.next` e suba de novo.

### Endpoints de indicadores

| Rota | Devolve |
|---|---|
| `/api/indicadores/painel` | **Tudo o que a visão geral precisa, numa leitura só do banco** |
| `/api/indicadores/resumo` | Indicadores agregados |
| `/api/indicadores/evolucao-media` · `/evolucao` | Resistência por idade, do conjunto ou por formulação |
| `/api/indicadores/dispersao-idade` | Média por idade com desvio padrão dos CPs |
| `/api/indicadores/granulometria` · `/zonas-granulometricas` | Curvas com retida acumulada; zonas da NBR 7211 |
| `/api/indicadores/classificacao` | Distribuição nas classes P, D e U da NBR 13281 |
| `/api/indicadores/correlacoes` | Flexão × compressão e módulo × compressão, com reta e R² |
| `/api/indicadores/squeeze-flow` | Carga × deslocamento por formulação |
| `/api/indicadores/comparativo` · `/dispersao` | Ranking aos 28 dias; água/ligante × resistência |

A visão geral mostra dez recortes **do mesmo conjunto filtrado**. Um endpoint por
gráfico faria o banco devolver as mesmas formulações dez vezes, e esse custo
cresce com o tamanho do laboratório — não com o número de gráficos. Por isso a
página usa só o `/painel`: com as 64 formulações do seed, **32 ms contra 166 ms**
das nove chamadas separadas.

Os endpoints individuais continuam existindo, para quem precisar de um recorte
só. Cada indicador é uma função pura sobre a lista já carregada, e o `/painel`
apenas as encadeia sobre uma leitura única.

### Dados de exemplo

O seed grava a formulação real da planilha ("Argamassa de Revestimento_1", com
os valores originais) e gera outras 63 plausíveis em torno dela. Os números são
determinísticos: rodar o seed duas vezes produz o mesmo banco.

Os dados gerados respeitam a física dos ensaios — a resistência acompanha a
relação água/ligante e a retenção de água fica entre 78% e 98%.

---

## Próximos passos

1. Cadastro e edição de formulações pela interface, sem depender da planilha.
2. Exportação dos dados filtrados.
3. Deploy.

---

## Convenções de trabalho

Este projeto segue o procedimento definido em [`AGENT.md`](AGENT.md):
toda alteração de código passa por **testar → corrigir → testar → revisar →
atualizar a documentação → pedir autorização antes de commitar**.

O contexto do projeto está em [`context.md`](context.md) e o histórico de
mudanças em [`changelog.md`](changelog.md).
