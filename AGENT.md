# AGENT.md — Instruções para o Agente

Este arquivo define como o agente deve trabalhar neste projeto (Dashboard de Testes de Argamassas).

## Ao iniciar a sessão (obrigatório)

1. Ler o arquivo `context.md` — contém o contexto do projeto: objetivo, escopo, decisões de arquitetura e estado atual.
2. Ler o arquivo `changelog.md` — contém o histórico de mudanças feitas no projeto.

Nenhum trabalho deve começar antes dessas duas leituras.

## Procedimento obrigatório para qualquer alteração de código

Sempre que alterar algo no código, seguir este fluxo, nesta ordem:

1. **Alterar** o código.
2. **Testar** as alterações.
3. **Corrigir** os erros encontrados.
4. **Testar novamente** até que tudo passe.
5. **Revisar** o que foi feito (reler o diff, verificar consistência e efeitos colaterais).
6. **Atualizar toda a documentação** afetada — incluindo o `README.md`, o `context.md` (se o estado/decisões do projeto mudaram) e o `changelog.md` (registrar a mudança com data e descrição).
7. **Pedir permissão ao usuário** antes de fazer `git commit` e `git push`. Nunca commitar ou dar push sem autorização explícita.

## Regras gerais

- Não pular etapas do fluxo acima, mesmo para mudanças pequenas.
- Registrar no `changelog.md` toda mudança relevante, no formato: data, tipo (feature/fix/docs/refactor), descrição curta.
- Manter o `context.md` sempre fiel ao estado real do projeto.
- Em caso de dúvida sobre requisitos ou decisões de arquitetura, perguntar ao usuário antes de implementar.
