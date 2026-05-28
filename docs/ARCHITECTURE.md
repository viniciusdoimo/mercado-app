# Arquitetura

Explicação técnica do sistema, decisões tomadas e por quê.

---

## Visão geral

```
┌─────────────────┐    GET CSV (read-only, cached 7d)
│  Google Sheets  │ ←─────────────────────────────────┐
│   (planilha)    │                                   │
│                 │    POST JSON (write via Apps Script)
│  • Itens        │ ←────────────────────┐            │
│  • Pratos       │                      │            │
│  • Receitas     │                      │            │
│  • Cardápio     │                      │            │
│  • Inbox        │                      │            │
│  • Listas       │                      │            │
│  • Histórico    │                      │            │
└─────────────────┘                      │            │
        ▲                                │            │
        │                                │            │
   ┌────┴────┐                           │            │
   │  Apps   │                           │            │
   │ Script  │ ←─ POST /exec ────────────┤            │
   │ Web App │ ←─ GET /exec?action=... ──┼──┐         │
   └─────────┘                           │  │         │
                                         │  │         │
                                ┌────────┴──┴─────────┴──┐
                                │                        │
                                │     index.html         │
                                │    (no navegador)      │
                                │                        │
                                │  ┌──────────────────┐  │
                                │  │  STATE (memória) │  │
                                │  │  + localStorage  │  │
                                │  └──────────────────┘  │
                                │                        │
                                │  ┌──────────────────┐  │
                                │  │  UI (6 telas)    │  │
                                │  │  Home / Lembr.   │  │
                                │  │  Cardápio / List │  │
                                │  │  Mercado         │  │
                                │  └──────────────────┘  │
                                └────────────────────────┘
                                        ▲
                                        │
                                ┌───────┴────────┐
                                │  GitHub Pages  │
                                │   (hospeda     │
                                │   index.html)  │
                                └────────────────┘
```

## Componentes

### 1. Google Sheets como banco de dados

A planilha tem 7 abas. As 4 primeiras (`Itens`, `Pratos`, `Receitas`, `Cardápio`) são **catálogo estático** — o usuário edita pela interface do Google Sheets. As 3 últimas (`Inbox`, `Listas`, `Histórico`) são **estado dinâmico** gerenciado pelo Apps Script.

**Por que Google Sheets?**
- Custo: zero
- Backup: automático pelo Google
- Edição: interface familiar
- Acesso multi-dispositivo: nativo
- Sincronização: nativa

Não precisei de banco relacional porque o domínio é simples e o volume é baixo (centenas de itens, dezenas de pratos, ~5 listas ativas).

### 2. Apps Script como backend

Web App publicado que aceita GET e POST. Token simples no corpo da request (não é segurança forte — é proteção contra acesso casual).

**Endpoints**:

- `GET ?action=ping` — healthcheck
- `GET ?action=loadAll` — Inbox + Listas + Histórico de uma vez
- `GET ?action=loadInbox` — só Inbox
- `POST {action: "addInboxItem", item}` — adicionar item
- `POST {action: "saveLista", lista}` — upsert de lista (cria id se faltar)
- `POST {action: "finalizarLista", id, dados}` — encerra: grava Histórico, devolve pendentes pra Inbox, remove lista

**Por que Apps Script?**
- Acesso direto à planilha (mesmo escopo de autenticação)
- Sem servidor próprio
- Custo: zero
- Quota generosa pra uso pessoal/familiar

### 3. index.html como SPA

Um arquivo, ~2500 linhas de JavaScript vanilla, ES5 puro.

**Estado em memória** (`STATE`):
- Perfil do usuário (Vini, Ce, etc.)
- Inbox (cache da aba)
- Lista ativa (sessão atual de compra)
- Listas salvas (cache)
- Histórico (cache)
- Dados do catálogo (cache dos CSVs)

**Persistência local** (`localStorage`):
- `mercado_dados_v1` — cache dos 4 CSVs, TTL de 7 dias
- `mercado_estado_v1` — STATE completo, persistido em todo `salvarEstado()`

**Telas**:
- `tela-home` — Home (entrada)
- `tela-inbox` — Lembrados
- `tela-cardapio` — Escolher pratos (Semanal/Mensal)
- `tela-lista` — Lista da sessão atual
- `tela-mercado` — Modo de compra

Troca por `display:none` controlado por `showTela(nome)`.

**Por que vanilla JS?**
- Sem build, sem npm install, sem package.json
- 1 arquivo HTML pra deploy
- Performance no celular (sem framework overhead)
- Pra portfólio: mostra que dá pra fazer produto sem framework moderno

### 4. GitHub Pages

Hospedagem estática gratuita. URL fixa, HTTPS automático.

**Por que GitHub Pages?**
- Custo: zero
- HTTPS necessário (Google Sheets bloqueia CORS de origens não-https)
- Deploy por commit
- Compatível com adicionar à tela inicial no celular

---

## Decisões técnicas

### 1. JSON estado serializado vs colunas estruturadas

Cada linha de `Listas` tem uma coluna `estado_json` que serializa o estado inteiro da sessão. Em vez de criar colunas estruturadas (cardápio escolhido, itens marcados, etc.), guarda tudo num blob.

**Trade-off**:
- ✓ Schema flexível — adicionar campos no estado não exige migration
- ✓ Simples de implementar
- ✗ Não dá pra fazer queries SQL-like na planilha
- ✗ Estado muito grande pode estourar limites do Sheets (mas ainda longe)

Pra esse uso, o trade-off vale.

### 2. Last-write-wins (sem lock distribuído)

Múltiplos dispositivos podem editar simultaneamente. O último a salvar ganha. Não tem lock, não tem versionamento.

**Por que aceitei isso**:
- Caso real de uso: 2 pessoas, raramente editam exatamente o mesmo item ao mesmo tempo
- Lock distribuído via Sheets seria complexo (~50 linhas de código + UX de "aguarde, outro dispositivo está usando")
- Pior caso: comprar 2x o mesmo item — recuperável

### 3. Cache local de 7 dias

CSVs ficam em `localStorage` por 7 dias. Atualização explícita via botão 🔄.

**Por que 7 dias**:
- Catálogo (Itens, Pratos, Receitas, Cardápio) muda raramente
- Funciona offline depois da primeira carga
- Não atrasa a abertura do app

### 4. Cortes de carne como radio buttons no Mercado

Pra carnes (Carne moída, Carne de panela, etc.), no Mercado aparecem os cortes alternativos (Patinho/Acém/Paleta) como radio buttons.

**Por quê**:
- A decisão real ("qual corte vou pegar?") acontece em frente ao açougueiro, baseada em preço/promoção
- Não vale tentar decidir antes
- A planilha sabe quais cortes são equivalentes (coluna `Cortes`)

Esse é um caso de modelagem de domínio que reflete realidade — não tentar codificar tudo previamente, deixar a decisão na hora certa.

### 5. Lista Livre vs Semanal/Mensal

3 tipos com comportamentos diferentes:

- **Semanal/Mensal**: passa pelo Cardápio primeiro (você escolhe pratos) → Lista vem pré-marcada com tags correspondentes
- **Livre**: pede nome opcional + checkbox "incluir Lembrados" → Lista vem vazia, você adiciona manualmente

**Por quê**: cenários reais diferentes (compra rotineira vs compra avulsa pra evento específico) merecem fluxos diferentes.

### 6. Pendentes/Não-encontrados voltam pra Lembrados ao Finalizar

Quando finaliza uma compra:
- Itens "feito" são removidos da Inbox (já comprados)
- Itens "pendentes" e "não encontrados" voltam pra Inbox

**Por quê**: o que não foi comprado ainda precisa ser comprado — fica esperando a próxima oportunidade.

### 7. "→ próximo mercado" mantém lista aberta

Ao clicar no Mercado, salva o estado e volta pra Lista — sem finalizar. Lista fica salva como "em andamento" pra continuar depois em outro mercado.

**Por quê**: caso real de uso — vai num mercado A, marca o que comprou, vai num mercado B continuar.

---

## Limitações conhecidas

- **CORS**: `file://` não funciona. Precisa `http://` ou `https://`. Por isso GitHub Pages e não Drive Hosting.
- **Quota do Apps Script**: ~20.000 execuções/dia. Pra uso pessoal/familiar, sobra muito.
- **Sincronização eventual**: mudanças no Sheets demoram alguns segundos pra refletir nos CSVs publicados.
- **Sem auth real**: token no código é proteção fraca. Repo público expõe o token. Pra segurança real, precisaria OAuth ou backend separado.
- **Sem PWA ainda**: dá pra adicionar manifest e service worker pra ficar instalável de fato como app nativo.

---

## Extensões futuras

Coisas que dá pra adicionar sem refator grande:

- **Notificações**: Apps Script pode mandar email quando alguém adiciona à Inbox
- **Histórico maior**: aumentar limite de 3 pra 12 últimos e adicionar gráfico
- **Estimativa de gasto**: coluna de preço médio em Itens, soma na compra
- **Multi-família**: vários tokens no Apps Script, cada um com sua planilha
- **PWA real**: manifest.json + service worker pra cache total
- **Modo escuro**: já tem variáveis CSS, falta só toggle

---

## Por que esse projeto não usa coisas modernas

- **Sem React/Vue/Svelte**: 1 desenvolvedor, app simples, framework é overhead
- **Sem TypeScript**: 1 arquivo, vanilla JS é suficiente
- **Sem build (webpack/vite)**: nada pra "buildar" — é HTML servido direto
- **Sem testes automatizados**: tamanho não justifica; teste real é o casal usando
- **Sem CI/CD**: deploy é commit no GitHub Pages
- **Sem Docker**: nenhum servidor pra conteinerizar
- **Sem TailwindCSS**: CSS no arquivo é mais simples
- **Sem state library**: `STATE` global + `localStorage` cobre tudo

Cada uma dessas escolhas tem trade-off. Pra esse projeto e pra esse momento, simplicidade ganhou de "stack moderna".
