# Mercado App

> Lista de compras inteligente que cruza um catálogo de produtos, um cardápio de pratos e uma "Lembrados" compartilhada entre o casal. Funciona como app no celular, sem servidor próprio.

**Demo ao vivo:** https://viniciusdoimo.github.io/mercado-app/

---

## O problema

Toda semana o mesmo ritual: abrir o cardápio, lembrar dos ingredientes de cada prato, conferir o que já tem em casa, anotar o que a esposa lembrou de pedir durante a semana, ir ao mercado torcendo pra não esquecer nada. Quando esquece algo, vai pro próximo mercado. Quando o mercado não tem, volta pra lista pra próxima vez.

Cinco dores reais:

1. Esquecer ingredientes específicos de um prato
2. Comprar coisa que já tem em casa
3. Não saber qual corte de carne pegar no açougue (depende do preço do dia)
4. Esposa lembra de algo na terça → eu vou no domingo → como ela me avisa?
5. Item que não achei no mercado A → como volta pra próxima compra?

## A solução

Um app HTML sem build, sem servidor, que usa **Google Sheets como banco de dados**:

- **CSV publicado** (read-only) pra catálogo de produtos e cardápio
- **Google Apps Script** (read-write) pra lista compartilhada, sessões e histórico
- **GitHub Pages** pra hospedar o HTML
- **localStorage** pra cache offline e estado da sessão

Sem servidor próprio, sem banco de dados próprio, sem custo mensal.

## Telas

```
Home → Lembrados (lista compartilhada eterna)
     → Nova compra → Semanal / Mensal / Livre
     → Listas salvas (max 5, ir direto pro mercado)
     → Histórico (3 últimas)

Compra Semanal/Mensal: Cardápio → Lista → Mercado
Lista Livre: nome + opt-in Lembrados → Lista → Mercado
Mercado: → próximo mercado (mantém pendentes) | ✓ finalizar (vai pro Histórico)
```

## Stack

- **Frontend:** Vanilla JS (ES5 — compatibilidade celular), CSS, HTML — ~2500 linhas, 1 arquivo
- **Backend:** Google Apps Script (Web App publicado)
- **Banco:** Google Sheets (4 abas de dados + 3 abas geridas pelo Apps Script)
- **Hospedagem:** GitHub Pages (estática, gratuita)
- **Cache:** localStorage (7 dias pra dados, sessão atual sempre)

Zero dependências de runtime. Sem build, sem npm install, sem deploy automatizado.

## Como rodar localmente

Você precisa servir o HTML via HTTP (não `file://`) porque o navegador bloqueia CORS de origem nula.

```bash
git clone https://github.com/SEU-USUARIO/mercado-app.git
cd mercado-app
python3 -m http.server 8000
```

Abre `http://localhost:8000/` no navegador.

Pra usar com **seus próprios dados**, siga o [DEPLOY.md](docs/DEPLOY.md) — explica como configurar planilha, Apps Script e atualizar URLs no HTML.

## Estrutura do repo

```
mercado-app/
├── index.html              # o app — 1 arquivo, 1 deploy
├── apps-script.gs          # backend (cole no editor do Apps Script da planilha)
├── Mercado-template.xlsx   # planilha modelo pra importar no Google Drive
├── README.md               # este arquivo
├── LICENSE                 # MIT
├── .gitignore
├── CHANGELOG.md
└── docs/
    ├── DEPLOY.md           # setup do zero (~30min)
    ├── DATA-MODEL.md       # estrutura das abas e fluxo de dados
    └── ARCHITECTURE.md     # diagrama do sistema e decisões técnicas
```

## Sobre o desenvolvimento

Este projeto foi **construído inteiramente com IA**. Sou product manager, não programador de carreira. Usei Claude pra arquitetar a solução, decidir trade-offs, escrever o código, debugar e documentar.

O exercício mostrou um padrão interessante: o gargalo deixou de ser "saber programar" e virou "saber decidir bem". A IA escreve código rápido; o trabalho humano fica em entender o problema real, propor estruturas claras e validar que cada decisão técnica se conecta com um caso de uso concreto.

Este repositório fica aqui como evidência de até onde dá pra ir nesse modelo — e como demonstração de pensamento de produto, modelagem de domínio e UX colaborativa.

## Roadmap

- [x] Cruzamento cardápio × ingredientes × catálogo
- [x] Cortes alternativos de carne (radio buttons no mercado)
- [x] Cache offline via localStorage
- [x] Deploy automatizado via GitHub Pages
- [x] Backend compartilhado via Apps Script
- [x] Listas salvas (max 5 em paralelo)
- [x] Lembrados compartilhada entre dispositivos
- [x] Histórico de compras
- [ ] PWA (instalável como app nativo no celular)
- [ ] Notificação quando alguém adicionar à Lembrados
- [ ] Indicadores de idade de itens da Lembrados (>10 dias)
- [ ] Estimativa de gasto baseado em médias

## Licença

MIT — ver [LICENSE](LICENSE).
