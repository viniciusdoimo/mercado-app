# Modelo de dados

A planilha **Mercado** tem 7 abas no total:

- 4 abas de **dados estáticos** (catálogo) — você edita manualmente
- 3 abas de **estado dinâmico** — gerenciadas pelo Apps Script, não mexa direto

---

## Abas de dados estáticos

Lidas pelo app via URLs CSV públicas (read-only). Você edita pela interface do Google Sheets.

### `Itens` — catálogo de produtos

Catálogo completo do que pode entrar numa lista de compras.

| Coluna | Tipo | Descrição |
|---|---|---|
| `Nome do Item` | texto | Identifica o produto |
| `Local em Casa` | texto | Onde fica guardado em casa (ex: "Geladeira", "Despenseiro") |
| `Setor no Mercado` | texto | Em qual setor do mercado fica (ex: "Hortifruti", "Açougue") |
| `Cortes` | texto (csv) | Pra carnes: cortes alternativos separados por vírgula |
| `tags` | texto (csv) | `mensal`, `semanal`, ou `mensal,semanal` |

**Exemplos:**

```
| Tomate          | Geladeira  | Hortifruti  |                              | mensal,semanal  |
| Bicarbonato     | Disp 1     | Utilidades  |                              | mensal          |
| Carne moída     | Açougue    | Açougue     | Patinho, Acém, Paleta        | mensal,semanal  |
```

**Tags:**

- `semanal` — item perecível, comprado toda semana. Aparece em **Compra Semanal**
- `mensal` — item de estoque ou reposição. Aparece em **Compra Mensal**
- `mensal,semanal` — ambas (verduras, carnes, etc — você pode comprar tanto na compra grande do mês quanto na semanal)

### `Pratos` — catálogo de pratos

Lista de pratos com categoria e dificuldade.

| Coluna | Tipo | Descrição |
|---|---|---|
| `Prato` | texto | Nome do prato |
| `Categoria` | texto | Proteína / Salada / Acompanhamento / Refogado jantar / Fim de semana |
| `Dificuldade (1-4)` | número | 1 = fácil, 4 = trabalhoso |

### `Receitas` — ingredientes por prato

Mapeia cada prato pros ingredientes que ele usa.

| Coluna | Tipo | Descrição |
|---|---|---|
| `Prato` | texto | Mesmo nome da aba `Pratos` |
| `Ingrediente` | texto | Mesmo nome da aba `Itens` |
| `Qtd` | número | Quantidade pra 1 receita |
| `Unidade` | texto | "kg", "un", "g", etc. |
| `Observação` | texto | Notas livres ("moído fino pra abrir") |

**Importante:** o nome do ingrediente precisa bater **exatamente** com o nome em `Itens` pra o app cruzar corretamente.

### `Cardápio` — pratos por semana

Define o cardápio mensal — quais pratos cada semana do mês.

| Coluna | Tipo | Descrição |
|---|---|---|
| `Mês` | texto | "Mês 1", "Mês 2", "Mês 3" |
| `Semana` | texto | "Sem 1", "Sem 2", etc. |
| `Prato` | texto | Mesmo nome da aba `Pratos` |

O app agrupa os pratos por Mês × Semana na vista "Por semana" do Cardápio.

---

## Abas de estado dinâmico

Gerenciadas pelo Apps Script. Criadas automaticamente ao rodar `setup()` na primeira vez. Não edite direto.

### `Inbox` — Lembrados (lista compartilhada)

Itens que alguém adicionou ao longo do tempo, esperando uma compra.

| Coluna | Origem |
|---|---|
| `id` | UUID gerado pelo Apps Script |
| `timestamp` | Quando foi adicionado |
| `item` | Nome (pode ser livre ou bater com `Itens`) |
| `qty` | Quantidade |
| `corte` | Corte específico (se aplicável) |
| `adicionado_por` | Nome do perfil que adicionou |
| `tags` | Tags pra organização futura |
| `observacao` | Notas livres |
| `veio_de_lista` | Se o item voltou pra Inbox depois de uma compra finalizada |

### `Listas` — compras em andamento (max 5)

Sessões de compra salvas pelo usuário. Quando finaliza, vai pro `Histórico` e some daqui.

| Coluna | Descrição |
|---|---|
| `id` | UUID |
| `nome` | Nome dado pelo usuário ou auto-gerado |
| `tipo` | "semanal" / "mensal" / "livre" |
| `autor` | Quem criou |
| `estado_json` | Estado completo serializado: cardápio escolhido, lista de itens marcados, marcações de mercado |
| `criada_em` | Quando começou |
| `atualizada_em` | Última edição |

### `Histórico` — compras finalizadas (3 últimas)

Compras encerradas. O Apps Script mantém só as 3 últimas — apaga as mais antigas automaticamente.

| Coluna | Descrição |
|---|---|
| `timestamp_fim` | Quando finalizou |
| `autor` | Quem fez a compra |
| `tipo` | Tipo da compra |
| `nome` | Nome da lista |
| `duracao_min` | (Não usado ainda) |
| `qtd_comprados` | Itens marcados como "feito" |
| `qtd_devolvidos_inbox` | Itens pendentes que voltaram pra Lembrados |
| `qtd_nao_encontrados` | Itens marcados como "não encontrei" |
| `cardapio` | Pratos do cardápio dessa compra |
| `resumo_json` | Listas detalhadas serializadas |

---

## Fluxo de dados

```
┌──────────────────────────────────────────┐
│  Google Sheets (planilha "Mercado")      │
│                                          │
│  ─────────── STÁTICAS (CSV) ───────────  │
│  • Itens                                 │
│  • Pratos                                │
│  • Receitas                              │
│  • Cardápio                              │
│                                          │
│  ─────────── DINÂMICAS (Apps Script) ──  │
│  • Inbox (Lembrados)                     │
│  • Listas (em andamento)                 │
│  • Histórico                             │
└──────────────────────────────────────────┘
        │              ▲
        │ GET CSVs     │ GET/POST via Apps Script
        ▼              │
┌──────────────────────────────────────────┐
│         index.html (no navegador)        │
│                                          │
│  ─ Cache ──────────                      │
│  • localStorage: dados (7 dias TTL)      │
│  • localStorage: estado da sessão atual  │
│                                          │
│  ─ UI ──────────                         │
│  • Home / Lembrados / Cardápio           │
│  • Lista / Mercado                       │
└──────────────────────────────────────────┘
```

---

## Como o app cruza os dados

Exemplo: você inicia uma **Compra Semanal** e escolhe o prato "Bife à rolê" no cardápio.

1. App lê `Receitas` → encontra todos ingredientes do prato (Carne picadinha, Bacon, Cenoura, Cebola, etc.)
2. Pra cada ingrediente, cruza com `Itens` pra saber:
   - Local em Casa (organização visual da Lista)
   - Setor no Mercado (organização visual do Mercado)
   - Cortes alternativos (Carne picadinha → "Coxão mole, Alcatra, Coxão duro")
3. Adiciona à `STATE.lista` com badge laranja "🍽️ Bife à rolê"
4. Ao mesmo tempo, lê `Inbox` do Apps Script e mescla os itens da lista compartilhada (badge "📥 Ce")
5. Tudo isso fica no `STATE.lista` enquanto você edita
6. Ao **salvar**, o JSON completo do estado vai pra `Listas` (via Apps Script)
7. Ao **finalizar compra**:
   - Itens "feito" são deletados da `Inbox` (já comprados)
   - Itens "pendentes" e "não encontrados" voltam pra `Inbox` (próxima compra)
   - Resumo vai pro `Histórico`
   - Lista some de `Listas`

---

## Limites e regras

- Máximo **5 listas em andamento** simultâneas (`saveLista` rejeita 6ª)
- Histórico mantém **3 últimas** compras (mais antigas são apagadas)
- Cache local dura **7 dias** antes de re-fetchar (botão 🔄 força refresh)
- Modal de perfil aparece **1ª vez** apenas (depois fica em localStorage)
- Lembrados é **eterna** — só some por ação explícita (✕ individual ou limpar todos)

---

## Customizar pro seu uso

1. **Mudar pratos do cardápio**: edita `Pratos`, `Receitas` e `Cardápio` na planilha
2. **Adicionar itens novos**: cria linha em `Itens` (com tag apropriada) ou adiciona via app na hora
3. **Mudar setores**: livre — define como organizar visualmente os itens
4. **Mudar locais em casa**: livre — define como agrupar na vista da Lista
5. **Mudar cortes alternativos de carne**: edita coluna `Cortes` em `Itens`

Como a planilha é a fonte da verdade, qualquer alteração reflete no app na próxima atualização (botão 🔄 ou após 7 dias).
