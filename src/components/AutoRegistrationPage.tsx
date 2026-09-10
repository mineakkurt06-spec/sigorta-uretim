import { useState, useRef } from 'react';
import { Download, Eye, FileSpreadsheet, FileText, Pencil, Sparkles, Trash2, Truck, Upload, UserPlus, X, CheckCircle2, ClipboardPaste, Search, AlertTriangle, Loader2, Zap } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { exportToCsv, exportToExcel } from '@/lib/export';
import { parseBulkCustomerText, type ParsedCustomer } from '@/lib/parseClipboard';
import type { Customer } from '@/lib/types';

const SAMPLE_TEXT = `GÖKSEL BİNGÖL- müşteri adı soyadı
05312568428- telefon numarası
KORAY AKKURT - REFERANS
17380076204 - Tc Kimlik No
25.07.1994 - Doğum Tarihi
06PLD04 - Plaka No
HR457093 - Ruhsat Belge No
2014 - araç yılı
MASSEY FERGUSON - araç markası
MF 5450 -4 KABIN 4WD - araç modeli
TRAKTÖR - araç tipi
400 1855 - araç kodu
NL75368U222060Y - motor no
E076056 - şasi no
---
AYŞE KAYA - müşteri adı soyadı
05321234567 - telefon numarası
12045678902 - Tc Kimlik No
15.03.1990 - Doğum Tarihi
34ABC123 - Plaka No
B123456 - Ruhsat Belge No
2020 - araç yılı
VOLKSWAGEN - araç markası
PASSAT - araç modeli
OTOMOBİL - araç tipi
520 1100 - araç kodu
ABC123456789 - motor no
DEF987654321 - şasi no`;

type FormState = {
  tc_vergi_no: string;
  ad_soyad_unvan: string;
  referans: string;
  telefon: string;
  eposta: string;
  dogum_tarihi: string;
  uavt_adres_kodu: string;
  plaka_no: string;
  ruhsat_belge_no: string;
  arac_yili: string;
  arac_markasi: string;
  arac_modeli: string;
  arac_kodu: string;
  arac_tipi: string;
  motor_no: string;
  sase_no: string;
};

const customerFields: { key: keyof FormState; label: string }[] = [
  { key: 'ad_soyad_unvan', label: 'Ad Soyad' },
  { key: 'tc_vergi_no', label: 'TC Kimlik No' },
  { key: 'telefon', label: 'Telefon' },
  { key: 'referans', label: 'Referans' },
  { key: 'dogum_tarihi', label: 'Doğum Tarihi' },
  { key: 'uavt_adres_kodu', label: 'UAVT' },
];

const vehicleFields: { key: keyof FormState; label: string }[] = [
  { key: 'plaka_no', label: 'Plaka' },
  { key: 'arac_tipi', label: 'Araç Tipi' },
  { key: 'arac_markasi', label: 'Marka' },
  { key: 'arac_modeli', label: 'Model' },
  { key: 'arac_yili', label: 'Yıl' },
  { key: 'arac_kodu', label: 'Araç Kodu' },
  { key: 'ruhsat_belge_no', label: 'Ruhsat No' },
  { key: 'motor_no', label: 'Motor No' },
  { key: 'sase_no', label: 'Şase No' },
];

function parsedToForm(p: ParsedCustomer): FormState {
  const dogum = p.dogumTarihi
    ? `${p.dogumTarihi.split('.')[2]}-${p.dogumTarihi.split('.')[1]}-${p.dogumTarihi.split('.')[0]}`
    : '';
  return {
    tc_vergi_no: p.tcKimlikNo || '',
    ad_soyad_unvan: p.adSoyad || '',
    referans: p.referans || '',
    telefon: p.telefon || '',
    eposta: p.email || '',
    dogum_tarihi: dogum,
    uavt_adres_kodu: p.uavtAdresKodu || '',
    plaka_no: p.plakaNo || '',
    ruhsat_belge_no: p.ruhsatBelgeNo || '',
    arac_yili: p.aracYili || '',
    arac_markasi: p.aracMarkasi || '',
    arac_modeli: p.aracModeli || '',
    arac_kodu: p.aracKodu || '',
    arac_tipi: p.aracTipi || '',
    motor_no: p.motorNo || '',
    sase_no: p.saseNo || '',
  };
}

function parseExcelRow(row: Record<string, unknown>): FormState {
  const get = (keys: string[]) => {
    for (const k of keys) {
      const found = Object.keys(row).find(key => key.toLowerCase().trim() === k.toLowerCase());
      if (found && row[found] != null) return String(row[found]).trim();
    }
    return '';
  };
  return {
    ad_soyad_unvan: get(['ad soyad', 'ad_soyad', 'ad soyad unvan', 'ad_soyad_unvan', 'musteri adi', 'ad', 'isim']),
    tc_vergi_no: get(['tc', 'tc no', 'tc kimlik', 'tc_kimlik_no', 'tc kimlik no', 'tckn']),
    telefon: get(['telefon', 'phone', 'tel', 'gsm']),
    referans: get(['referans', 'ref']),
    eposta: get(['eposta', 'email', 'mail', 'e-posta']),
    dogum_tarihi: get(['dogum tarihi', 'dogum_tarihi', 'birthdate', 'dob']),
    uavt_adres_kodu: get(['uavt', 'uavt adres kodu', 'adres kodu']),
    plaka_no: get(['plaka', 'plaka no', 'plate']),
    arac_tipi: get(['arac tipi', 'tip', 'vehicle type']),
    arac_markasi: get(['marka', 'arac markasi', 'brand']),
    arac_modeli: get(['model', 'arac modeli']),
    arac_yili: get(['yil', 'arac yili', 'model yili', 'year']),
    arac_kodu: get(['arac kodu', 'kod', 'code']),
    ruhsat_belge_no: get(['ruhsat', 'ruhsat belge no', 'belge no']),
    motor_no: get(['motor no', 'motor', 'engine']),
    sase_no: get(['sase no', 'sase', 'sasi no', 'sasi', 'vin', 'chassis']),
  };
}

function isValidRecord(r: FormState): boolean {
  if (!r.ad_soyad_unvan.trim()) return false;
  if (!r.plaka_no.trim()) return false;
  if (r.tc_vergi_no.trim() && r.tc_vergi_no.trim().length !== 11) return false;
  return true;
}

function toPayload(r: FormState) {
  return {
    ad_soyad_unvan: r.ad_soyad_unvan.trim(),
    tc_vergi_no: r.tc_vergi_no.trim(),
    telefon: r.telefon.trim(),
    referans: r.referans.trim(),
    eposta: r.eposta.trim(),
    dogum_tarihi: r.dogum_tarihi.trim(),
    uavt_adres_kodu: r.uavt_adres_kodu.trim(),
    plaka_no: r.plaka_no.trim().toUpperCase(),
    ruhsat_belge_no: r.ruhsat_belge_no.trim(),
    arac_yili: r.arac_yili.trim(),
    arac_markasi: r.arac_markasi.trim(),
    arac_modeli: r.arac_modeli.trim(),
    arac_kodu: r.arac_kodu.trim(),
    arac_tipi: r.arac_tipi.trim(),
    motor_no: r.motor_no.trim(),
    sase_no: r.sase_no.trim(),
  };
}

type ImportReport = { total: number; added: number; skipped: number; duplicate: number; errors: string[] };

export function AutoRegistrationPage({ customers, refresh }: { customers: Customer[]; refresh: () => void }) {
  const [tab, setTab] = useState<'import' | 'list'>('import');
  const [rawText, setRawText] = useState('');
  const [parsedRows, setParsedRows] = useState<FormState[] | null>(null);
  const [importSource, setImportSource] = useState<'text' | 'excel' | null>(null);
  const [excelFileName, setExcelFileName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warn'>('success');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<Customer | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState | null>(null);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; active: boolean } | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function showToast(message: string, type: 'success' | 'error' | 'warn' = 'success') {
    setToast(message);
    setToastType(type);
    window.setTimeout(() => setToast(''), 5000);
  }

  function handleParseText() {
    if (!rawText.trim()) {
      showToast('Lütfen önce metni yapıştırın.', 'warn');
      return;
    }
    const parsed = parseBulkCustomerText(rawText);
    if (parsed.length === 0) {
      showToast('Metinden kayıt ayrıştırılamadı. Etiketleri kontrol edin.', 'warn');
      setParsedRows(null);
      return;
    }
    setParsedRows(parsed.map(parsedToForm));
    setImportSource('text');
    setReport(null);
    showToast(`${parsed.length} kayıt ayrıştırıldı. Toplu kaydetmek için hazır.`, 'success');
  }

  function loadSample() {
    setRawText(SAMPLE_TEXT);
    const parsed = parseBulkCustomerText(SAMPLE_TEXT);
    setParsedRows(parsed.map(parsedToForm));
    setImportSource('text');
    setReport(null);
    showToast(`${parsed.length} örnek kayıt yüklendi.`, 'success');
  }

  function handleFile(file: File) {
    setExcelFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
        const parsed = rows.map(parseExcelRow).filter(r => r.ad_soyad_unvan || r.plaka_no);
        if (parsed.length === 0) {
          showToast('Dosyada tanınan sütun bulunamadı.', 'warn');
          setParsedRows(null);
          return;
        }
        setParsedRows(parsed);
        setImportSource('excel');
        setReport(null);
        showToast(`${parsed.length} kayıt dosyadan okundu. Toplu kaydetmek için hazır.`, 'success');
      } catch {
        showToast('Dosya okunamadı. Excel veya CSV formatında olmalı.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function handleBulkSave() {
    if (!parsedRows || parsedRows.length === 0) return;
    const existingPlates = new Set(customers.map(c => c.plaka_no?.trim().toUpperCase()).filter(Boolean));

    const valid: FormState[] = [];
    const errors: string[] = [];
    let duplicate = 0;

    parsedRows.forEach((row, i) => {
      if (!isValidRecord(row)) {
        errors.push(`Satır ${i + 1}: ${row.ad_soyad_unvan || 'İsimsiz'} - Ad veya plaka eksik${row.tc_vergi_no && row.tc_vergi_no.length !== 11 ? ' / TC 11 haneli değil' : ''}`);
        return;
      }
      const plate = row.plaka_no.trim().toUpperCase();
      if (existingPlates.has(plate)) {
        duplicate++;
        errors.push(`Satır ${i + 1}: ${row.ad_soyad_unvan} - Plaka ${plate} zaten kayıtlı`);
        return;
      }
      existingPlates.add(plate);
      valid.push(row);
    });

    if (valid.length === 0) {
      showToast('Kaydedilecek geçerli kayıt yok.', 'warn');
      setReport({ total: parsedRows.length, added: 0, skipped: parsedRows.length - duplicate, duplicate, errors });
      return;
    }

    setSaving(true);
    setProgress({ current: 0, total: valid.length, active: true });
    setReport(null);

    const BATCH = 200;
    let added = 0;
    const failedErrors: string[] = [];

    for (let i = 0; i < valid.length; i += BATCH) {
      const batch = valid.slice(i, i + BATCH);
      const payload = batch.map(toPayload);
      const { error } = await supabase.from('customers').insert(payload);
      if (error) {
        for (const r of batch) {
          const { error: singleError } = await supabase.from('customers').insert(toPayload(r));
          if (singleError) failedErrors.push(`${r.ad_soyad_unvan} (${r.plaka_no}): ${singleError.message}`);
          else added++;
          setProgress({ current: added + failedErrors.length, total: valid.length, active: true });
        }
      } else {
        added += batch.length;
        setProgress({ current: Math.min(added + failedErrors.length, valid.length), total: valid.length, active: true });
      }
    }

    setProgress({ current: valid.length, total: valid.length, active: false });
    setSaving(false);

    const skipped = parsedRows.length - added - duplicate - failedErrors.length;
    const finalReport: ImportReport = {
      total: parsedRows.length,
      added,
      skipped: skipped > 0 ? skipped : 0,
      duplicate,
      errors: [...errors, ...failedErrors],
    };
    setReport(finalReport);

    if (added > 0) {
      showToast(`${added} kayıt başarıyla eklendi!${duplicate > 0 || failedErrors.length > 0 ? ` ${duplicate + failedErrors.length} kayıt atlandı.` : ''}`, 'success');
      refresh();
    } else {
      showToast('Hiç kayıt eklenemedi. Hataları kontrol edin.', 'error');
    }
  }

  function resetImport() {
    setParsedRows(null);
    setImportSource(null);
    setRawText('');
    setExcelFileName('');
    setReport(null);
    setProgress(null);
  }

  function handleEdit(c: Customer) {
    setEditForm({
      tc_vergi_no: c.tc_vergi_no || '', ad_soyad_unvan: c.ad_soyad_unvan || '', referans: c.referans || '',
      telefon: c.telefon || '', eposta: c.eposta || '', dogum_tarihi: c.dogum_tarihi || '',
      uavt_adres_kodu: c.uavt_adres_kodu || '', plaka_no: c.plaka_no || '', ruhsat_belge_no: c.ruhsat_belge_no || '',
      arac_yili: c.arac_yili || '', arac_markasi: c.arac_markasi || '', arac_modeli: c.arac_modeli || '',
      arac_kodu: c.arac_kodu || '', arac_tipi: c.arac_tipi || '', motor_no: c.motor_no || '', sase_no: c.sase_no || '',
    });
    setEditingId(c.id);
    setEditErrors({});
    setDetail(null);
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm || !editingId) return;
    const errs: Record<string, string> = {};
    if (!editForm.ad_soyad_unvan.trim()) errs.ad_soyad_unvan = 'Ad Soyad zorunludur.';
    if (!editForm.plaka_no.trim()) errs.plaka_no = 'Plaka zorunludur.';
    if (editForm.tc_vergi_no.trim() && editForm.tc_vergi_no.trim().length !== 11) errs.tc_vergi_no = 'TC 11 haneli olmalıdır.';
    setEditErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    const payload = toPayload(editForm);
    const { error } = await supabase.from('customers').update(payload).eq('id', editingId);
    setSaving(false);
    if (error) { showToast('Güncelleme başarısız.', 'error'); return; }
    showToast('Kayıt güncellendi.', 'success');
    setEditForm(null);
    setEditingId(null);
    refresh();
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) showToast('Silme işlemi başarısız.', 'error');
    else { showToast('Kayıt silindi.', 'success'); refresh(); }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(customers, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'musteri-araclari.json'; a.click();
    URL.revokeObjectURL(url);
  }

  function exportExcel() {
    const rows = filtered.map(c => ({
      'Ad Soyad': c.ad_soyad_unvan, 'TC Kimlik No': c.tc_vergi_no, 'Telefon': c.telefon,
      'Referans': c.referans, 'Doğum Tarihi': c.dogum_tarihi, 'UAVT': c.uavt_adres_kodu,
      'Plaka': c.plaka_no, 'Araç Tipi': c.arac_tipi, 'Marka': c.arac_markasi, 'Model': c.arac_modeli,
      'Yıl': c.arac_yili, 'Araç Kodu': c.arac_kodu, 'Ruhsat No': c.ruhsat_belge_no,
      'Motor No': c.motor_no, 'Şase No': c.sase_no,
    }));
    exportToExcel(rows, 'musteri-araclari.xlsx');
  }

  const filtered = customers.filter(c => !search ||
    `${c.ad_soyad_unvan} ${c.tc_vergi_no} ${c.telefon} ${c.plaka_no} ${c.arac_markasi} ${c.arac_modeli}`
      .toLowerCase().includes(search.toLowerCase()));

  const validCount = parsedRows?.filter(isValidRecord).length ?? 0;
  const invalidCount = (parsedRows?.length ?? 0) - validCount;
  const progressPct = progress ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Toplu Otomatik Kayıt</h2>
          <p className="text-sm text-slate-500 mt-1">Yüzlerce müşteri ve araç verisini metin veya Excel'den tek seferde, onay beklemeden veritabanına yükleyin.</p>
        </div>
      </div>

      <div className="flex gap-2 mb-5">
        <button onClick={() => setTab('import')} className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition flex items-center gap-2 ${tab === 'import' ? 'bg-teal-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
          <Zap size={16} /> Toplu Kayıt
        </button>
        <button onClick={() => setTab('list')} className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition flex items-center gap-2 ${tab === 'list' ? 'bg-teal-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
          <UserPlus size={16} /> Kayıtlı Liste ({customers.length})
        </button>
      </div>

      {tab === 'import' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {/* Bulk Text Parser */}
            <div className="card overflow-hidden">
              <div className="teal-strip">
                <span className="flex items-center gap-2"><ClipboardPaste size={16} /> Toplu Metin Ayrıştırma</span>
                <button onClick={loadSample} className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5">
                  <Sparkles size={13} /> Örnek Metin
                </button>
              </div>
              <div className="p-5">
                <textarea
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  placeholder={"50, 100 veya daha fazla müşteri/araç verisini buraya yapıştırın.\n\nHer blok '---' çizgisiyle veya boş satırla ayrılmalı.\n\nÖrnek blok formatı:\nAHMET YILMAZ - müşteri adı soyadı\n05321234567 - telefon numarası\n12345678901 - Tc Kimlik No\n34ABC123 - Plaka No\n---\n(Müteakip bloklar...)"}
                  rows={14}
                  className="w-full p-3 rounded-lg border border-slate-200 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button onClick={handleParseText} disabled={!rawText.trim() || saving} className="btn-primary w-full mt-3 flex items-center justify-center gap-2">
                  <Sparkles size={16} /> Metni Ayrıştır ve Hazırla
                </button>
              </div>
            </div>

            {/* Excel/CSV Upload */}
            <div className="card overflow-hidden">
              <div className="teal-strip">
                <span className="flex items-center gap-2"><FileSpreadsheet size={16} /> Excel / CSV Toplu Yükleme</span>
              </div>
              <div className="p-5">
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${dragOver ? 'border-teal-500 bg-teal-50' : 'border-slate-300 hover:border-teal-400 hover:bg-slate-50'}`}
                >
                  <Upload size={32} className="mx-auto text-slate-400 mb-3" />
                  <p className="text-sm font-semibold text-slate-700">Dosya sürükleyin veya tıklayarak seçin</p>
                  <p className="text-xs text-slate-400 mt-1">.xlsx veya .csv — tüm satırlar otomatik okunur</p>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.csv,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                </div>
                {excelFileName && (
                  <div className="mt-3 p-3 rounded-lg bg-slate-50 flex items-center justify-between">
                    <span className="text-sm text-slate-600 truncate">{excelFileName}</span>
                    {parsedRows && importSource === 'excel' && <span className="text-xs font-semibold text-teal-700">{parsedRows.length} kayıt</span>}
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                  Desteklenen sütun başlıkları: Ad Soyad, TC Kimlik No, Telefon, Referans, Doğum Tarihi, Plaka, Araç Tipi, Marka, Model, Yıl, Araç Kodu, Ruhsat No, Motor No, Şase No. Dosya yüklendiği an tüm satırlar ayrıştırılır.
                </p>
              </div>
            </div>
          </div>

          {/* Preview & Bulk Action */}
          {parsedRows && parsedRows.length > 0 && (
            <div className="card overflow-hidden">
              <div className="teal-strip">
                <span className="flex items-center gap-2"><CheckCircle2 size={16} /> Ayrıştırma Özeti — {parsedRows.length} kayıt bulundu</span>
                <button onClick={resetImport} className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition flex items-center gap-1">
                  <X size={13} /> Temizle
                </button>
              </div>
              <div className="p-5">
                <div className="flex flex-wrap gap-3 mb-4">
                  <span className="px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 text-sm font-semibold">{validCount} geçerli</span>
                  {invalidCount > 0 && <span className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-sm font-semibold">{invalidCount} eksik/hatalı</span>}
                  <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-sm">Kaynak: {importSource === 'text' ? 'Metin' : 'Excel/CSV'}</span>
                </div>

                {/* Progress Bar */}
                {progress && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-semibold text-slate-700 flex items-center gap-2">
                        {progress.active ? <Loader2 size={15} className="animate-spin text-teal-600" /> : <CheckCircle2 size={15} className="text-teal-600" />}
                        {progress.active ? 'Kaydediliyor...' : 'Tamamlandı'}
                      </span>
                      <span className="text-slate-500 font-mono">%{progressPct} ({progress.current}/{progress.total})</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${progress.active ? 'bg-teal-500' : 'bg-teal-600'}`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Report */}
                {report && (
                  <div className={`rounded-xl p-4 mb-4 ${report.added > 0 ? 'bg-teal-50 border border-teal-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-start gap-3">
                      {report.added > 0 ? <CheckCircle2 size={20} className="text-teal-600 mt-0.5" /> : <AlertTriangle size={20} className="text-red-600 mt-0.5" />}
                      <div className="flex-1">
                        <p className="font-bold text-slate-800 text-sm">
                          {report.added} kayıt eklendi, {report.skipped + report.duplicate + (report.errors.length - report.duplicate)} kayıt atlandı
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          Toplam: {report.total} · Başarılı: {report.added} · Duplike: {report.duplicate} · Hatalı: {report.errors.length - report.duplicate}
                        </p>
                        {report.errors.length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs font-semibold text-slate-600 cursor-pointer hover:text-slate-800">Atlanan kayıtlar ({report.errors.length})</summary>
                            <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                              {report.errors.map((err, i) => (
                                <li key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                                  <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {err}
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Preview Table */}
                <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 mb-4">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">#</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Ad Soyad</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Plaka</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Marka</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Model</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map((row, i) => {
                        const valid = isValidRecord(row);
                        return (
                          <tr key={i} className="border-b border-slate-100 last:border-0">
                            <td className="px-3 py-2 text-xs text-slate-400">{i + 1}</td>
                            <td className="px-3 py-2 font-medium text-slate-700">{row.ad_soyad_unvan || '--'}</td>
                            <td className="px-3 py-2 font-mono text-xs">{row.plaka_no || '--'}</td>
                            <td className="px-3 py-2 text-slate-600">{row.arac_markasi || '--'}</td>
                            <td className="px-3 py-2 text-slate-600">{row.arac_modeli || '--'}</td>
                            <td className="px-3 py-2">
                              {valid
                                ? <span className="text-xs text-teal-700 font-semibold">Geçerli</span>
                                : <span className="text-xs text-amber-600 font-semibold">Eksik</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <button onClick={handleBulkSave} disabled={saving || validCount === 0} className="btn-primary w-full flex items-center justify-center gap-2 text-base py-3">
                  {saving ? <><Loader2 size={18} className="animate-spin" /> Kaydediliyor...</> : <><Zap size={18} /> Toplu Kaydet — {validCount} kayıt</>}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'list' && (
        <div className="card overflow-hidden">
          <div className="teal-strip">
            <span>Müşteri ve Araç Listesi ({filtered.length})</span>
            <div className="flex gap-2">
              <button onClick={exportJson} className="flex items-center gap-1.5"><FileText size={14} /> JSON</button>
              <button onClick={exportExcel} className="flex items-center gap-1.5"><FileSpreadsheet size={14} /> Excel</button>
              <button onClick={() => exportToCsv(filtered.map(c => ({ 'Ad Soyad': c.ad_soyad_unvan, 'TC': c.tc_vergi_no, 'Telefon': c.telefon, 'Plaka': c.plaka_no, 'Marka': c.arac_markasi, 'Model': c.arac_modeli })), 'musteri-araclari.csv')} className="flex items-center gap-1.5"><Download size={14} /> CSV</button>
            </div>
          </div>
          <div className="p-4 border-b border-slate-100">
            <div className="search max-w-md">
              <Search size={16} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ad, plaka, telefon, marka ara..." />
              {search && <button type="button" onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-700"><X size={16} /></button>}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Ad Soyad</th><th>Telefon</th><th>Plaka</th><th>Marka</th><th>Model</th><th>Yıl</th><th>Tip</th><th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length ? filtered.map(c => (
                  <tr key={c.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setDetail(c)}>
                    <td className="font-semibold text-slate-800">{c.ad_soyad_unvan}</td>
                    <td>{c.telefon || '--'}</td>
                    <td className="font-mono text-xs">{c.plaka_no || '--'}</td>
                    <td>{c.arac_markasi || '--'}</td>
                    <td>{c.arac_modeli || '--'}</td>
                    <td>{c.arac_yili || '--'}</td>
                    <td>{c.arac_tipi || '--'}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button className="icon-btn" onClick={() => setDetail(c)} title="Detay"><Eye size={15} /></button>
                        <button className="icon-btn" onClick={() => handleEdit(c)} title="Düzenle"><Pencil size={15} /></button>
                        <button className="icon-btn danger" onClick={() => handleDelete(c.id)} title="Sil"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                )) : <tr><td colSpan={8} className="empty">Henüz kayıt bulunmuyor.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detail && (
        <div className="modal-backdrop" onClick={() => setDetail(null)}>
          <div className="modal" style={{ width: 'min(100%, 600px)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Müşteri ve Araç Detayları</h3>
              <button className="icon-btn" onClick={() => setDetail(null)}><X size={18} /></button>
            </div>
            <div className="mb-4">
              <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><UserPlus size={15} className="text-teal-600" /> Müşteri Bilgileri</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {customerFields.map(({ key, label }) => (
                  <div key={key} className="p-3 rounded-lg bg-slate-50">
                    <p className="text-xs text-slate-500 font-semibold">{label}</p>
                    <p className="font-medium text-slate-800 mt-1 break-words">{(detail[key as keyof Customer] as string) || '--'}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mb-5">
              <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><Truck size={15} className="text-teal-600" /> Araç Bilgileri</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {vehicleFields.map(({ key, label }) => (
                  <div key={key} className="p-3 rounded-lg bg-slate-50">
                    <p className="text-xs text-slate-500 font-semibold">{label}</p>
                    <p className="font-medium text-slate-800 mt-1 break-words">{(detail[key as keyof Customer] as string) || '--'}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary flex items-center gap-2" onClick={() => handleEdit(detail)}><Pencil size={15} /> Düzenle</button>
              <button className="btn-secondary" onClick={() => setDetail(null)}>Kapat</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editForm && editingId && (
        <div className="modal-backdrop" onClick={() => { setEditForm(null); setEditingId(null); }}>
          <form className="modal" style={{ width: 'min(100%, 640px)' }} onClick={e => e.stopPropagation()} onSubmit={handleEditSave}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Kaydı Düzenle</h3>
              <button type="button" className="icon-btn" onClick={() => { setEditForm(null); setEditingId(null); }}><X size={18} /></button>
            </div>
            <div className="mb-4">
              <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><UserPlus size={15} className="text-teal-600" /> Müşteri Bilgileri</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {customerFields.map(({ key, label }) => (
                  <label key={key} className="field">
                    {label}
                    <input
                      type={key === 'dogum_tarihi' ? 'date' : 'text'}
                      value={editForm[key]}
                      onChange={e => { setEditForm(v => v ? { ...v, [key]: e.target.value } : v); setEditErrors(prev => ({ ...prev, [key]: '' })); }}
                      className={editErrors[key] ? 'border-red-400 ring-1 ring-red-400' : ''}
                    />
                    {editErrors[key] && <span className="text-xs text-red-500 mt-1 block">{editErrors[key]}</span>}
                  </label>
                ))}
              </div>
            </div>
            <div className="mb-5">
              <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><Truck size={15} className="text-teal-600" /> Araç Bilgileri</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {vehicleFields.map(({ key, label }) => (
                  <label key={key} className="field">
                    {label}
                    <input
                      type="text"
                      value={editForm[key]}
                      onChange={e => {
                        const val = key === 'plaka_no' ? e.target.value.toUpperCase() : e.target.value;
                        setEditForm(v => v ? { ...v, [key]: val } : v);
                        setEditErrors(prev => ({ ...prev, [key]: '' }));
                      }}
                      className={editErrors[key] ? 'border-red-400 ring-1 ring-red-400' : ''}
                    />
                    {editErrors[key] && <span className="text-xs text-red-500 mt-1 block">{editErrors[key]}</span>}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => { setEditForm(null); setEditingId(null); }}>Vazgeç</button>
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Kaydet
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-[75] rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-xl animate-fade-in flex items-center gap-2 ${toastType === 'error' ? 'bg-red-600' : toastType === 'warn' ? 'bg-amber-600' : 'bg-teal-700'}`}>
          {toastType === 'error' ? <AlertTriangle size={18} /> : toastType === 'warn' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          {toast}
        </div>
      )}
    </div>
  );
}
