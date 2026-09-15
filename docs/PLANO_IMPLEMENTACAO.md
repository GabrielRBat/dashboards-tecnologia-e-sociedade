# Plano de implementação

Este arquivo registra as próximas features planejadas e o caminho técnico
preferido para implementá-las sem quebrar os fluxos já existentes.

## Próxima feature: histórico de importação

### Objetivo

Registrar cada importação de planilha com rastreabilidade mínima:

- quem importou;
- quando importou;
- nome do arquivo;
- linhas lidas;
- linhas importadas;
- linhas ignoradas;
- quantidade de avisos/erros;
- quais formulações foram criadas ou atualizadas por aquela importação.

Na interface, a lista de **Formulações** deve ganhar uma coluna nova, sugerida
como **Data de importação**, para mostrar quando cada formulação entrou ou foi
atualizada pela última importação de planilha.

### Modelo de dados sugerido

Criar uma tabela `importacoes`:

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | `uuid` | Chave primária |
| `arquivo_nome` | `text` | Nome original do arquivo enviado |
| `usuario_id` | `uuid` | Quem importou; referencia `usuarios` |
| `linhas_lidas` | `integer` | Total lido pelo importador |
| `linhas_importadas` | `integer` | Total gravado/atualizado |
| `linhas_ignoradas` | `integer` | Linhas vazias/template |
| `avisos` | `jsonb` | Lista de avisos retornada pelo importador |
| `criado_em` | `timestamp with time zone` | Data/hora da importação |

Criar também uma relação entre importação e formulação, por exemplo
`importacoes_formulacoes`:

| Coluna | Tipo | Observação |
|---|---|---|
| `importacao_id` | `uuid` | Referencia `importacoes` |
| `formulacao_id` | `uuid` | Referencia `formulacoes` |
| `numeracao` | `integer` | Número importado, útil para auditoria |
| `acao` | `text` | `CRIADA` ou `ATUALIZADA` |

Essa tabela evita depender só de `formulacoes.atualizado_em`, porque uma
formulação pode ser editada futuramente por outra tela. O histórico de importação
continua verdadeiro mesmo quando houver edição manual.

### API

1. Ajustar `ImportacaoService.importar()` para receber o usuário autenticado.
2. Ao final de uma importação bem-sucedida, gravar uma linha em `importacoes`.
3. Para cada formulação criada/atualizada, gravar uma linha em
   `importacoes_formulacoes`.
4. Expor endpoint de listagem, sugerido:
   - `GET /api/importacao/historico`
   - filtros opcionais por período, usuário e nome de arquivo.
5. Incluir no retorno de formulações um campo derivado:
   - `ultimaImportacaoEm`
   - opcionalmente `ultimaImportacaoArquivo`.

### Frontend

1. Em `/formulacoes`, adicionar coluna **Data de importação**.
2. Na página de detalhe da formulação, mostrar um pequeno bloco de auditoria:
   - última importação;
   - arquivo;
   - usuário que importou.
3. Criar uma página ou seção administrativa para histórico completo:
   - rota sugerida: `/importar/historico`;
   - tabela com arquivo, usuário, data, linhas lidas/importadas/ignoradas e
     avisos.

### Migração e compatibilidade

Para dados já existentes, há duas opções:

1. deixar `ultimaImportacaoEm` vazio para registros antigos;
2. criar uma importação inicial sintética com a data do seed/importação atual.

A opção 1 é mais honesta. A opção 2 só deve ser usada se o usuário aceitar que é
um marcador operacional, não o histórico real.

### Testes

Cobrir no backend:

- importação grava linha em `importacoes`;
- formulações criadas/atualizadas ficam vinculadas à importação;
- endpoint de histórico respeita autenticação;
- coluna derivada `ultimaImportacaoEm` aparece na listagem de formulações;
- reimportar a mesma planilha cria novo evento de importação, não sobrescreve o
  anterior.

No frontend, validar manualmente:

- importar planilha logado;
- ver data de importação em `/formulacoes`;
- abrir detalhe de uma formulação importada;
- conferir histórico completo.

### Fora do escopo desta feature

- Comparar diferenças célula a célula entre duas importações.
- Desfazer importação.
- Agendar importações automáticas.
- Teor de ar incorporado: depende da versão nova da planilha com a coluna real.
