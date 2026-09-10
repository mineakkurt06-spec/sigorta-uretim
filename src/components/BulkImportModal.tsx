import { useState, type FormEvent } from 'react';
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertTriangle, Loader2, Building2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import type { Policy } from '@/lib/types';

type Agency = { id: string; name: string; is_external?: boolean };

type Props = {
  open: boolean;
  onClose: () => void;
  existingPolicies: Policy[];
  onDone: () => void;
  agencies: Agency[];
  defaultAgencyId?: string | null;
};

type PreviewRow = {
  sigorta_sirketi: string;
  musteri_adi: string;
  police_no: string;
  plaka: string;
  net_prim: number;
  brut_prim: number;
  sigorta_turu: string;
  bitis_tarihi: string;
  duplicate: boolean;
};

const FIELD_ALIASES: Record<string, string[]> = {
  sigorta_sirketi: ['SİGORTA ADI', 'SIGORTA ADI', 'SİGORTA ŞİRKETİ', 'SIGORTA SIRKETI', 'ŞİRKET', 'SIRKET', 'sigorta adı', 'sigorta sirketi'],
  musteri_adi: ['ADI', 'AD SOYAD', 'MÜŞTERİ ADI', 'MUSTERI ADI', 'AD SOYAD / ÜNVAN', 'ÜNVAN', 'UNVAN', 'adi'],
  police_no: ['POLİÇE NO', 'POLICE NO', 'POLİÇE', 'POLICE', 'poliçe no', 'police no'],
  plaka: ['PLAKA', 'ARAÇ PLAKA', 'ARAC PLAKA', 'plaka'],
  net_prim: ['NET PRİM', 'NET PRIM', 'NET', 'net prim', 'net'],
  brut_prim: ['BRÜT PRİM', 'BRUT PRIM', 'BRÜT', 'BRUT', 'brüt prim', 'brut prim'],
  sigorta_turu: ['ÜRÜN', 'URUN', 'SİGORTA TÜRÜ', 'SIGORTA TURU', 'TÜR', 'TUR', 'ürün', 'sigorta türü'],
  bitis_tarihi: ['B.T: TARİHİ', 'B.T: TARIHI', 'BİTİŞ TARİHİ', 'BITIS TARIHI', 'BİTİŞ', 'BITIS', 'B.T. TARİHİ', 'B.T. TARIHI', 'bitiş tarihi', 'b.t: tarihi'],
};

const normalizeHeader = (s: string) =>
  s.toString().trim()
    .replace(/İ/g, 'I').replace(/ı/g, 'i')
    .replace(/Ş/g, 'S').replace(/ş/g, 's')
    .replace(/Ğ/g, 'G').replace(/ğ/g, 'g')
    .replace(/Ç/g, 'C').replace(/ç/g, 'c')
    .replace(/Ü/g, 'U').replace(/ü/g, 'u')
    .replace(/Ö/g, 'O').replace(/ö/g, 'o')
    .toUpperCase()
    .replace(/\s+/g, ' ');

const parseAmount = (value: unknown): number => {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') return value;
  const text = String(value).trim().replace(/\s/g, '');
  if (!text) return 0;
  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    return Number(lastComma > lastDot
      ? text.replace(/\./g, '').replace(',', '.')
      : text.replace(/,/g, ''));
  }
  if (lastComma >= 0) return Number(text.replace(',', '.'));
  return Number(text);
};

const parseExcelDate = (val: unknown): string | null => {
  if (!val || val.toString().trim() === '') return null;
  if (typeof val === 'number') {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + val * 86400000);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  const str = val instanceof Date ? val.toISOString() : val.toString().trim();
  if (str.includes('.')) {
    const parts = str.split('.');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      return `${y.padStart(4, '20')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  const tr = str.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (tr) return `${tr[3]}-${tr[2].padStart(2, '0')}-${tr[1].padStart(2, '0')}`;
  const date = new Date(str);
  return isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

const mapRow = (row: Record<string, unknown>, headerMap: Record<string, string>): Partial<PreviewRow> & { duplicate: boolean } => {
  const get = (field: string) => {
    const key = headerMap[field];
    return key ? row[key] : undefined;
  };
  return {
    sigorta_sirketi: String(get('sigorta_sirketi') ?? '').trim(),
    musteri_adi: String(get('musteri_adi') ?? '').trim(),
    police_no: String(get('police_no') ?? '').trim(),
    plaka: String(get('plaka') ?? '').trim().toUpperCase(),
    net_prim: parseAmount(get('net_prim')),
    brut_prim: parseAmount(get('brut_prim')),
    sigorta_turu: String(get('sigorta_turu') ?? '').trim(),
    bitis_tarihi: parseExcelDate(get('bitis_tarihi')) || '',
    duplicate: false,
  };
};

export function BulkImportModal({ open, onClose, existingPolicies, onDone, agencies, defaultAgencyId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [stage, setStage] = useState<'select' | 'preview' | 'importing' | 'done'>('select');
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>(defaultAgencyId || '');

  if (!open) return null;

  const existingPolicyNos = new Set(
    existingPolicies
      .map(p => p.police_no?.toString().trim().toLowerCase())
      .filter(Boolean)
  );

  function reset() {
    setFile(null);
    setPreview([]);
    setStage('select');
    setError('');
    setResult(null);
    setSelectedAgencyId(defaultAgencyId || '');
  }

  function close() {
    reset();
    onClose();
  }

  async function handleFile(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError('');
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      if (!rawRows.length) {
        setError('Dosyada veri bulunamadı.');
        return;
      }
      const headers = Object.keys(rawRows[0]);
      const headerMap: Record<string, string> = {};
      for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
        const normAliases = aliases.map(normalizeHeader);
        const match = headers.find(h => normAliases.includes(normalizeHeader(h)));
        if (match) headerMap[field] = match;
      }
      if (!headerMap.police_no) {
        setError('Poliçe No kolonu bulunamadı. Lütfen dosyanın "POLİÇE NO" kolonu içerdiğinden emin olun.');
        return;
      }
      const mapped = rawRows.map(r => mapRow(r, headerMap));
      const seen = new Set<string>();
      const rows: PreviewRow[] = mapped.map(r => {
        const raw = r.police_no?.trim() ?? '';
        const no = raw.toLowerCase();
        const isEmpty = !raw;
        const isDup = !isEmpty && (existingPolicyNos.has(no) || seen.has(no));
        if (!isEmpty) seen.add(no);
        return { ...r, duplicate: isDup } as PreviewRow;
      }).filter(r => r.police_no?.trim());
      if (!rows.length) {
        setError('Geçerli poliçe numarası olan satır bulunamadı.');
        return;
      }
      setPreview(rows);
      setStage('preview');
    } catch {
      setError('Dosya okunamadı. Lütfen geçerli bir Excel veya CSV dosyası seçin.');
    }
  }

  async function confirmImport() {
    const toInsert = preview.filter(r => !r.duplicate);
    setSubmitting(true);
    setStage('importing');
    const today = new Date().toISOString().slice(0, 10);
    const toNum = (val: number | string): number => Number(String(val).replace(',', '.'));
    const dateMinus365 = (dateStr: string | null): string | null => {
      if (!dateStr) return null;
      const d = new Date(`${dateStr}T00:00:00`);
      if (isNaN(d.getTime())) return null;
      d.setDate(d.getDate() - 365);
      return d.toISOString().slice(0, 10);
    };
    const batch = toInsert.map(r => {
      const bitis = parseExcelDate(r.bitis_tarihi);
      return {
      record_type: 'uretim',
      sigorta_sirketi: r.sigorta_sirketi,
      musteri_adi: r.musteri_adi,
      police_no: r.police_no,
      plaka: r.plaka,
      net_prim: toNum(r.net_prim),
      brut_prim: toNum(r.brut_prim),
      bitis_tarihi: bitis,
      baslangic_tarihi: dateMinus365(bitis),
      tanzim_tarihi: bitis || today,
      sigorta_turu: r.sigorta_turu,
      agency_id: selectedAgencyId || null,
      uretim_tipi: 'ic',
      odeme_durumu: 'verdi',
      payment_method: 'Nakit',
      aciklama: null,
      iptal: false,
      file_url: null,
      file_name: null,
    };});
    const res = await supabase.from('policies').insert(batch);
    setSubmitting(false);
    if (res.error) {
      console.error('Supabase insert error:', res.error);
      alert('Hata: ' + res.error.message);
      setStage('preview');
      return;
    }
    setResult({ added: batch.length, skipped: preview.length - batch.length });
    setStage('done');
    onDone();
  }

  const newCount = preview.filter(r => !r.duplicate).length;
  const dupCount = preview.length - newCount;

  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal" style={{ width: 'min(100%, 680px)', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-lg">Excel/CSV'den Toplu Poliçe Aktarma</h3>
          <button type="button" onClick={close}><X size={19} /></button>
        </div>

        {stage === 'select' && (
          <form onSubmit={handleFile}>
            <label className="field mb-4">
              <span className="flex items-center gap-1.5"><Building2 size={14} /> Acente Seçin</span>
              <select
                value={selectedAgencyId}
                onChange={e => setSelectedAgencyId(e.target.value)}
                className="dark-select"
                required
              >
                <option value="">Acente seçiniz...</option>
                {agencies.filter(a => !a.is_external).map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <span className="text-[11px] font-normal text-slate-400">Poliçeler seçtiğiniz acenteye atanacaktır.</span>
            </label>
            <p className="text-sm text-slate-500 mb-4">
              Excel veya CSV dosyanızı yükleyin. Aşağıdaki kolon başlıkları otomatik tanınacaktır:
            </p>
            <div className="bg-slate-50 rounded-lg p-4 mb-4 text-xs text-slate-600 grid grid-cols-2 gap-1">
              <span><strong>SİGORTA ADI</strong> → Sigorta Şirketi</span>
              <span><strong>ADI</strong> → Müşteri Adı</span>
              <span><strong>POLİÇE NO</strong> → Poliçe No</span>
              <span><strong>NET PRİM</strong> → Net Prim</span>
              <span><strong>BRÜT PRİM</strong> → Brüt Prim</span>
              <span><strong>PLAKA</strong> → Plaka</span>
              <span><strong>ÜRÜN</strong> → Sigorta Türü</span>
              <span><strong>B.T: TARİHİ</strong> → Bitiş Tarihi</span>
            </div>
            <label className="btn-secondary cursor-pointer inline-flex items-center gap-2">
              <Upload size={16} /> Dosya Seç
              <input name="file" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
            </label>
            {file && <p className="text-xs text-slate-500 mt-3">Seçilen dosya: {file.name}</p>}
            {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3 mt-3">{error}</div>}
            <div className="flex justify-end gap-3 mt-5">
              <button type="button" onClick={close} className="btn-secondary">Vazgeç</button>
              <button type="submit" disabled={!file || !selectedAgencyId} className="btn-primary">Dosyayı Oku</button>
            </div>
          </form>
        )}

        {stage === 'preview' && (
          <div>
            <div className="flex flex-wrap gap-3 mb-4 text-sm">
              <span className="px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 font-semibold">{newCount} yeni poliçe</span>
              <span className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 font-semibold">{dupCount} mükerrer (atlanacak)</span>
            </div>
            <div className="overflow-x-auto max-h-72 border border-slate-200 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    <th className="text-left p-2">Durum</th>
                    <th className="text-left p-2">Sigorta</th>
                    <th className="text-left p-2">Müşteri</th>
                    <th className="text-left p-2">Poliçe No</th>
                    <th className="text-left p-2">Net</th>
                    <th className="text-left p-2">Brüt</th>
                    <th className="text-left p-2">Bitiş</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={i} className={r.duplicate ? 'bg-amber-50' : ''}>
                      <td className="p-2">{r.duplicate ? <span className="text-amber-600 font-semibold">Mükerrer</span> : <span className="text-teal-600 font-semibold">Yeni</span>}</td>
                      <td className="p-2">{r.sigorta_sirketi || '--'}</td>
                      <td className="p-2">{r.musteri_adi || '--'}</td>
                      <td className="p-2 font-mono">{r.police_no}</td>
                      <td className="p-2">{r.net_prim}</td>
                      <td className="p-2">{r.brut_prim}</td>
                      <td className="p-2">{r.bitis_tarihi || '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button type="button" onClick={reset} className="btn-secondary">Geri</button>
              <button type="button" onClick={confirmImport} disabled={newCount === 0 || submitting} className="btn-primary">
                {submitting ? 'Yükleniyor...' : `${newCount} Poliçeyi İçe Aktar`}
              </button>
            </div>
          </div>
        )}

        {stage === 'importing' && (
          <div className="flex flex-col items-center py-10">
            <Loader2 size={32} className="animate-spin text-teal-600 mb-3" />
            <p className="text-sm text-slate-600">Poliçeler içe aktarılıyor...</p>
          </div>
        )}

        {stage === 'done' && result && (
          <div className="text-center py-6">
            <div className="mx-auto size-14 rounded-full bg-teal-100 flex items-center justify-center mb-4">
              <CheckCircle2 size={28} className="text-teal-600" />
            </div>
            <h4 className="font-bold text-lg text-slate-900">İçe Aktarma Tamamlandı</h4>
            <p className="text-sm text-slate-600 mt-2">
              <strong className="text-teal-700">{result.added}</strong> adet yeni poliçe eklendi,
              {' '}<strong className="text-amber-700">{result.skipped}</strong> adet mükerrer poliçe atlandı.
            </p>
            {result.added === 0 && (
              <p className="text-xs text-amber-600 mt-2 flex items-center justify-center gap-1">
                <AlertTriangle size={14} /> Tüm satırlar daha önce kayıtlı olduğu için eklenmedi.
              </p>
            )}
            <button type="button" onClick={close} className="btn-primary mt-5">Kapat</button>
          </div>
        )}
      </div>
    </div>
  );
}
