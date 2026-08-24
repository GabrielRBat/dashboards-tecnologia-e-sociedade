# ESPECIFICACOES.md — Especificações do Projeto

Dashboard web para visibilidade de dados de ensaios de argamassas.

## 1. Visão geral

Aplicação web com login, onde a equipe interna acessa dashboards com os resultados dos ensaios de argamassa. Os dados entram no sistema principalmente por importação de planilhas Excel/CSV.

- **Usuários:** equipe interna pequena (até ~10 pessoas), todos com nível de acesso parecido.
- **Hospedagem:** nuvem.
- **Entrada de dados:** upload de planilhas Excel/CSV (importação com validação).

## 2. Stack tecnológica

| Camada | Tecnologia | Observações |
|---|---|---|
| Frontend | **Next.js** (React, TypeScript) | App Router; interface dos dashboards, telas de login e upload. |
| Backend | **NestJS** (TypeScript) | API REST; autenticação, importação de planilhas, regras de negócio. |
| Banco de dados | **PostgreSQL 16** | Via **Drizzle ORM** (TypeScript puro, migrações SQL versionadas). Substituiu o Prisma — ver nota abaixo. |
| Autenticação | JWT (Passport no NestJS) | Login com e-mail/senha; senhas com hash (bcrypt). **Ainda não implementado** — ver Fase 1. |
| Gráficos | Recharts | Gráficos dos dashboards no frontend. |
| Importação | ExcelJS | Leitura da planilha .xlsx no backend. |
| Hospedagem (sugestão) | Vercel (frontend) + Railway ou Render (API + Postgres) | Custo baixo nessa escala; a definir na fase de deploy. |

> **Nota sobre o ORM.** A especificação original previa Prisma. Ele foi trocado
> por Drizzle porque o Prisma baixa binários próprios de um servidor fora do npm:
> isso impediu criar o banco e rodar os testes, e é uma dependência que também
> falha em rede corporativa restrita e em parte dos serviços de hospedagem.
> O Drizzle é TypeScript puro instalado pelo npm.

## 3. Estrutura do repositório (monorepo)

```
Dashboard/
├── apps/
│   ├── web/        # Next.js (frontend)
│   └── api/        # NestJS (backend)
├── packages/
│   └── shared/     # Tipos TypeScript compartilhados (DTOs, enums)
├── AGENT.md, CLAUDE.md, context.md, changelog.md, ESPECIFICACOES.md, README.md
└── package.json    # Workspaces (pnpm ou npm workspaces)
```

## 4. Funcionalidades

### 4.1 Autenticação
- Login com e-mail e senha; sessão via JWT.
- Cadastro de usuários feito por um administrador (sem auto-registro público).
- Rotas do frontend e da API protegidas (usuário não autenticado é redirecionado ao login).

### 4.2 Importação de dados
- Upload de planilhas Excel/CSV com os resultados dos ensaios.
- Validação na importação: colunas esperadas, tipos numéricos, datas; relatório de erros por linha (linhas inválidas são apontadas, não importadas silenciosamente).
- Histórico de importações (quem importou, quando, quantas linhas).

### 4.3 Dashboards
- Página principal com visão geral dos ensaios (indicadores e gráficos).
- Filtros por período, obra/cliente, tipo de argamassa/traço.
- Gráficos de evolução das propriedades ao longo do tempo e comparação entre traços.
- Tabela detalhada dos ensaios com busca e exportação.

### 4.4 Dados de ensaio (definidos a partir da planilha real)

O domínio é **P&D de formulações**, não controle de qualidade de obra. Cada
registro é uma formulação desenvolvida pelo laboratório:

- **Identificação:** numeração, nomenclatura, tipo de projeto (NP/MT/AT/RC/PE),
  desenvolvedor, alimentador da planilha, avaliador, data, origem
  (Produção ou Laboratório).
- **Composição:** teor (% da massa seca) de cimentos, cales, fíleres, areias fina
  e média, aditivos retentores de água e incorporadores de ar, fibras e
  superplastificantes, além do teor e da massa de água.
- **Estado anidro:** distribuição granulométrica (8 peneiras), densidade
  aparente, relação água/ligante, teor de finos.
- **Estado fresco:** retenção de água (NBR 13277), densidade, squeeze-flow
  (deslocamento máximo e carga máxima, 3 curvas).
- **Estado endurecido:** resistência à tração na flexão (3 CPs) e à compressão
  (6 CPs) aos 3, 7, 14 e 28 dias; densidade e módulo de elasticidade dinâmico
  por ultrassom aos 14 e 28 dias.

As fórmulas aplicadas e as divergências em relação à planilha estão em
[`docs/CALCULOS.md`](docs/CALCULOS.md).

## 5. Fases de implementação

A ordem foi alterada a pedido do usuário: os dashboards vieram antes da
autenticação.

1. **Fase 1 — Fundação:** monorepo, apps Next.js e NestJS, banco Postgres +
   Drizzle. ✅ **Concluída.** A autenticação foi adiada e é o próximo passo.
2. **Fase 2 — Dados:** modelo de dados dos ensaios, importação de `.xlsx` com
   validação, cálculos do laboratório. ✅ **Concluída.**
3. **Fase 3 — Dashboards:** visão geral com gráficos, filtros, tabela e página de
   detalhe. ✅ **Concluída.**
4. **Fase 4 — Autenticação:** login, sessão, proteção de rotas, cadastro de
   usuários por administrador. ⬜ Pendente.
5. **Fase 5 — Deploy:** hospedagem na nuvem, variáveis de ambiente, backups do
   banco. ⬜ Pendente.

## 6. Padrões e qualidade

- TypeScript estrito (`strict: true`) em todo o projeto.
- Testes: unitários no backend (Jest, padrão do NestJS) e testes dos fluxos críticos (auth, importação).
- Lint/format: ESLint + Prettier.
- Fluxo de trabalho do agente conforme `AGENT.md` (testar → corrigir → revisar → documentar → pedir permissão para commit/push).
