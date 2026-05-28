# Changelog

Histórico de mudanças importantes do projeto. Padrão [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [2.0.0] — 2026-05-28

Refactor grande pra modelo de Lembrados + listas salvas + perfil flexível.

### Adicionado
- Tela Home como entrada do app
- Lembrados (lista compartilhada eterna) acessível a qualquer momento
- Sistema de listas salvas (max 5 em paralelo)
- 3 tipos de compra: Semanal, Mensal, Livre
- Cardápio como primeira tela das compras Semanal/Mensal
- Histórico recente (3 últimos) no rodapé da Home
- Modal customizado de confirmação (botões com nomes ao invés de OK/Cancelar)
- Loading overlay em operações lentas
- Perfil em campo de texto livre (não mais hardcoded)
- Coluna `tags` no catálogo (`mensal`, `semanal`, ou ambos)
- Documentação completa: README, DEPLOY, DATA-MODEL, ARCHITECTURE

### Mudado
- "Outro mercado" mantém lista salva pra continuar depois
- "Finalizar" devolve pendentes/não-encontrados pra Lembrados automaticamente
- Mercado sem badges do cardápio (decisão de UX)
- "Fora da lista" vira "Catálogo" na Lista Livre
- Subtítulos das telas se adaptam ao contexto

### Removido
- Tela Sugestões mensais (substituída pelo fluxo direto Cardápio → Lista)

### Backend (Apps Script)
- Nova aba `Listas` (substitui `Sessões` antiga)
- Novos endpoints: `getListas`, `saveLista`, `deleteLista`, `finalizarLista`, `addInboxItems`
- Histórico mantém só 3 últimos automaticamente

## [1.0.0] — 2026-05-22

Primeira versão funcional.

### Adicionado
- Cardápio com pratos da semana
- Cruzamento ingredientes × catálogo
- Cortes alternativos de carne no Mercado
- Cache local via localStorage (7 dias)
- Inbox compartilhada via Apps Script
- Modal "Quem é você?" com botões Vini/Ce
- Deploy via GitHub Pages
