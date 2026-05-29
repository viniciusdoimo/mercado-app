# Regras de negócio

Documento de referência com **o que o app faz e o que não faz**. Usado pra validar refatorações e novas features — toda mudança precisa preservar as regras abaixo (ou explicitamente atualizar este documento).

---

## 1. Perfil / Identidade

- Modal "Como vamos te chamar?" aparece na **primeira abertura** (ou se localStorage limpou)
- Campo de texto livre, max 20 caracteres
- Salvo em `localStorage`
- Pode ser trocado a qualquer momento pelo botão `👤` nos headers
- Cada pessoa usa nome próprio (Vini, Ce, Cecília, etc.)

## 2. Lembrados (lista compartilhada)

- **Lista única** compartilhada entre todos os dispositivos via planilha
- **Eterna** — só some por ação explícita
- Item tem: nome, qty, autor, timestamp
- Busca filtra os itens existentes **e** mostra catálogo (cinza claro) pra adicionar
- Clicar em item do catálogo (cinza) **adiciona aos Lembrados** com qty=1
- Item nos Lembrados tem `+`/`−` pra ajustar qty e `✕` pra remover (com confirmação)
- Botão `✕ limpar todos` (com confirmação)
- Botão `+ adicionar` (no header) só aparece se texto digitado **não existe** em Lembrados nem catálogo

## 3. Tipos de compra

| Tipo | Fluxo | Filtro inicial |
|---|---|---|
| **Semanal** | Cardápio → Lista | Itens com tag `semanal` (tudo marcado) |
| **Mensal** | Cardápio → Lista | Itens com tag `mensal` (tudo marcado) |
| **Livre** | Modal (nome + opt-in Lembrados) → Lista | Lista vazia |

- Limite de **5 listas ativas** simultâneas (Apps Script rejeita 6ª)
- Lista Livre permite título customizado (auto: `Livre — data` se vazio)
- Itens com tag `manual` **NÃO** aparecem automaticamente em Semanal/Mensal — só se cardápio chamar ou pesquisa

## 4. Cardápio

- Primeira tela em Semanal/Mensal (Livre não tem)
- Toggle **Por semana** / **Por categoria**
- Botão **"+ marcar tudo"** em cada semana
- Botão **"pular →"** vai direto pra Lista sem escolher pratos
- Botão **"🔄"** atualiza dados da planilha (com confirmação)
- Botão **"Próximo →"** habilita só com 1+ prato escolhido

## 5. Lista

- **Título** dinâmico: tipo da compra ou nome customizado
- **Subtítulo** varia:
  - Semanal/Mensal: `toque pra retirar`
  - Livre: `use a busca pra adicionar`
- **Estado inicial** Semanal/Mensal: items do tipo correspondente **marcados** (exceto tag `manual`)
- **Estado inicial** Livre: **vazia** (catálogo aparece só com busca)
- Itens **agrupados por Local em Casa** (com botão "⊟ retrair tudo" quando há vários grupos)
- Itens do cardápio: **fundo bege + badge laranja** com nome do prato
- Itens dos Lembrados: **badge verde** com nome do autor (`📥 Ce`)
- Itens custom (adicionados pelo usuário): badge `novo`
- Quantidade ajustável com `+`/`−`
- Click no item alterna "Na lista" ↔ "Fora da lista"
- **3 grupos visuais** na ordem:
  1. **Na lista** (branco) — items marcados, agrupado por local
  2. **Fora da lista** (vermelho) — items que pertencem ao tipo atual mas estão desmarcados, ou items que vieram do cardápio/Lembrados e foram desmarcados
  3. **Catálogo** (cinza tracejado) — outros items da fonte, só visível com busca
- Itens "Fora" e "Catálogo" mantêm badges (cardápio, autor Inbox) quando aplicável
- Busca **expande automaticamente** e busca tanto em "Na lista" quanto traz items do Catálogo
- Campo de busca **limpa ao trocar de tela**
- Botão `📋 +` (header): adiciona item à Inbox (Lembrados)
- Footer: `← home`, `💾 salvar`, `Mercado →`

## 6. Mercado

- **Header**: "No Mercado" + data + qtd itens
- Botões header: `← home`, `📋 copiar`, `⊟ retrair setores`
- Botão `📋` copia lista formatada pro clipboard com **toast verde** "✓ Copiado pro clipboard!"
- Items agrupados por **Setor no Mercado**
- 3 estados visuais:
  - **Pendente** (branco): a comprar
  - **No carrinho** (verde): comprado (`✓`)
  - **Não encontrado** (vermelho riscado): não achei (`✕`)
- **Cortes alternativos** (Carne moída → Patinho/Acém/Paleta) aparecem como **radio buttons**
- Pode **adicionar item durante a compra** (busca + adicionar)
- Pode **adicionar do catálogo** (busca mostra items que não estão na lista)

### Botões do Footer

| Botão | Ação |
|---|---|
| `← lista` | Volta pra Lista |
| `próximo mercado` | Save + continua no Mercado, itens "feito" somem, "não encontrado" volta pra pendente |
| `✓ Finalizar` | Grava Histórico + devolve pendentes/não-encontrados pra Lembrados + reset |

**Próximo mercado NÃO sai da tela** — só atualiza a lista in-place (sem spinner, background).

## 7. Finalização da compra

Ao clicar `✓ Finalizar`:

- Item **feito** → removido da Inbox (já comprou)
- Item **pendente** ou **não encontrado** → **volta pra Lembrados** (com flag `veio_de_lista`)
- Compra registrada no **Histórico** com qtds
- Lista some de Listas ativas
- Volta pra Home

## 8. Histórico

- Mantém apenas as **3 últimas** compras finalizadas
- Apps Script apaga as mais antigas automaticamente
- Mostra: tipo, nome, data, qtd comprados
- Home rodapé: "Última compra: há X dias"

## 9. Salvamento

- **localStorage** salva automaticamente a cada `salvarEstado()` (sem confirmação)
- **Backend (Apps Script)** só salva em ações específicas:
  - `+/-` qty na Inbox (debounced 800ms)
  - Add/remove item da Inbox (background, sem loading)
  - Save lista (com loading "Salvando lista…")
  - Delete lista (background, otimista — UI atualiza antes da API)
  - Finalizar lista (background — UI vai pra Home antes da API responder)
- **Confirmação ao voltar pra Home com mudanças**: pergunta `salvar` ou `descartar`
- **Loading overlay** SÓ em ações onde precisa esperar resposta antes de mudar de tela ("Salvar lista" no footer da Lista)
- Demais ações são **otimistas em background**: UI atualiza instantâneo, API roda em paralelo (last-write-wins se conflito)

## 10. Tags

| Tag | Comportamento |
|---|---|
| `mensal` | Aparece automático na Compra Mensal |
| `semanal` | Aparece automático na Compra Semanal |
| `mensal,semanal` | Aparece nos dois |
| `manual` | **NÃO** aparece automático — só via cardápio ou busca |

### Cardápio + tags

Quando um prato do cardápio é escolhido, o app cruza os ingredientes da receita:

- **Ingredientes com tag `semanal`** entram automaticamente na Lista (com badge laranja do prato)
- **Ingredientes só com tag `mensal`** NÃO entram automaticamente (assume que você tem em casa pela compra mensal)
- **Ingredientes na lista `TEMPEROS_UNIVERSAIS`** (sal, óleo, azeite, alho, vinagre) são ignorados sempre

Essa regra vale tanto pra Compra Semanal quanto Mensal — a lógica é uniforme.

## 11. Cortes alternativos

- Coluna `Cortes` na aba Itens (csv separado por vírgula)
- Ordem dos cortes = ordem de preferência (1º melhor custo-benefício, 2º premium, 3º econômico)
- Aparecem como **radio buttons no Mercado** apenas
- Item escolhido fica salvo no estado e aparece entre parênteses na lista de WhatsApp

## 12. UI / Modais

- **Confirmações** usam modal customizado com botões nomeados (não `OK/Cancelar`)
- **Loading** usa overlay com spinner + mensagem
- **Inputs** usam modal customizado quando precisa de nome + checkbox
- **Avisos finais** (compra finalizada, etc.) usam modal de 1 botão
- Sem uso de `alert()`, `confirm()` ou `prompt()` nativos pra interações importantes (só pra debug ou casos triviais)

## 13. Apps Script (backend)

- 3 abas geridas automaticamente: `Inbox`, `Listas`, `Histórico`
- Endpoints: ping, loadAll, loadInbox, loadListas, loadHistorico, addInboxItem, addInboxItems, updateInboxItem, removeInboxItems, saveLista, deleteLista, finalizarLista
- Token simples no body como auth (não é segurança forte)
- Setup() cria as 3 abas se não existem (idempotente)

## 14. Cache local

- `mercado_dados_v1`: cache dos 4 CSVs com TTL de **7 dias**
- `mercado_estado_v1`: STATE completo, sempre atualizado
- Botão `🔄` força refetch antes do TTL

## 15. Que o app NÃO faz (decisões intencionais)

- **Não tem autenticação real** — token compartilhado, qualquer um com URL acessa
- **Não tem versionamento de listas** — last-write-wins, sem merge
- **Não tem notificações** — usuário precisa abrir o app pra ver atualizações
- **Não tem fila offline** — se rede cair, mudanças vão pro localStorage mas não sincronizam até voltar
- **Não tem indicador de idade** dos itens da Inbox (planejado, não implementado)
- **Não tem PWA real** (sem manifest, sem service worker) — só funciona como atalho da tela inicial
- **Não tem dark mode** explícito
- **Não tem multi-família** — 1 planilha, 1 token, 1 grupo de usuários
- **Não tem importação/exportação** estruturada além do "copiar pro WhatsApp"

---

## Como usar este documento

Quando implementar uma feature nova ou refatorar:

1. Verificar que nenhuma regra acima é violada
2. Se uma regra precisa mudar, **atualizar este documento na mesma PR**
3. Em refactor, comparar comportamento antes/depois contra essa lista

Toda mudança não-trivial deve passar por esse checklist mental.
