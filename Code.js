/* ==================================================
   BACKEND SYSTEM - DompetKu Pro (FULL INTEGRATED)
   ================================================== */

function doGet() {
  return HtmlService.createTemplateFromFile('index').evaluate()
    .setTitle('Isi Dompet')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
}

/* --- AUTH --- */
function doLogin(username, password) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('user');
  if (!sheet) return { success: false, message: "Error: Sheet 'user' tidak ditemukan!" };
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim() === String(username).trim() && String(data[i][2]).trim() === String(password).trim()) {
      return { success: true };
    }
  }
  return { success: false, message: "Username atau Password salah!" };
}

function changeUserPassword(username, oldPass, newPass) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("user");
  if (sh) {
    var d = sh.getDataRange().getValues();
    for (var i = 1; i < d.length; i++) {
      if (String(d[i][1]).trim() === String(username).trim() && String(d[i][2]).trim() === String(oldPass).trim()) {
        sh.getRange(i + 1, 3).setValue(newPass);
        sh.getRange(i + 1, 4).setValue(new Date());
        return { success: true, message: "Password berhasil diupdate" };
      }
    }
  }
  return { success: false, message: "Gagal update: Username atau Password Lama salah" };
}

/* --- DASHBOARD DATA --- */
function getDashboardData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = Session.getScriptTimeZone();
  const currentMonth = Utilities.formatDate(new Date(), tz, 'yyyy-MM');

  // Cache sheet values to minimize Apps Script Spreadsheet service overhead
  const sheets = ss.getSheets();
  const sheetDataMap = {};
  sheets.forEach(sheet => {
    const name = sheet.getName().toLowerCase();
    if (sheet.getLastRow() > 1) {
      sheetDataMap[name] = sheet.getDataRange().getValues();
    } else {
      sheetDataMap[name] = [];
    }
  });

  const sumSheetData = (name, colIndex) => {
    const data = sheetDataMap[name.toLowerCase()] || [];
    let sum = 0;
    for (let i = 1; i < data.length; i++) {
      let val = data[i][colIndex];
      sum += typeof val === 'number' ? val : parseFloat(String(val).replace(/[^\d.-]/g, '')) || 0;
    }
    return sum;
  };

  let totalBank = sumSheetData('bank', 2);
  let totalEwallet = sumSheetData('ewallet', 2);
  let totalTunai = sumSheetData('tunai', 2);
  let totalInvestasi = sumSheetData('investasi', 3);
  let totalTabungan = sumSheetData('tabungan', 1);

  let totalHutang = 0;
  let totalPiutang = 0;
  const dataHutang = sheetDataMap['hutang'] || [];
  for (let i = 1; i < dataHutang.length; i++) {
    const jenis = String(dataHutang[i][1]).toUpperCase();
    let val = dataHutang[i][5];
    const sisa = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^\d.-]/g, '')) || 0;
    const status = String(dataHutang[i][6]);
    if (status !== 'Lunas') {
      if (jenis.includes('HUTANG')) totalHutang += sisa;
      if (jenis.includes('PIUTANG')) totalPiutang += sisa;
    }
  }

  let totalRencana = 0;
  const dataRencana = sheetDataMap['rencana'] || [];
  for (let i = 1; i < dataRencana.length; i++) {
    let val = dataRencana[i][3];
    const sisaTagihan = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^\d.-]/g, '')) || 0;
    if (sisaTagihan > 0) {
      totalRencana += sisaTagihan;
    }
  }

  let incomeMonth = 0;
  let expenseMonth = 0;
  const dataTrx = sheetDataMap['transaksi'] || [];
  let recents = [];
  if (dataTrx.length > 1) {
    const allTrx = [...dataTrx];
    allTrx.shift();
    allTrx.forEach(r => {
      const tglTrx = r[8] ? Utilities.formatDate(new Date(r[8]), tz, 'yyyy-MM') : '';
      if (tglTrx === currentMonth) {
        let val = r[5];
        const nominal = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^\d.-]/g, '')) || 0;
        if (r[1] === 'PEMASUKAN') incomeMonth += nominal;
        if (r[1] === 'PENGELUARAN') expenseMonth += Math.abs(nominal);
      }
    });
    const last10 = dataTrx.slice(-5).reverse();
    recents = last10.map(r => ({
      kode: r[1], kategori: r[4] || r[2], ket: r[3], nominal: r[5], tgl: formatDate(r[8])
    }));
  }

  const sisaUang = (totalBank + totalEwallet + totalTunai + totalPiutang) - totalTabungan - totalRencana - totalHutang;
  touchDataUpdate();
  return {
    card1: sisaUang, card2: expenseMonth, card3: totalRencana, card4: totalInvestasi,
    chart: { in: incomeMonth, out: expenseMonth }, recents: recents
  };
}

/* --- MASTER DATA CRUD --- */
function getMasterData(type) {
  let sheetName = type;
  if (type === 'piutang') sheetName = 'hutang';
  const sheet = getSheetSafe(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const data = sheet.getDataRange().getValues();
  data.shift();
  touchDataUpdate();
  return data.map(r => {
    if (type === 'hutang' || type === 'piutang') return { id: r[0], kategori: r[1], keterangan: r[2], sumber: r[3], saldo_awal: r[4], saldo_akhir: r[5], status: r[6], tanggal: formatDate(r[7]) };
    else if (type === 'investasi' || type === 'rencana') return { id: r[0], nama: r[1], kategori: r[2], saldo: r[3], tanggal: formatDate(r[4]), raw_date: (r[4] ? Utilities.formatDate(new Date(r[4]), Session.getScriptTimeZone(), 'yyyy-MM-dd') : '') };
    else if (type === 'tabungan') return { id: r[0], saldo: r[1], nama: r[2], tanggal: formatDate(r[3]) };
    else return { id: r[0], nama: r[1], saldo: r[2], tanggal: formatDate(r[3]) };
  });
}

function saveMasterData(type, form) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheetName = type;
  if (type === 'piutang') sheetName = 'hutang';
  const sheet = getSheetSafe(sheetName);
  const now = new Date();
  const saldoBersih = parseFloat(String(form.f_saldo).replace(/\./g, '')) || 0;

  let rowIndex = -1;
  const data = sheet.getDataRange().getValues();

  if (form.id) {
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(form.id)) { rowIndex = i + 1; break; }
    }
  }

  // LOGIKA KHUSUS INVESTASI BARU (DENGAN SUMBER DANA)
  if (type === 'investasi' && !form.id && form.f_sumber) {
    const sumberInfo = JSON.parse(form.f_sumber);
    const resSaldo = updateSaldoMaster(sumberInfo, -saldoBersih); // Kurangi Saldo Sumber

    const sheetTrx = getSheetSafe('transaksi');
    const tglInput = form.f_tanggal || Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    // Catat sebagai Transfer Keluar
    sheetTrx.appendRow([
      'TRX-INV-' + Date.now(),
      'TRANSFER',
      'INVESTASI',
      'BELI ASET: ' + form.f_nama.toUpperCase(),
      sumberInfo.name.toUpperCase(),
      -saldoBersih,
      resSaldo.saldoAwal,
      resSaldo.saldoAkhir,
      tglInput
    ]);
  }

  if (rowIndex === -1) {
    rowIndex = sheet.getLastRow() + 1;
    sheet.getRange(rowIndex, 1).setValue('ID-' + type.toUpperCase() + '-' + Date.now());
  }

  if (type === 'hutang' || type === 'piutang') {
    sheet.getRange(rowIndex, 2).setValue(form.f_kategori);
    sheet.getRange(rowIndex, 3).setValue(form.f_keterangan.toUpperCase());
    sheet.getRange(rowIndex, 4).setValue("-");
    if (!form.id) {
      sheet.getRange(rowIndex, 5).setValue(saldoBersih);
      sheet.getRange(rowIndex, 6).setValue(saldoBersih);
    }
    sheet.getRange(rowIndex, 7).setValue(form.f_status);
    sheet.getRange(rowIndex, 8).setValue(form.f_tanggal || now);
  } else if (type === 'investasi' || type === 'rencana') {
    sheet.getRange(rowIndex, 2).setValue(form.f_nama.toUpperCase());
    sheet.getRange(rowIndex, 3).setValue(form.f_kategori.toUpperCase());
    sheet.getRange(rowIndex, 4).setValue(saldoBersih);
    sheet.getRange(rowIndex, 5).setValue(form.f_tanggal || now);
  } else if (type === 'tabungan') {
    sheet.getRange(rowIndex, 2).setValue(saldoBersih);
    sheet.getRange(rowIndex, 3).setValue(form.f_nama.toUpperCase());
    sheet.getRange(rowIndex, 4).setValue(now);
  } else {
    sheet.getRange(rowIndex, 2).setValue(form.f_nama.toUpperCase());
    sheet.getRange(rowIndex, 3).setValue(saldoBersih);
    sheet.getRange(rowIndex, 4).setValue(now);
  }
  touchDataUpdate();
  return { success: true };
}

function deleteMasterData(type, id) {
  let sheetName = type;
  if (type === 'piutang') sheetName = 'hutang';
  const sheet = getSheetSafe(sheetName);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) { if (String(data[i][0]) === String(id)) { sheet.deleteRow(i + 1); break; } }
  touchDataUpdate(); return { success: true };
}

function getActivePlans() {
  const s = getSheetSafe('rencana');
  if (!s || s.getLastRow() < 2) return [];
  const d = s.getDataRange().getValues();
  d.shift();
  const z = Session.getScriptTimeZone();
  const t = Utilities.formatDate(new Date(), z, 'yyyyMM');
  return d.filter(r => {
    const c = r[2] ? String(r[2]).toUpperCase().trim() : "";
    if (c !== 'RUTIN') return true;
    try { return Utilities.formatDate(new Date(r[4]), z, 'yyyyMM') === t } catch (e) { return false }
  }).map(r => ({
    id: r[0], name: r[1], category: r[2], amount: r[3], date: r[4] ? Utilities.formatDate(new Date(r[4]), z, 'yyyy-MM-dd') : ''
  }));
}

function getActiveDebts(t) {
  const s = getSheetSafe('hutang');
  const d = s.getDataRange().getValues();
  d.shift();
  return d.filter(r => r[1] === t && r[6] !== 'Lunas').map(r => ({ id: r[0], name: r[2], amount: r[5] }));
}

function processDebtPayment(form) {
  const sheetHutang = getSheetSafe('hutang');
  const sheetTrx = getSheetSafe('transaksi');
  const now = new Date();
  const idHutang = form.p_id;
  const nominalBayar = parseFloat(String(form.p_nominal).replace(/\./g, '')) || 0;
  const akunSumber = JSON.parse(form.p_sumber);
  const namaSumberDana = akunSumber.name.toUpperCase();
  const keterangan = (form.p_keterangan || "").toUpperCase();
  const dataHutang = sheetHutang.getDataRange().getValues();
  let kategori = "", namaHutang = "", rowIdx = -1, sisaLama = 0;

  for (let i = 1; i < dataHutang.length; i++) {
    if (String(dataHutang[i][0]) === String(idHutang)) {
      kategori = String(dataHutang[i][1]).toUpperCase().trim();
      namaHutang = dataHutang[i][2];
      let val = dataHutang[i][5];
      sisaLama = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^\d.-]/g, '')) || 0;
      rowIdx = i + 1;
      break;
    }
  }
  if (rowIdx === -1) return { success: false, message: "Data hutang tidak ditemukan!" };
  if (kategori === 'HUTANG' && getSaldoSaatIni(akunSumber) < nominalBayar) return { success: false, message: `Saldo ${namaSumberDana} tidak cukup!` };

  let sisaBaru = sisaLama - nominalBayar;
  if (sisaBaru <= 0) { sisaBaru = 0; sheetHutang.getRange(rowIdx, 7).setValue('Lunas'); }
  sheetHutang.getRange(rowIdx, 4).setValue(namaSumberDana);
  sheetHutang.getRange(rowIdx, 6).setValue(sisaBaru);
  sheetHutang.getRange(rowIdx, 8).setValue(now);

  let pengali = (kategori === 'HUTANG') ? -1 : 1;
  const perubahanSaldo = nominalBayar * pengali;
  const resSaldo = updateSaldoMaster(akunSumber, perubahanSaldo);

  let tipeTrx = (kategori === 'HUTANG') ? 'PENGELUARAN' : 'PEMASUKAN';
  let labelTransaksi = (kategori === 'HUTANG') ? 'PELUNASAN HUTANG' : 'PENERIMAAN PIUTANG';
  let ketLog = `${labelTransaksi}: ${namaHutang}` + (keterangan ? ` (${keterangan})` : "");
  const fmtDate = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  sheetTrx.appendRow(['TRX-PAY-' + Date.now(), tipeTrx, labelTransaksi, ketLog, namaSumberDana, perubahanSaldo, resSaldo.saldoAwal, resSaldo.saldoAkhir, fmtDate]);

  touchDataUpdate();
  return { success: true, message: "Pembayaran berhasil diproses!" };
}

function saveTransaction(form) {
  const sheetTrx = getSheetSafe('transaksi');
  const nominal = parseFloat(String(form.t_nominal).replace(/\./g, ''));
  const sumberInfo = JSON.parse(form.t_sumber);
  const tanggal = form.t_tanggal;
  const jenis = form.t_jenis;
  if (isNaN(nominal) || nominal <= 0) return { success: false, message: "Nominal tidak valid" };

  if (jenis === 'Transfer') {
    const destInfo = JSON.parse(form.t_tujuan_transfer);
    if (sumberInfo.id === destInfo.id) return { success: false, message: "Akun Asal dan Tujuan sama!" };
    if (getSaldoSaatIni(sumberInfo) < nominal) return { success: false, message: `Saldo ${sumberInfo.name} kurang!` };
    const resAsal = updateSaldoMaster(sumberInfo, -nominal);
    const resTujuan = updateSaldoMaster(destInfo, nominal);
    sheetTrx.appendRow(['TRX-' + Date.now() + '-OUT', 'TRANSFER', 'TRANSFER KELUAR', `TRF KE ${destInfo.name.toUpperCase()}`, sumberInfo.name.toUpperCase(), -nominal, resAsal.saldoAwal, resAsal.saldoAkhir, tanggal]);
    sheetTrx.appendRow(['TRX-' + Date.now() + '-IN', 'TRANSFER', 'TRANSFER MASUK', `TRF DARI ${sumberInfo.name.toUpperCase()}`, destInfo.name.toUpperCase(), nominal, resTujuan.saldoAwal, resTujuan.saldoAkhir, tanggal]);
    return { success: true, message: "Transfer Berhasil!" };
  } else {
    const katUpper = form.t_kategori ? form.t_kategori.toUpperCase().trim() : '';
    const ketManual = form.t_keterangan ? form.t_keterangan.toUpperCase().trim() : '';
    const isRencanaFlag = form.is_rencana === 'TRUE';
    const namaTarget = form.nama_target ? form.nama_target.toUpperCase().trim() : '';
    let logKet = (isRencanaFlag && namaTarget) ? (ketManual !== '' ? ketManual : 'BAYAR RENCANA: ' + namaTarget) : (ketManual !== '' ? ketManual : 'TRANSAKSI ' + jenis.toUpperCase());

    if ((isRencanaFlag || katUpper === 'BAYAR RENCANA' || jenis === 'Keluar') && cutPlanBalance(namaTarget || katUpper || ketManual, nominal)) {
      logKet = (ketManual) ? `${logKet}` : `${logKet}`;
    }
    if (jenis === 'Keluar' && getSaldoSaatIni(sumberInfo) < nominal) return { success: false, message: `Saldo ${sumberInfo.name} tidak cukup!` };

    const nominalFinal = (jenis === 'Masuk') ? nominal : -nominal;
    const res = updateSaldoMaster(sumberInfo, nominalFinal);
    sheetTrx.appendRow(['TRX-' + Date.now(), (jenis === 'Masuk' ? 'PEMASUKAN' : 'PENGELUARAN'), katUpper, logKet, sumberInfo.name.toUpperCase(), nominalFinal, res.saldoAwal, res.saldoAkhir, tanggal]);
    touchDataUpdate();
    return { success: true, message: "Transaksi disimpan!" };
  }
}

/* --- LOGIKA PENDUKUNG --- */
function cutPlanBalance(namaKategori, nominalKeluar) {
  const ws = getSheetSafe('rencana');
  if (!ws) return false;
  const data = ws.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toUpperCase().trim() === namaKategori.toUpperCase().trim()) {
      if (String(data[i][2]).toUpperCase().trim() === 'RUTIN') {
        const targetDate = new Date(); targetDate.setMonth(targetDate.getMonth() + 1); targetDate.setDate(1);
        ws.getRange(i + 1, 5).setValue(targetDate);
      } else {
        let cellVal = data[i][3];
        let sisa = (typeof cellVal === 'number' ? cellVal : parseFloat(String(cellVal).replace(/[^\d.-]/g, '')) || 0) - nominalKeluar;
        ws.getRange(i + 1, 4).setValue(sisa < 0 ? 0 : sisa);
        ws.getRange(i + 1, 5).setValue(new Date());
      }
      return true;
    }
  }
  return false;
}

function updateSaldoMaster(info, n) {
  const sheet = getSheetSafe(info.type);
  if (!sheet) return { saldoAwal: 0, saldoAkhir: 0 };
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(info.id)) {
      let colIdx = (info.type === 'investasi') ? 3 : (info.type === 'tabungan' ? 1 : 2);
      let cellVal = data[i][colIdx];
      const sa = typeof cellVal === 'number' ? cellVal : parseFloat(String(cellVal).replace(/[^\d.-]/g, '')) || 0;
      const sak = sa + n;
      sheet.getRange(i + 1, colIdx + 1).setValue(sak);
      let colDate = (info.type === 'investasi') ? 5 : 4;
      if (sheet.getLastColumn() >= colDate) sheet.getRange(i + 1, colDate).setValue(new Date());
      return { saldoAwal: sa, saldoAkhir: sak };
    }
  }
  return { saldoAwal: 0, saldoAkhir: 0 };
}

function getSaldoSaatIni(info) {
  const s = getSheetSafe(info.type); if (!s) return 0;
  const d = s.getDataRange().getValues();
  let colIdx = (info.type === 'investasi') ? 3 : (info.type === 'tabungan' ? 1 : 2);
  for (let i = 1; i < d.length; i++) {
    if (String(d[i][0]) === String(info.id)) {
      let cellVal = d[i][colIdx];
      return typeof cellVal === 'number' ? cellVal : parseFloat(String(cellVal).replace(/[^\d.-]/g, '')) || 0;
    }
  }
  return 0;
}

function getSheetSafe(n) {
  const ss = SpreadsheetApp.getActiveSpreadsheet(); let s = ss.getSheetByName(n);
  if (!s) {
    const capName = n.charAt(0).toUpperCase() + n.slice(1); s = ss.getSheetByName(capName);
    if (!s && n === 'transaksi') { s = ss.insertSheet(n); s.appendRow(['ID', 'Kode', 'Kategori', 'Keterangan', 'Sumber', 'Nominal', 'Saldo Awal', 'Saldo Akhir', 'Tanggal']); }
  }
  return s;
}

function getAccountSources() {
  let accounts = [];
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  const sheetDataMap = {};
  sheets.forEach(sheet => {
    sheetDataMap[sheet.getName().toLowerCase()] = sheet;
  });

  ['bank', 'ewallet', 'tunai', 'investasi', 'tabungan'].forEach(type => {
    const sheet = sheetDataMap[type] || sheetDataMap[type.charAt(0).toUpperCase() + type.slice(1)];
    if (sheet && sheet.getLastRow() > 1) {
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        let idxS = (type === 'investasi') ? 3 : (type === 'tabungan' ? 1 : 2);
        let idxN = (type === 'tabungan') ? 2 : 1;
        let cellVal = data[i][idxS];
        accounts.push({ type: type, id: data[i][0], name: data[i][idxN], balance: typeof cellVal === 'number' ? cellVal : parseFloat(String(cellVal).replace(/[^\d.-]/g, '')) || 0 });
      }
    }
  });
  return accounts;
}

function getChartHistory() {
  const sheet = getSheetSafe('transaksi');
  const data = sheet.getDataRange().getValues();
  if (data.length > 0) data.shift();
  const days = [], income = [], expense = [];
  const today = new Date();
  for (let i = 7; i >= 0; i--) {
    const d = new Date(); d.setDate(today.getDate() - i);
    const dateStr = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    days.push(Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM'));
    let inc = 0, exp = 0;
    data.forEach(row => {
      if (row[8]) {
        const rowDate = Utilities.formatDate(new Date(row[8]), Session.getScriptTimeZone(), 'yyyy-MM-dd');
        if (rowDate === dateStr) {
          let cellV = row[5];
          const nominal = typeof cellV === 'number' ? cellV : parseFloat(String(cellV).replace(/[^\d.-]/g, '')) || 0;
          if (row[1] === 'PEMASUKAN') inc += nominal;
          if (row[1] === 'PENGELUARAN') exp += Math.abs(nominal);
        }
      }
    });
    income.push(inc); expense.push(exp);
  }
  return { labels: days, income: income, expense: expense };
}

function getCategories() {
  const ws = getSheetSafe('kategori'); if (!ws) return [];
  const data = ws.getDataRange().getValues();
  let cats = []; for (let i = 1; i < data.length; i++) { cats.push([data[i][0], data[i][1], data[i][2]]); }
  return cats;
}

function formatDate(d) { try { return d ? Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), 'dd/MM/yyyy') : '-' } catch (e) { return '-' } }
function formatRupiahSimple(n) { return new Intl.NumberFormat('id-ID').format(n); }
function touchDataUpdate() { PropertiesService.getScriptProperties().setProperty('LAST_UPDATE', new Date().getTime().toString()); }
function checkDataUpdate(clientTimestamp) {
  const serverTimestamp = PropertiesService.getScriptProperties().getProperty('LAST_UPDATE') || '0';
  return { hasUpdate: serverTimestamp !== String(clientTimestamp), serverTimestamp: serverTimestamp };
}

function getHistoryData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet(); const ws = ss.getSheetByName('history');
  if (!ws || ws.getLastRow() < 2) return [];
  const data = ws.getDataRange().getValues();
  let res = [];
  for (let i = 1; i < data.length; i++) {
    let rawDate = data[i][7]; let tglFmt = "-";
    if (rawDate) {
      if (rawDate instanceof Date) tglFmt = Utilities.formatDate(rawDate, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
      else tglFmt = rawDate;
    }
    res.push({
      tipe: data[i][0] || "-", kategori: data[i][1] || "-", deskripsi: data[i][2] || "-", sumber: data[i][3] || "-",
      nominal: data[i][4] || 0, saldo_awal: data[i][5] || 0, saldo_akhir: data[i][6] || 0, tanggal: tglFmt
    });
  }
  return res.reverse();
}
// Fungsi Pancingan Untuk Memaksa Izin Google
function paksaIzin() {
  UrlFetchApp.fetch("https://www.google.com");
}

/* ==================================================
   INTEGRASI GEMINI AI CHATBOT
   ================================================== */

// Mengambil API Key dari Script Properties untuk keamanan data rahasia
const GROQ_API_KEY = PropertiesService.getScriptProperties().getProperty("GROQ_API_KEY") || "";

function askGeminiAI(userMessage, currentDataSummary) {
  // Endpoint resmi dari Groq API
  const url = "https://api.groq.com/openai/v1/chat/completions";

  const systemPrompt = `Kamu adalah asisten keuangan pribadi yang ramah, profesional, dan pintar bernama "Isi Dompet".
  Berikut adalah ringkasan data keuangan user saat ini:
  ${currentDataSummary}
  
  Tugasmu:
  1. Berikan jawaban yang bersahabat, ringkas, dan solutif.
  2. Gunakan bahasa Indonesia yang santai tapi sopan.
  3. Jika user menyapa, balas sapaannya.
  4. Jika user curhat atau minta saran keuangan, berikan nasihat berdasarkan data di atas.`;

  // Kita gunakan LLaMA 3 8B (sangat cepat dan cerdas)
  const payload = {
    "model": "llama-3.3-70b-versatile",
    "messages": [
      { "role": "system", "content": systemPrompt },
      { "role": "user", "content": userMessage }
    ],
    "temperature": 0.7
  };

  const options = {
    "method": "post",
    "contentType": "application/json",
    "headers": {
      "Authorization": "Bearer " + GROQ_API_KEY
    },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(response.getContentText());

    // Jika sukses
    if (json.choices && json.choices.length > 0) {
      return json.choices[0].message.content;
    }
    // Tangkap pesan error dari Groq
    else if (json.error) {
      return "Pesan dari Groq LLaMA: " + json.error.message;
    }
    else {
      return "Respon tidak dikenal: " + response.getContentText();
    }
  } catch (e) {
    return "Ups, terjadi kesalahan koneksi ke server LLaMA: " + e.toString();
  }
}


/* ==================================================
   AJAX VIEW FETCHER
   ================================================== */
function getViewHtml(filename) {
  try {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (e) {
    return `<div class="p-8 text-center text-red-500 font-bold">Gagal memuat halaman: ${filename}</div>`;
  }
}

function kirimLaporanBulananOtomatis() {
  // ==========================================
  // 1. KONFIGURASI (SILAKAN DIISI)
  // ==========================================
  var TANGGAL_COL_INDEX = 8; // Pastikan ini benar (A=0, B=1, ... I=8, J=9)
  var NAMA_SHEET_SUMBER = "transaksi";
  var NAMA_SHEET_LAPORAN = "Laporan_Temp";
  var DAFTAR_PENERIMA = ["beni.alandra13@gmail.com"]; // GANTI DENGAN EMAIL TUJUAN

  // ==========================================
  // 2. PROSES DATA
  // ==========================================
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sourceSheet = ss.getSheetByName(NAMA_SHEET_SUMBER);
  var reportSheet = ss.getSheetByName(NAMA_SHEET_LAPORAN) || ss.insertSheet(NAMA_SHEET_LAPORAN);

  var data = sourceSheet.getDataRange().getValues();
  var headers = data[0];
  var rows = data.slice(1);

  var today = new Date();
  var targetBulan = today.getMonth(); // Bulan berjalan (0 = Jan, 4 = Mei, dst)
  var targetTahun = today.getFullYear();

  // Filter berdasarkan bulan dan tahun
  var filteredRows = rows.filter(function (row) {
    var rawDate = row[TANGGAL_COL_INDEX];
    if (!rawDate) return false;

    var d = new Date(rawDate);
    // Cek apakah tanggal valid
    if (isNaN(d.getTime())) return false;

    return d.getMonth() === targetBulan && d.getFullYear() === targetTahun;
  });

  // ==========================================
  // 3. TULIS KE SHEET LAPORAN
  // ==========================================
  reportSheet.clear();
  reportSheet.appendRow(headers);
  if (filteredRows.length > 0) {
    reportSheet.getRange(2, 1, filteredRows.length, headers.length).setValues(filteredRows);
  } else {
    reportSheet.appendRow(["Tidak ada data untuk bulan ini"]);
  }

  // PENTING: Perintah di bawah ini memastikan data selesai ditulis ke disk
  SpreadsheetApp.flush();
  Utilities.sleep(1500); // Jeda 1.5 detik agar PDF mengambil data terbaru

  // ==========================================
  // 4. EXPORT KE PDF
  // ==========================================
  var url = "https://docs.google.com/spreadsheets/d/" + ss.getId() + "/export?exportFormat=xlsx&gid=" + reportSheet.getSheetId();
  var token = ScriptApp.getOAuthToken();
  var response = UrlFetchApp.fetch(url, {
    headers: { 'Authorization': 'Bearer ' + token },
    muteHttpExceptions: true
  });

  var namaFile = "Laporan_" + (targetBulan + 1) + "_" + targetTahun + ".xlsx";
  var pdfBlob = response.getBlob().setName(namaFile);

  // ==========================================
  // 5. KIRIM EMAIL
  // ==========================================
  MailApp.sendEmail({
    to: DAFTAR_PENERIMA.join(","),
    subject: "Laporan Keuangan Otomatis - " + (targetBulan + 1) + "/" + targetTahun,
    body: "Halo Mas Beni,\n\nTerlampir adalah laporan transaksi untuk bulan " + (targetBulan + 1) + " tahun " + targetTahun + ".\n\nSalam,\nIsi Dompet System",
    attachments: [pdfBlob]
  });

  Logger.log("Berhasil! xlsx terlampir dan email terkirim ke: " + DAFTAR_PENERIMA.join(", "));
}



function cekDataTransaksi() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("transaksi");
  var data = sheet.getDataRange().getValues();

  // Kita ambil baris kedua (baris data pertama setelah header)
  var barisPertama = data[1];

  // Mencetak isi baris ke Log
  Logger.log("Isi baris pertama: " + barisPertama);

  // Mencetak setiap kolom dan indeksnya agar Mas Beni bisa melihat posisi tanggal
  barisPertama.forEach(function (val, index) {
    Logger.log("Kolom " + index + " (Indeks " + index + "): " + val);
  });
}