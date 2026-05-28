/**
 * Mercado App — backend via Google Apps Script (v2)
 *
 * Estrutura de abas (gerenciadas por este script):
 *   • Inbox      — itens pendentes compartilhados (qualquer um adiciona)
 *   • Listas     — listas salvas em andamento (max 5)
 *   • Histórico  — compras finalizadas
 *
 * Endpoints:
 *   GET  ?action=ping&token=...                          → healthcheck
 *   GET  ?action=loadAll&token=...                       → tudo de uma vez
 *   GET  ?action=loadInbox&token=...                     → só Inbox
 *   GET  ?action=loadListas&token=...                    → só listas ativas
 *   GET  ?action=loadHistorico&token=...                 → só histórico
 *
 *   POST {action: "setup", token}                        → cria/atualiza abas
 *   POST {action: "addInboxItem", item: {...}, token}    → adiciona item
 *   POST {action: "addInboxItems", items: [...], token}  → adiciona vários (usado no finalizarLista)
 *   POST {action: "updateInboxItem", id, changes, token}
 *   POST {action: "removeInboxItems", ids, token}
 *
 *   POST {action: "saveLista", lista: {...}, token}      → upsert; cria id se faltar
 *   POST {action: "deleteLista", id, token}              → remove lista
 *   POST {action: "finalizarLista", id, dados, token}    → move pra Histórico + ajusta Inbox
 *
 * Limite: max 5 listas ativas (saveLista rejeita se ultrapassar).
 */

const TOKEN = "mlist-x9k2-2026";

const SHEET_INBOX = "Inbox";
const SHEET_LISTAS = "Listas";
const SHEET_HISTORICO = "Histórico";

const INBOX_HEADERS = ["id", "timestamp", "item", "qty", "corte", "adicionado_por", "tags", "observacao", "veio_de_lista"];
const LISTAS_HEADERS = ["id", "nome", "tipo", "autor", "estado_json", "criada_em", "atualizada_em"];
const HISTORICO_HEADERS = ["timestamp_fim", "autor", "tipo", "nome", "duracao_min", "qtd_comprados", "qtd_devolvidos_inbox", "qtd_nao_encontrados", "cardapio", "resumo_json"];

const MAX_LISTAS_ATIVAS = 5;

// ============================================================
// HTTP ENTRYPOINTS
// ============================================================
function doGet(e) {
  const params = (e && e.parameter) || {};
  if (params.token !== TOKEN) return jsonOut({ error: "invalid_token" });
  try {
    switch (params.action) {
      case "ping":          return jsonOut({ ok: true, version: "2.0" });
      case "loadAll":       return jsonOut({ inbox: getInbox(), listas: getListas(), historico: getHistorico() });
      case "loadInbox":     return jsonOut({ inbox: getInbox() });
      case "loadListas":    return jsonOut({ listas: getListas() });
      case "loadHistorico": return jsonOut({ historico: getHistorico() });
      default:              return jsonOut({ error: "unknown_action", action: params.action });
    }
  } catch (err) {
    return jsonOut({ error: err.message });
  }
}

function doPost(e) {
  let data;
  try { data = JSON.parse(e.postData.contents); }
  catch (err) { return jsonOut({ error: "invalid_json" }); }
  if (data.token !== TOKEN) return jsonOut({ error: "invalid_token" });
  try {
    switch (data.action) {
      case "setup":            return jsonOut(setupSheets());
      case "addInboxItem":     return jsonOut(addInboxItem(data.item));
      case "addInboxItems":    return jsonOut(addInboxItems(data.items));
      case "updateInboxItem":  return jsonOut(updateInboxItem(data.id, data.changes));
      case "removeInboxItems": return jsonOut(removeInboxItems(data.ids));
      case "saveLista":        return jsonOut(saveLista(data.lista));
      case "deleteLista":      return jsonOut(deleteLista(data.id));
      case "finalizarLista":   return jsonOut(finalizarLista(data.id, data.dados));
      default:                 return jsonOut({ error: "unknown_action", action: data.action });
    }
  } catch (err) {
    return jsonOut({ error: err.message });
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// SETUP
// ============================================================
function setup() { return setupSheets(); }

function setupSheets() {
  const ss = SpreadsheetApp.getActive();
  ensureSheet(ss, SHEET_INBOX, INBOX_HEADERS);
  ensureSheet(ss, SHEET_LISTAS, LISTAS_HEADERS);
  ensureSheet(ss, SHEET_HISTORICO, HISTORICO_HEADERS);
  // Migração: se ainda existe aba antiga "Sessões", renomeia ou avisa
  const sessoes = ss.getSheetByName("Sessões");
  if (sessoes && ss.getSheetByName(SHEET_LISTAS) !== sessoes) {
    // Mantém aba Sessões mas sinaliza que tá deprecated. Não apaga pra não perder dados sem querer.
    sessoes.getRange("A1").setNote("Aba deprecada — substituída por 'Listas' na v2 do app");
  }
  return { ok: true, message: "Abas Inbox, Listas e Histórico OK" };
}

function ensureSheet(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#2E5C8A").setFontColor("#FFFFFF");
    sh.setFrozenRows(1);
    sh.autoResizeColumns(1, headers.length);
  } else {
    // Garante headers (caso versão antiga tenha menos colunas)
    const currentHeaders = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    if (currentHeaders.length < headers.length) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
      sh.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#2E5C8A").setFontColor("#FFFFFF");
    }
  }
  return sh;
}

// ============================================================
// INBOX
// ============================================================
function getInbox() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_INBOX);
  if (!sh) return [];
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const data = sh.getRange(2, 1, lastRow - 1, INBOX_HEADERS.length).getValues();
  return data
    .filter(row => row[2])
    .map(row => ({
      id: row[0],
      timestamp: toIso(row[1]),
      item: row[2],
      qty: row[3] || 1,
      corte: row[4] || "",
      adicionado_por: row[5] || "",
      tags: row[6] ? String(row[6]).split(",").map(t => t.trim()).filter(Boolean) : [],
      observacao: row[7] || "",
      veio_de_lista: row[8] || ""
    }));
}

function addInboxItem(item) {
  if (!item || !item.item) return { error: "item_required" };
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_INBOX) || ensureSheet(SpreadsheetApp.getActive(), SHEET_INBOX, INBOX_HEADERS);
  const id = Utilities.getUuid();
  const timestamp = new Date();
  sh.appendRow([
    id,
    timestamp,
    item.item,
    item.qty || 1,
    item.corte || "",
    item.adicionado_por || "",
    Array.isArray(item.tags) ? item.tags.join(",") : (item.tags || ""),
    item.observacao || "",
    item.veio_de_lista || ""
  ]);
  return { ok: true, id: id, timestamp: timestamp.toISOString() };
}

function addInboxItems(items) {
  if (!items || !items.length) return { ok: true, added: 0 };
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_INBOX) || ensureSheet(SpreadsheetApp.getActive(), SHEET_INBOX, INBOX_HEADERS);
  const rows = items.map(item => {
    const id = Utilities.getUuid();
    return [
      id,
      new Date(),
      item.item,
      item.qty || 1,
      item.corte || "",
      item.adicionado_por || "",
      Array.isArray(item.tags) ? item.tags.join(",") : (item.tags || ""),
      item.observacao || "",
      item.veio_de_lista || ""
    ];
  });
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, INBOX_HEADERS.length).setValues(rows);
  return { ok: true, added: rows.length };
}

function updateInboxItem(id, changes) {
  if (!id) return { error: "id_required" };
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_INBOX);
  if (!sh) return { error: "no_sheet" };
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return { error: "not_found" };
  const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === id) {
      const rowNum = i + 2;
      const colMap = { item: 3, qty: 4, corte: 5, adicionado_por: 6, tags: 7, observacao: 8, veio_de_lista: 9 };
      Object.keys(changes).forEach(k => {
        if (k in colMap) {
          let val = changes[k];
          if (k === "tags" && Array.isArray(val)) val = val.join(",");
          sh.getRange(rowNum, colMap[k]).setValue(val);
        }
      });
      return { ok: true };
    }
  }
  return { error: "not_found" };
}

function removeInboxItems(ids) {
  if (!ids || !ids.length) return { ok: true, removed: 0 };
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_INBOX);
  if (!sh) return { ok: true, removed: 0 };
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return { ok: true, removed: 0 };
  const idsAtuais = sh.getRange(2, 1, lastRow - 1, 1).getValues();
  const idsSet = new Set(ids);
  const rowsToRemove = [];
  for (let i = 0; i < idsAtuais.length; i++) {
    if (idsSet.has(idsAtuais[i][0])) rowsToRemove.push(i + 2);
  }
  rowsToRemove.sort((a, b) => b - a);
  rowsToRemove.forEach(row => sh.deleteRow(row));
  return { ok: true, removed: rowsToRemove.length };
}

// ============================================================
// LISTAS (até 5 ativas)
// ============================================================
function getListas() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_LISTAS);
  if (!sh) return [];
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const data = sh.getRange(2, 1, lastRow - 1, LISTAS_HEADERS.length).getValues();
  return data.filter(row => row[0]).map(row => ({
    id: row[0],
    nome: row[1] || "",
    tipo: row[2] || "",
    autor: row[3] || "",
    estado: row[4] ? safeParse(row[4]) : null,
    criada_em: toIso(row[5]),
    atualizada_em: toIso(row[6])
  }));
}

function saveLista(lista) {
  if (!lista) return { error: "lista_required" };
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_LISTAS) || ensureSheet(ss, SHEET_LISTAS, LISTAS_HEADERS);
  const lastRow = sh.getLastRow();
  const now = new Date();
  const estadoJson = JSON.stringify(lista.estado || {});

  // Atualiza se id já existe
  if (lista.id && lastRow >= 2) {
    const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (ids[i][0] === lista.id) {
        const rowNum = i + 2;
        sh.getRange(rowNum, 2).setValue(lista.nome || "");
        sh.getRange(rowNum, 3).setValue(lista.tipo || "");
        sh.getRange(rowNum, 4).setValue(lista.autor || "");
        sh.getRange(rowNum, 5).setValue(estadoJson);
        sh.getRange(rowNum, 7).setValue(now);
        return { ok: true, updated: true, id: lista.id };
      }
    }
  }

  // Nova lista — verifica limite
  const ativasCount = lastRow >= 2 ? sh.getRange(2, 1, lastRow - 1, 1).getValues().filter(r => r[0]).length : 0;
  if (ativasCount >= MAX_LISTAS_ATIVAS) {
    return { error: "limite_atingido", limite: MAX_LISTAS_ATIVAS };
  }
  const id = Utilities.getUuid();
  sh.appendRow([
    id,
    lista.nome || "",
    lista.tipo || "",
    lista.autor || "",
    estadoJson,
    now,
    now
  ]);
  return { ok: true, created: true, id: id };
}

function deleteLista(id) {
  if (!id) return { error: "id_required" };
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_LISTAS);
  if (!sh) return { ok: true, removed: 0 };
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return { ok: true, removed: 0 };
  const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === id) {
      sh.deleteRow(i + 2);
      return { ok: true, removed: 1 };
    }
  }
  return { ok: true, removed: 0 };
}

// ============================================================
// FINALIZAR LISTA
//   - Move pra Histórico
//   - Remove ids_comprados da Inbox
//   - Adiciona itens_pendentes_pra_inbox de volta na Inbox
//   - Remove a lista da aba Listas
// ============================================================
function finalizarLista(id, dados) {
  if (!id || !dados) return { error: "id_e_dados_required" };
  const ss = SpreadsheetApp.getActive();

  // 1. Grava no Histórico
  const shHist = ss.getSheetByName(SHEET_HISTORICO) || ensureSheet(ss, SHEET_HISTORICO, HISTORICO_HEADERS);
  shHist.appendRow([
    new Date(),
    dados.autor || "",
    dados.tipo || "",
    dados.nome || "",
    dados.duracao_min || 0,
    dados.qtd_comprados || 0,
    dados.qtd_devolvidos_inbox || 0,
    dados.qtd_nao_encontrados || 0,
    Array.isArray(dados.cardapio) ? dados.cardapio.join(", ") : (dados.cardapio || ""),
    JSON.stringify(dados.resumo || {})
  ]);

  // 1.5 Mantém só os 3 últimos no Histórico (decisão do usuário)
  manterUltimos(shHist, 3);

  // 2. Remove ids comprados da Inbox
  if (dados.ids_comprados && dados.ids_comprados.length) {
    removeInboxItems(dados.ids_comprados);
  }

  // 3. Adiciona itens pendentes/não-encontrados de volta na Inbox
  if (dados.itens_pra_inbox && dados.itens_pra_inbox.length) {
    addInboxItems(dados.itens_pra_inbox);
  }

  // 4. Remove a lista da aba Listas
  deleteLista(id);

  return { ok: true };
}

function manterUltimos(sh, n) {
  const lastRow = sh.getLastRow();
  if (lastRow <= n + 1) return; // 1 (header) + n
  // Apaga as linhas mais antigas (2 a lastRow - n)
  const linhasParaApagar = lastRow - 1 - n;
  sh.deleteRows(2, linhasParaApagar);
}

// ============================================================
// HISTÓRICO (leitura)
// ============================================================
function getHistorico() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_HISTORICO);
  if (!sh) return [];
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const data = sh.getRange(2, 1, lastRow - 1, HISTORICO_HEADERS.length).getValues();
  return data.filter(row => row[1]).map(row => ({
    timestamp_fim: toIso(row[0]),
    autor: row[1],
    tipo: row[2],
    nome: row[3] || "",
    duracao_min: row[4] || 0,
    qtd_comprados: row[5] || 0,
    qtd_devolvidos_inbox: row[6] || 0,
    qtd_nao_encontrados: row[7] || 0,
    cardapio: row[8] || "",
    resumo: row[9] ? safeParse(row[9]) : null
  }));
}

// ============================================================
// HELPERS
// ============================================================
function toIso(v) {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString();
  return String(v);
}
function safeParse(s) {
  try { return JSON.parse(s); } catch (e) { return null; }
}
