# context.md — Contexto do Projeto

## Objetivo

Dashboard web para dar visibilidade aos dados de ensaios de argamassa.

## Domínio (importante)

Não é controle de qualidade de obra — é **P&D de formulações de argamassa**.
Cada registro é uma formulação desenvolvida pelo laboratório, com:

- identificação: numeração, nomenclatura, tipo de projeto (NP/MT/AT/RC/PE),
  desenvolvedor, alimentador da planilha, avaliador, data, origem
  (Produção ou Laboratório);
- composição: cimentos, cales, fíleres, areias fina e média, aditivos retentores
  de água e incorporadores de ar, fibras, superplastificantes, teor de água;
- ensaios em três estados:
  - **anidro**: granulometria, densidade aparente, relação água/ligante, teor de finos;
  - **fresco**: retenção de água, densidade, squeeze-flow;
  - **endurecido**: resistência à tração na flexão e à compressão aos 3/7/14/28
    dias, densidade e módulo de elasticidade dinâmico aos 14 e 28 dias.

A fonte é a "Planilha de Registro e cálculo" (202 colunas). As abas "Dhasboard" e
"planilha resultados principais" dela estão vazias — é exatamente o que este
projeto entrega.

## Estado atual

Fases 1 a 4 concluídas e testadas — **com autenticação** (JWT, senhas em bcrypt,
dois papéis).

Versionado desde 2026-08-24 no branch `master` de
`github.com/GabrielRBat/dashboards-tecnologia-e-sociedade`.

> **O repositório é público.** A "Planilha de Registro e cálculo" **não é
> versionada** — são dados de P&D do laboratório. O `.gitignore` cobre `*.xlsx`
> e `*.xlsm`, além de `node_modules`, `.next`, `dist`, `.env` e
> `*.tsbuildinfo`. Antes de adicionar qualquer arquivo com dado real, conferir
> se ele pode ficar exposto.

Funcionando: visão geral com indicadores e **doze gráficos**, **dashboards
customizados** montados pela equipe, lista de formulações com filtros, página de
detalhe, importação da planilha `.xlsx` e aba de configurações com escolha de
tema.

Verificado: 46 testes unitários passando (25 de cálculos, 21 das normas), 14 verificações de
comportamento do seletor de tema, typecheck e build limpos na API e no frontend,
API respondendo em todos os endpoints, as cinco telas conferidas em modo claro e
escuro sem erro de console nem overflow, importação da planilha real com 60/60
linhas e nenhum erro.

Conferido de novo em 2026-08-24 subindo o projeto do zero nesta máquina: banco na
porta 5433, migrações e seed (64 formulações, 36 materiais), 46 testes passando,
build da API e typecheck do frontend limpos, os treze endpoints de indicadores em
HTTP 200, as cinco telas no navegador sem erro de console nem overflow, os doze
gráficos renderizando em 1280px e em 375px, e contraste de texto acima de 4,5:1
nos dois temas.

## Decisões tomadas

- Fluxo de trabalho conforme `AGENT.md`.
- Aplicação web para equipe interna pequena (~10 pessoas), hospedada em nuvem.
- **Stack:** Next.js 14 (frontend) + NestJS 10 (backend), TypeScript estrito,
  PostgreSQL 16, Recharts, ExcelJS, Jest.
- **Drizzle ORM no lugar do Prisma.** O Prisma baixa binários próprios de fora do
  npm; isso impediu criar o banco e testar, e também costuma falhar em rede
  corporativa restrita e em parte dos serviços de hospedagem. Drizzle é
  TypeScript puro via npm.
- **Valores calculados não são gravados** — a API os deriva na leitura, então
  corrigir uma fórmula vale para todo o histórico sem migração.
- **Preferência de tema no `localStorage`, não no banco** — é preferência de
  cada pessoa em cada máquina. Três opções (Automático, Claro, Escuro), com
  script no `<head>` para aplicar antes da primeira pintura e não piscar.
- **Um único `.env` na raiz.** A API procura o arquivo subindo os diretórios,
  em vez de exigir cópias sincronizadas em raiz e `apps/api`.
- **Materiais viraram cadastro** (tabela `materiais` + `componentes_formulacao`)
  em vez das 36 colunas fixas da planilha, para o laboratório poder ampliar.
- **Gráficos seguem o que a área publica**, não o que era fácil de fazer:
  curva granulométrica em escala log com as zonas da NBR 7211 atrás, classes da
  NBR 13281, média com barra de erro, correlações com reta e R². Pesquisado na
  literatura de ensaios de argamassa antes de implementar.
- **Convenção nossa para as classes da NBR 13281:** as faixas da norma se
  sobrepõem de propósito (P2 vai de 1,5 a 3,0 e P3 de 2,5 a 4,5; na norma quem
  declara é o fabricante). O sistema adota a **classe mais alta que o valor
  alcança**. Registrado em `docs/CALCULOS.md` — se o laboratório preferir outra,
  muda em `classificar()` e no teste.
- **A visão geral usa um endpoint só (`/indicadores/painel`).** São dez recortes
  do mesmo conjunto filtrado; um endpoint por gráfico faria o banco repetir a
  leitura dez vezes. Cada indicador é função pura sobre a lista carregada e o
  painel as encadeia. Medido: 32 ms contra 166 ms.
- **Sessão em cookie `httpOnly`, gravado pelo Next.** Token no `localStorage`
  seria lido por qualquer script da página. E o cookie precisa ser gravado pelo
  Next, não pela API: ela responde noutra porta, e o cookie ficaria no domínio
  dela, fora do alcance do frontend.
- **Guard global de JWT: tudo nasce protegido**, e só sai da proteção o que tem
  `@Publico()` (hoje: saúde, login, registro e duração da sessão). Proteger rota
  a rota deixa endpoint novo aberto por esquecimento.
- **Papel e situação vêm do banco a cada requisição**, não do token. Desativar
  alguém vale na hora, não quando a sessão vencer.
- **`bcryptjs` em vez de `bcrypt`**, mesma razão da troca do Prisma pelo
  Drizzle: nada que compile binário nativo.
- **Sessão de 12 horas, sem refresh token.** Para dez pessoas, o refresh seria
  mais superfície de ataque (precisa ser guardado e revogado) sem resolver
  problema que exista aqui.
- **`JWT_SEGREDO` sem valor padrão.** A API recusa subir sem ele. Um padrão no
  código valeria para toda instalação e permitiria forjar token de admin.
- **AUTO-REGISTRO PÚBLICO ABERTO, decisão do usuário em 2026-08-24**, contra o
  que a especificação dizia ("cadastro por administrador, sem auto-registro
  público"). Ele foi avisado de que qualquer pessoa passa a criar conta e ver os
  dados de P&D, e confirmou. Travas mantidas: conta nasce sempre `MEMBRO` (o
  papel nunca vem do corpo da requisição) e 3 registros por hora por IP.
  Registrado também em `ESPECIFICACOES.md`, com o caminho para fechar depois.
- **Ambiente local usa `admin` / `admin`** (pedido do usuário em 2026-08-24).
  As credenciais ficam **só no `.env`, que não é versionado** — o código segue
  sorteando senha forte por padrão, então nenhuma instalação nova nasce fraca.
  A regra de 10 caracteres continua valendo no registro, na criação pela
  interface e na troca de senha; a exceção existe apenas nos comandos de
  terminal, com aviso na tela. **Antes de qualquer deploy, redefinir.**
- **O identificador de login não é só e-mail.** A interface exige e-mail no
  cadastro, mas os comandos de terminal aceitam nome de usuário simples
  (`admin`), porque conta de serviço não tem caixa de entrada. Por isso o campo
  do login é `type="text"` — com `type="email"` o navegador recusaria "admin".
- **Nada da Construxion neste projeto** (pedido do usuário em 2026-08-24). Não
  usar o domínio, o nome nem a sigla da empresa: e-mails de exemplo são
  `@exemplo.com`, o admin padrão é `admin@laboratorio.local` e a sigla da marca
  é `AR`. É um projeto acadêmico, separado da empresa.
- **O construtor de dashboards recusa cruzamento sem sentido, e explica.** O que
  decide é o **nível** do dado (formulação, corpo de prova, peneira), mais do que
  a unidade: cruzar níveis diferentes alinha grandezas que não se correspondem.
  Também barra dispersão com eixo categórico, barras sem categoria e métrica
  contra ela mesma. Tudo em `metricas/catalogo.ts`, com 18 testes.
- **A validação roda também na gravação, não só na tela.** A da interface é
  conveniência; a do servidor é a que vale. Sem ela bastaria uma requisição
  direta para gravar um gráfico enganoso, que passaria a existir para a equipe.
- **Dashboards têm dono e visibilidade** (pedido do usuário em 2026-08-24).
  Três níveis: `TODOS`, `GRUPOS` (via `dashboards_grupos`) e `PRIVADO`. Autor e
  administradores enxergam sempre. **Editar é mais restrito que ver** — só autor
  ou admin; enxergar não dá direito de mudar para todos.
- **Quem não pode ver um dashboard recebe 404, não 403.** Um "acesso negado"
  confirmaria a existência, e o nome do painel costuma dizer no que a equipe
  está trabalhando.
- **`GRUPOS` sem nenhum grupo marcado equivale a privado, nunca a "todos".** É o
  engano perigoso: um campo esquecido publicaria o painel para a equipe inteira.
  A regra está em `metricas/visibilidade.ts`, com 16 testes.
- **Dashboards anteriores ao login ficaram sem autor.** Não há como descobrir
  quem os fez. Seguem abertos a todos e editáveis por quem os vê — travá-los em
  "só administrador" tiraria da equipe algo que hoje é dela.
- **Grupos são gerenciados só por administradores.** Quem entra em qual grupo é
  decisão de gestão; deixar cada um se incluir esvaziaria a restrição.
- **Painéis em `jsonb`, não em tabela filha.** São configuração de tela: a forma
  muda a cada tipo de gráfico novo e nenhuma consulta precisa filtrar por painel.
- **Ordem dos gráficos no `localStorage`, como o tema.** É preferência de cada
  pessoa; reorganizar o próprio painel não pode mexer no painel do colega. A
  reordenação muda só a propriedade `order` do CSS — remontar o array de filhos
  recriaria doze SVGs a cada movimento do arrasto. Há conciliação: ids salvos que
  não existem mais são descartados e gráficos novos entram no fim, senão quem
  salvou uma ordem antiga nunca veria um gráfico novo.
- **Arrastar tem três formas de uso.** Mouse (alça), teclado (setas com a alça em
  foco) e toque (botões ‹ ›, que aparecem em `hover: none` — o arrasto HTML5 não
  funciona em tela de toque). Sem isso a funcionalidade existiria só para quem
  usa mouse.
- **Responsividade separa largura de toque.** Largura decide layout (navegação
  com rótulos curtos e rolagem, filtros em uma coluna, indicadores em duas);
  `hover: none` decide alvo de toque de 44 px, fonte de 16 px nos campos e os
  botões ‹ › no lugar do arrasto. Um tablet grande é de dedo, um monitor pequeno
  com mouse não é — por isso não dá para tratar os dois pela mesma media query.
- **Vidro com moderação, por desempenho.** Só o cabeçalho tem `backdrop-filter`
  (elemento único e fixo); os cartões usam translucidez sem desfoque. O gradiente
  do fundo fica numa camada `fixed` atrás de tudo, para não repintar a cada
  rolagem. Animações só em `opacity`/`transform`, e desligadas para quem tem
  "reduzir movimento" no sistema.
- **Três fórmulas da planilha estão erradas e o sistema aplica a versão
  correta** — módulo de elasticidade (sem elevar V ao quadrado e com fator de
  Poisson que se cancela), relação água/ligante (invertida) e densidade média no
  endurecido (método diferente entre 14 e 28 dias). Além disso, as colunas de
  relação água/ligante e teor de finos exibem `#NAME?` em todas as linhas —
  nunca calcularam. Tudo registrado em `docs/CALCULOS.md`.

## Sobre os dados

A planilha entregue tem 60 linhas com numeração e nomenclatura, mas **apenas a
linha 11 ("Argamassa de Revestimento_1") tem os ensaios preenchidos** — as demais
são nomes de template sem medições. Ela serviu como definição da estrutura.

O seed grava essa formulação real com os valores originais e gera outras 63
plausíveis (determinísticas) para desenvolver e testar. Quando o laboratório
preencher a planilha, a importação já funciona.

## Pendências / próximos passos

1. **Histórico de importação** ("quem importou, quando, quantas linhas"), que a
   especificação pede e agora é possível, com usuário identificado.
2. Cadastro e edição de formulações pela interface.
3. Exportação dos dados filtrados.
4. Deploy (provedores a definir). **Antes de expor na internet**, reveja o
   auto-registro aberto: hoje qualquer visitante cria conta.

### Dívidas técnicas conhecidas

- **Sem histórico de importação.** A especificação pede "quem importou, quando,
  quantas linhas" — agora que há usuário identificado, dá para registrar.

- **`packages/shared` é código morto.** Nada o importa desde a troca para o
  Drizzle; os tipos do domínio estão duplicados em `apps/web/src/lib/api.ts`.
  Decidir entre remover o pacote ou passar a usá-lo de verdade. O usuário foi
  avisado e ainda não decidiu.

### A confirmar com o laboratório

- **Módulo de finura sai baixo (~1,4) e não é comparável com a literatura.** Das
  peneiras da planilha, só 1,18 · 0,60 · 0,30 · 0,15 mm são da série normal da
  NBR NM 248 — 1,70 · 1,40 · 0,09 mm não são. Serve para comparar formulações
  entre si. Para um módulo comparável, o ensaio precisaria incluir a série
  normal. O gráfico já traz a ressalva.
- **Squeeze-flow: a planilha não guarda a curva.** A NBR 15839 descreve o ensaio
  como uma curva carga × deslocamento com três estágios, mas a planilha registra
  só um par por repetição. Desenhar os três estágios exigiria os dados brutos do
  equipamento. É decisão do laboratório se vale mudar o registro.
- Coeficiente de Poisson adotado no módulo de elasticidade: ν = 0,2, que é o que
  estava digitado na planilha (embora lá não tivesse efeito, por causa do erro
  na fórmula).
- Massa de argamassa seca de 2500 g usada no ensaio de retenção de água, valor
  fixo na fórmula da planilha (`MASSA_SECA_PADRAO_G` em `calculos.ts`).

## Ambiente de desenvolvimento

- O usuário trabalha no **Windows**, com Docker Desktop instalado e rodando.
- O projeto fica em `C:\Dashboard`.
- `.\subir.ps1` sobe tudo do zero (Node, `.env`, Postgres, dependências,
  migrações, seed e aplicação), conferindo cada pré-requisito.
- Um único `.env` na raiz basta — a API o localiza subindo os diretórios.
- Cuidado ao rodar comandos: `npm run dev` depende do `concurrently`, porque o
  `&` do bash não funciona no `cmd.exe` do Windows.
- **A máquina do usuário tem um PostgreSQL 17 nativo (serviço
  `postgresql-x64-17`) ocupando a porta 5432**, com senha diferente da do
  projeto. O banco do projeto roda na **5433**, definida em `DB_PORT` e na
  `DATABASE_URL` do `.env`. O serviço do Windows não foi mexido — é de outro uso.
- **Não rodar `npm run build` com o `npm run dev` aberto — vale para os dois
  apps.** No frontend, os dois escrevem em `apps/web/.next`: o build sobrescreve
  o que o dev serve e o navegador recebe 404 nos scripts (a página abre e nada
  interativo funciona). Na API é pior: o build escreve em `apps/api/dist`, o
  `nest start --watch` vê a mudança, recompila, escreve de novo — e entra em
  recompilação sem fim, sem nunca voltar a atender. Os dois casos já derrubaram
  verificações nesta sessão. Para consertar: parar tudo, apagar `apps/web/.next`
  e `apps/api/dist`, e subir de novo.
- **Todo arquivo `.ps1` precisa ser salvo em UTF-8 com BOM.** O Windows
  PowerShell 5.1 lê script sem BOM como CP1252, e aí o travessão `—` vira uma
  sequência terminada em `"` (U+201D) — que o PowerShell aceita como
  fecha-aspas, quebrando o parse do arquivo inteiro.
