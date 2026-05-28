# Deploy do zero — passo a passo

Estimativa: **30 minutos** se for a primeira vez configurando GitHub Pages e Google Apps Script.

Pré-requisitos:

- Conta Google (Drive + Sheets + Apps Script)
- Conta GitHub (gratuita)
- Git instalado (opcional — dá pra fazer tudo pela web)

---

## 1. Subir a planilha no Google Drive

1. Acessa https://drive.google.com
2. Arrasta o arquivo **Mercado-template.xlsx** (deste repo) pra dentro do Drive
3. Aguarda o upload
4. **Clica com o botão direito** no arquivo → **Abrir com → Planilhas Google**
5. No Google Sheets aberto, vai em **Arquivo → Salvar como Planilhas Google**

Pronto. Agora você tem uma planilha "Mercado" no formato nativo do Google Sheets (não mais .xlsx).

Pode renomear pra algo que você prefira. Vou chamar de **Mercado** daqui pra frente.

## 2. Configurar o Apps Script (backend)

1. Na planilha **Mercado**, vai em **Extensões → Apps Script**
2. Vai abrir uma aba nova com o editor
3. Renomeia o projeto pra **Mercado Backend** (canto superior esquerdo)
4. Apaga o conteúdo padrão do `Código.gs`
5. Abre o arquivo **apps-script.gs** deste repo (qualquer editor de texto), seleciona tudo e copia
6. Cola no editor de Apps Script
7. **Salva** (`Ctrl+S` / `Cmd+S`)

### Rodar o setup

1. No editor, no dropdown de funções (perto do botão "Executar"), seleciona **setup**
2. Clica em **Executar** (▶)
3. Vai aparecer um diálogo pedindo autorização:
   - Clica **Rever permissões**
   - Escolhe sua conta Google
   - Aparece tela amarela "O Google não verificou este app" → **Avançado** → **Acessar Mercado Backend (não seguro)** — é seu próprio script, OK
   - **Permitir**
4. No "Registro de execução" embaixo, deve aparecer "Execução concluída"
5. Volta na aba da planilha — deve ter 3 abas novas: **Inbox**, **Listas**, **Histórico**

### Publicar como Web App

1. Ainda no editor de Apps Script, canto superior direito: **Implantar → Nova implantação**
2. No ícone de engrenagem ao lado de "Selecione o tipo": escolhe **App da Web**
3. Preenche:
   - **Descrição**: `Mercado v1`
   - **Executar como**: **Eu** (seu email)
   - **Quem tem acesso**: **Qualquer pessoa** (importante)
4. **Implantar**
5. Vai pedir autorização de novo — autoriza
6. No final, copia a **URL do app da web** (termina em `/exec`)
7. **Guarda essa URL — você vai colocar no HTML**

### Trocar o token

No arquivo `apps-script.gs`, perto do topo:

```js
const TOKEN = "mlist-x9k2-2026";
```

Troca por uma string aleatória sua. Esse token vai precisar bater com o que você colocar no HTML mais pra frente. Não é segurança forte — só evita uso casual da URL pública.

Depois de mudar o token: **Ctrl+S** no editor, e **Implantar → Gerenciar implantações → editar → Nova versão → Implantar**.

## 3. Publicar as 4 abas como CSV

O app lê os dados do catálogo via URLs CSV públicas. Você precisa publicar 4 abas separadamente.

1. Na planilha Mercado, **Arquivo → Compartilhar → Publicar na web**
2. Em "Conteúdo publicado e configurações" (parte de baixo), garante que não tem nada antigo publicado
3. Pra cada uma das 4 abas (`Itens`, `Pratos`, `Receitas`, `Cardápio`):
   - No dropdown esquerdo, seleciona o nome da aba
   - No dropdown direito, escolhe **Valores separados por vírgula (.csv)**
   - **✓** marca "Republicar automaticamente quando houver alterações"
   - Clica **Publicar**
   - **Copia a URL gerada** (anota qual é qual)

Você vai ter 4 URLs no formato:

```
https://docs.google.com/spreadsheets/d/e/PACX-XXXX/pub?gid=YYYY&single=true&output=csv
```

Onde `gid=YYYY` muda pra cada aba.

## 4. Atualizar URLs no HTML

Abre o arquivo `index.html` em um editor de texto. Perto do topo do script, procura:

```js
var CSV_URLS = {
  itens: "...",
  pratos: "...",
  receitas: "...",
  cardapio: "..."
};

var APPS_SCRIPT_URL = "...";
var APPS_SCRIPT_TOKEN = "...";
```

Substitui:

- Cada URL CSV pelas 4 URLs que você copiou no passo 3
- `APPS_SCRIPT_URL` pela URL do Web App copiada no passo 2
- `APPS_SCRIPT_TOKEN` pelo token que você definiu no `apps-script.gs`

Salva o arquivo.

## 5. Subir no GitHub Pages

### 5a. Criar repositório

1. Vai em https://github.com/new
2. **Repository name**: `mercado-app` (ou outro de sua preferência)
3. **Public** (necessário pro GitHub Pages gratuito)
4. ✓ Marca "Add a README"
5. **Create repository**

### 5b. Subir o `index.html`

Pela interface web (mais simples se você não usa Git):

1. No repo criado, clica em **Add file → Upload files**
2. Arrasta o `index.html` (deste pacote)
3. Em "Commit changes", coloca uma mensagem (ex: "primeiro deploy")
4. **Commit changes**

### 5c. Ativar GitHub Pages

1. No repo, clica em **Settings** (menu superior)
2. Menu lateral: **Pages**
3. Em "Source": **Deploy from a branch**
4. Branch: **main**, pasta: **/ (root)** → **Save**
5. Espera 1-2 minutos
6. No topo da página vai aparecer "Your site is live at https://SEU-USUARIO.github.io/mercado-app/"

## 6. Testar

Abre a URL do GitHub Pages no navegador. Vai aparecer o modal "Como vamos te chamar?" — digita seu nome, **Continuar**.

A Home deve carregar com Lembrados vazia, botões de Nova compra e Histórico vazio.

Testes rápidos:

- **Nova lista semanal**: Cardápio → Pular → Lista → ✓ deve aparecer com itens marcados
- **Adicionar nos Lembrados**: vai pra Lembrados (botão na Home) → busca "Pão" → toque pra adicionar
- **Voltar pra Home**: deve ver 1 item nos Lembrados

Se algo der erro de fetch:

- Abre o console do navegador (F12 → Console)
- Olha as mensagens em vermelho
- 99% das vezes é URL CSV errada ou token diferente entre HTML e Apps Script

## 7. Salvar no celular como atalho

Pra usar como app:

**iPhone (Safari):**
1. Abre a URL do GitHub Pages no Safari
2. Toca no botão "Compartilhar" (quadrado com seta pra cima)
3. **Adicionar à Tela de Início**

**Android (Chrome):**
1. Abre a URL no Chrome
2. Menu (⋮) → **Adicionar à tela inicial**

Vira um ícone, abre em tela cheia sem barra de navegador.

## 8. Convidar a outra pessoa

Compartilha a URL do GitHub Pages. Cada um abre, digita o próprio nome no modal de perfil. As Lembrados e Listas Salvas são compartilhadas automaticamente porque o Apps Script está atrelado à mesma planilha.

## Próximos passos sugeridos

- Personaliza os pratos do cardápio (aba `Pratos` e `Receitas` da planilha)
- Adiciona seus próprios itens na aba `Itens` (com tag `mensal`, `semanal` ou ambos)
- Adapta cardápio mensal (aba `Cardápio`)
- Veja [DATA-MODEL.md](DATA-MODEL.md) pra entender a estrutura

---

## Troubleshooting

**"Erro ao carregar dados" / HTTP 400 numa das abas**: a URL CSV está quebrada. Republica essa aba (passo 3) e atualiza no HTML.

**"unknown_action" ao salvar**: o Apps Script não tem a função correspondente. Confirma que o conteúdo do `apps-script.gs` está completo no editor e que você fez "Nova versão" no Deploy.

**"invalid_token"**: o token do HTML não bate com o do Apps Script. Verifica os 2 lugares.

**Modal de perfil aparece toda vez**: localStorage do navegador foi limpo. Comportamento esperado em modo anônimo.
