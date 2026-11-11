/**
 * Encuesta Navideña · Backend Google Apps Script
 * Recibe votos vía POST, valida duplicados y los escribe en Google Sheets.
 *
 * Hoja "Votos":      Fecha/Hora | IP del Votante | Restaurante Seleccionado | ID Dispositivo
 * Hoja "Resultados": conteo automático por restaurante (fórmulas).
 */

const CONFIG = {
  HOJA_VOTOS: 'Votos',
  HOJA_RESULTADOS: 'Resultados',
  ZONA_HORARIA: 'America/Costa_Rica',

  /**
   * Cómo bloquear votos duplicados:
   *  'IP'          → 1 voto por IP pública (lo solicitado).
   *                  OJO: en una oficina todos comparten la misma IP pública;
   *                  solo contaría el primer voto de toda la red.
   *  'DISPOSITIVO' → 1 voto por navegador/dispositivo (recomendado en redes compartidas).
   *  'NINGUNO'     → sin bloqueo en servidor (solo el del navegador).
   */
  MODO_BLOQUEO: 'IP',

  // Cierre opcional de la votación (vacío = sin cierre). Ej: '2026-12-05T23:59:00-06:00'
  FECHA_CIERRE: '',

  RESTAURANTES: ['Novillo Alegre', 'Outback Steakhouse', "P.F. Chang's", 'Olive Garden']
};

/* ===================== Endpoints ===================== */

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000); // evita condiciones de carrera entre votos simultáneos

    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const restaurante = String(data.restaurante || '').trim();
    const ip = limpiarIP_(data.ip);
    const dispositivo = String(data.dispositivo || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64);

    if (CONFIG.RESTAURANTES.indexOf(restaurante) === -1) {
      return json_({ ok: false, code: 'INVALIDO', message: 'Restaurante no válido.' });
    }
    if (CONFIG.FECHA_CIERRE && new Date() > new Date(CONFIG.FECHA_CIERRE)) {
      return json_({ ok: false, code: 'CERRADA', message: 'La votación ya cerró.' });
    }

    const hoja = obtenerHojaVotos_();
    const previo = buscarDuplicado_(hoja, ip, dispositivo);
    if (previo) {
      return json_({ ok: false, code: 'DUPLICADO', restaurante: previo,
                     message: 'Ya se registró un voto desde esta conexión o dispositivo.' });
    }

    hoja.appendRow([new Date(), ip, restaurante, dispositivo]);
    return json_({ ok: true, restaurante: restaurante });

  } catch (err) {
    return json_({ ok: false, code: 'ERROR', message: 'Error del servidor: ' + err.message });
  } finally {
    lock.releaseLock();
  }
}

/** GET ?action=resultados → conteo en JSON. Sin parámetros → estado del servicio. */
function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'resultados') {
    return json_({ ok: true, resultados: contarVotos_() });
  }
  return json_({ ok: true, message: 'Servicio de votación activo.' });
}

/* ===================== Lógica ===================== */

function buscarDuplicado_(hoja, ip, dispositivo) {
  if (CONFIG.MODO_BLOQUEO === 'NINGUNO') return null;
  const ultima = hoja.getLastRow();
  if (ultima < 2) return null;
  const filas = hoja.getRange(2, 2, ultima - 1, 3).getValues(); // IP, Restaurante, Dispositivo
  for (let i = 0; i < filas.length; i++) {
    const [ipFila, restFila, dispFila] = filas[i];
    if (CONFIG.MODO_BLOQUEO === 'IP' && ip !== 'desconocida' && ipFila === ip) return restFila;
    if (CONFIG.MODO_BLOQUEO === 'DISPOSITIVO' && dispositivo && dispFila === dispositivo) return restFila;
  }
  return null;
}

function contarVotos_() {
  const hoja = obtenerHojaVotos_();
  const conteo = {};
  CONFIG.RESTAURANTES.forEach(r => conteo[r] = 0);
  const ultima = hoja.getLastRow();
  if (ultima >= 2) {
    hoja.getRange(2, 3, ultima - 1, 1).getValues().forEach(([r]) => {
      if (conteo.hasOwnProperty(r)) conteo[r]++;
    });
  }
  return conteo;
}

function limpiarIP_(ip) {
  const s = String(ip || '').trim();
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6 = /^[0-9a-fA-F:]{2,45}$/;
  return (ipv4.test(s) || ipv6.test(s)) ? s : 'desconocida';
}

function obtenerHojaVotos_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(CONFIG.HOJA_VOTOS);
  if (!hoja) {
    hoja = ss.insertSheet(CONFIG.HOJA_VOTOS);
    hoja.appendRow(['Fecha/Hora', 'IP del Votante', 'Restaurante Seleccionado', 'ID Dispositivo']);
    hoja.getRange('A1:D1').setFontWeight('bold').setBackground('#1f4a3a').setFontColor('#f3eadb');
    hoja.setFrozenRows(1);
    hoja.getRange('A:A').setNumberFormat('dd/MM/yyyy HH:mm:ss');
    hoja.setColumnWidths(1, 4, 190);
  }
  return hoja;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ===================== Configuración y menú ===================== */

/** Ejecutar UNA VEZ desde el editor: crea las hojas y el resumen de resultados. */
function configurar() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone(CONFIG.ZONA_HORARIA);
  obtenerHojaVotos_();

  let res = ss.getSheetByName(CONFIG.HOJA_RESULTADOS) || ss.insertSheet(CONFIG.HOJA_RESULTADOS);
  res.clear();
  res.getRange('A1:C1').setValues([['Restaurante', 'Votos', '% del total']])
     .setFontWeight('bold').setBackground('#7a1f2b').setFontColor('#ffffff');
  const n = CONFIG.RESTAURANTES.length;
  CONFIG.RESTAURANTES.forEach((r, i) => {
    const fila = i + 2;
    res.getRange(fila, 1).setValue(r);
    res.getRange(fila, 2).setFormula(`=COUNTIF(${CONFIG.HOJA_VOTOS}!C:C,A${fila})`);
    res.getRange(fila, 3).setFormula(`=IFERROR(B${fila}/SUM($B$2:$B$${n + 1}),0)`).setNumberFormat('0.0%');
  });
  const tot = n + 2;
  res.getRange(tot, 1, 1, 2).setValues([['TOTAL', `=SUM(B2:B${n + 1})`]]).setFontWeight('bold');
  res.getRange(tot + 2, 1).setValue('Ganador actual:').setFontWeight('bold');
  res.getRange(tot + 2, 2).setFormula(`=IF(B${tot}=0,"—",INDEX(A2:A${n + 1},MATCH(MAX(B2:B${n + 1}),B2:B${n + 1},0)))`)
     .setFontWeight('bold').setFontColor('#7a1f2b');
  res.setColumnWidth(1, 220);
}

/** Menú personalizado dentro de Google Sheets. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Encuesta Navideña')
    .addItem('Descargar en Excel (.xlsx)', 'descargarExcel')
    .addItem('Ver resultados', 'verResultados')
    .addSeparator()
    .addItem('Configurar hojas (1.ª vez)', 'configurar')
    .addToUi();
}

/** Descarga el libro completo como .xlsx con un clic. */
function descargarExcel() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const url = `https://docs.google.com/spreadsheets/d/${ss.getId()}/export?format=xlsx`;
  const html = HtmlService.createHtmlOutput(
    `<div style="font-family:Arial;padding:8px">
       <p>Si la descarga no inicia automáticamente:</p>
       <a href="${url}" target="_blank" style="font-weight:bold">Descargar Excel</a>
     </div>
     <script>window.open(${JSON.stringify(url)}, '_blank'); setTimeout(()=>google.script.host.close(), 4000);</script>`
  ).setWidth(320).setHeight(120);
  SpreadsheetApp.getUi().showModalDialog(html, 'Exportar a Excel');
}

function verResultados() {
  const c = contarVotos_();
  const texto = Object.keys(c).sort((a, b) => c[b] - c[a]).map(k => `${k}: ${c[k]}`).join('\n');
  SpreadsheetApp.getUi().alert('Resultados actuales', texto, SpreadsheetApp.getUi().ButtonSet.OK);
}
