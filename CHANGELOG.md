# Changelog

Histórico de mudanças importantes do projeto. Padrão [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [2.1.0] — 2026-05-29

Refinamento UX e nova lógica de filtragem com tag `manual`.

### Adicionado
- Tag `manual` nos itens: itens com essa tag não aparecem automaticamente na Lista — só via cardápio ou busca
- Versão do app visível no rodapé da Home (`Mercado app · v2.1.0`)
- Filtro de busca no Cardápio (filtra pratos por nome)
- Botão "⊟ retrair tudo" no Cardápio por categoria
- Botão "⊟ retrair tudo" na Lista (acima dos grupos por local)
- Botão de copiar no header do Mercado (ícone 📋)
- Toast "✓ Copiado pro clipboard!" ao copiar lista

### Mudado
- Cardápio agora só popula a Lista com ingredientes que têm tag `semanal` (antes filtrava por setor)
- Lista divide visualmente em 3 grupos: na lista (agrupado por local), Fora da lista (vermelho, só items do tipo desmarcados), Catálogo (cinza, só com busca)
- Lembrados: add/remove agora é background (sem spinner) — mais rápido
- "Próximo mercado" não sai mais da tela — continua no Mercado e atualiza
- Loading só em ações críticas ("Salvar lista") — Finalizar e Apagar viraram background
- Campo de busca limpa ao trocar de tela (não mantém filtro stale)
- Layout do "Catálogo" padronizado entre Lembrados e Mercado
- Botão "→ próximo mercado" virou "próximo mercado" (sem seta)

### Removido
- Botão de copiar do footer do Mercado (movido pro header)

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
