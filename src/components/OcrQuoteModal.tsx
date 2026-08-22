import { useState, useRef, useCallback, useEffect } from 'react';
import { Scan, X, Upload, Loader2, CheckCircle2, AlertTriangle, Zap, Image as ImageIcon } from 'lucide-react';
import * as Tesseract from 'tesseract.js';
import type { InsuranceCompany, Agency } from '@/lib/types';

export type OcrQuoteItem = { company_name: string; premium_amount: string; agency_id: string };

const KNOWN_COMPANY_ALIASES: Record<string, string[]> = {
  'Hepiyi': ['hepiyi', 'hep iyi', 'hep_iyi'],
  'Doğa': ['doğa', 'doga', 'doğa sigorta'],
  'Sompo': ['sompo', 'sompo sigorta'],
  'Ak': ['ak sigorta', 'ak'],
  'Mapfre': ['mapfre', 'mapfre sigorta'],
  'Axa': ['axa', 'axa sigorta'],
  'Anadolu': ['anadolu', 'anadolu sigorta'],
  'Quick': ['quick', 'quick sigorta'],
  'Referans': ['referans', 'referans sigorta'],
  'HDI': ['hdi', 'hdi sigorta'],
  'Türkiye': ['türkiye', 'turkiye', 'türkiye sigorta', 'turkiye sigorta'],
  'TürkNippon': ['türknippon', 'turknippon', 'türk nippon', 'turk nippon'],
  'Koru': ['koru', 'koru sigorta'],
  'Allianz': ['allianz', 'allianz sigorta'],
  'Zurich': ['zurich', 'zurich sigorta'],
  'Sigortam': ['sigortam', 'sigortam.net'],
  'Ray': ['ray', 'ray sigorta'],
  'Türkiye Sigorta': ['türkiye sigorta', 'turkiye sigorta'],
  'Ethica': ['ethica', 'ethica sigorta'],
  'Bereket': ['bereket', 'bereket sigorta'],
};

function normalize(s: string): string {
  return s
    .replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U').replace(/Ö/g, 'O').replace(/Ç/g, 'C')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .toLowerCase().trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function matchCompany(rawName: string, companies: InsuranceCompany[]): string {
  const normalized = normalize(rawName);
  if (!normalized) return '';

  for (const [canonical, aliases] of Object.entries(KNOWN_COMPANY_ALIASES)) {
    for (const alias of aliases) {
      if (normalized.includes(normalize(alias))) {
        const match = companies.find(c => normalize(c.name) === normalize(canonical) || normalize(c.name).includes(normalize(canonical)));
        if (match) return match.name;
      }
    }
  }

  for (const c of companies) {
    const cn = normalize(c.name);
    if (cn.length >= 3 && normalized.includes(cn)) return c.name;
  }

  let bestMatch = '';
  let bestScore = Infinity;
  for (const c of companies) {
    const cn = normalize(c.name);
    if (cn.length < 2) continue;
    const dist = levenshtein(normalized, cn);
    const score = dist / Math.max(normalized.length, cn.length);
    if (score < bestScore && score < 0.4) {
      bestScore = score;
      bestMatch = c.name;
    }
  }
  return bestMatch;
}

function parseAmount(raw: string): string {
  const cleaned = raw.replace(/[^\d.,]/g, '');
  if (!cleaned) return '';
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  const decimalIndex = Math.max(lastComma, lastDot);
  const decimalDigits = decimalIndex >= 0 ? cleaned.length - decimalIndex - 1 : 0;
  const normalized = decimalDigits === 1 || decimalDigits === 2
    ? `${cleaned.slice(0, decimalIndex).replace(/[.,]/g, '')}.${cleaned.slice(decimalIndex + 1)}`
    : cleaned.replace(/[.,]/g, '');
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? amount.toFixed(decimalDigits === 1 || decimalDigits === 2 ? 2 : 0) : '';
}

type ParsedLine = { company: string; amount: string; rawCompany: string; rawAmount: string };

function parseOcrText(text: string, companies: InsuranceCompany[]): ParsedLine[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const results: ParsedLine[] = [];
  const amountPattern = /((?:\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,]\d{1,2})?)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const amountMatch = line.match(amountPattern);
    if (!amountMatch) continue;

    const amountStr = amountMatch[1];
    const amount = parseAmount(amountStr);
    if (!amount || Number(amount) <= 0) continue;

    let companyPart = line.replace(amountMatch[0], '').trim();
    companyPart = companyPart.replace(/[:\-|]/g, ' ').replace(/\s+/g, ' ').trim();

    if (!companyPart && i > 0) {
      const prevLine = lines[i - 1];
      const prevAmount = prevLine.match(amountPattern);
      if (!prevAmount) companyPart = prevLine;
    }

    if (!companyPart) continue;

    const matched = matchCompany(companyPart, companies);
    results.push({
      company: matched,
      rawCompany: companyPart,
      rawAmount: amountStr,
      amount,
    });
  }

  const seen = new Set<string>();
  return results.filter(r => {
    const key = `${r.company || r.rawCompany}-${r.amount}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

type OcrModalProps = {
  open: boolean;
  onClose: () => void;
  companies: InsuranceCompany[];
  agencies: Agency[];
  onApply: (items: OcrQuoteItem[], agencyId: string) => void;
};

export function OcrQuoteModal({ open, onClose, companies, agencies, onApply }: OcrModalProps) {
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
  const [parsedLines, setParsedLines] = useState<ParsedLine[]>([]);
  const [selectedAgency, setSelectedAgency] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  const reset = useCallback(() => {
    setImage(null);
    setImageFile(null);
    setOcrProgress(0);
    setOcrStatus('idle');
    setParsedLines([]);
    setSelectedAgency('');
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const runOcr = useCallback(async (img: string) => {
    setOcrStatus('processing');
    setOcrProgress(0);
    setParsedLines([]);
    try {
      const result = await Tesseract.recognize(img, 'tur+eng', {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });
      const text = result.data.text;
      const parsed = parseOcrText(text, companies);
      setParsedLines(parsed);
      setOcrStatus('done');
    } catch {
      setOcrStatus('error');
    }
  }, [companies]);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = e.target?.result as string;
      setImage(img);
      runOcr(img);
    };
    reader.readAsDataURL(file);
  }, [runOcr]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  useEffect(() => {
    if (!open) return;
    const handlePaste = (e: ClipboardEvent) => {
      if (!open) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handleFile(file);
            break;
          }
        }
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [open, handleFile]);

  const handleApply = () => {
    const items: OcrQuoteItem[] = parsedLines.map(r => ({
      company_name: r.company,
      premium_amount: r.amount,
      agency_id: selectedAgency,
    }));
    onApply(items, selectedAgency);
    handleClose();
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop" style={{ zIndex: 80 }} onClick={handleClose}>
      <div className="modal" style={{ width: 'min(100%, 720px)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2"><Scan size={20} className="text-teal-600" /> Ekran Görüntüsünden Teklif Okuma (OCR)</h3>
            <p className="text-xs text-slate-500 mt-1">Görüntüyü yükleyin veya yapıştırın — şirket adları ve tutarlar otomatik okunur.</p>
          </div>
          <button className="icon-btn" onClick={handleClose}><X size={20} /></button>
        </div>

        {!image && (
          <div
            ref={dropzoneRef}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition ${dragOver ? 'border-teal-500 bg-teal-50' : 'border-slate-300 hover:border-teal-400 hover:bg-slate-50'}`}
          >
            <ImageIcon size={40} className="mx-auto text-slate-400 mb-4" />
            <p className="text-sm font-semibold text-slate-700">Görüntüyü sürükleyin, tıklayın veya Ctrl+V ile yapıştırın</p>
            <p className="text-xs text-slate-400 mt-1">.png, .jpg, .jpeg — ekran görüntüsü teklif tablosunu yükleyin</p>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>
        )}

        {image && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
              <img src={image} alt="Yüklenen teklif" className="w-full max-h-64 object-contain" />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => fileInputRef.current?.click()} className="btn-secondary text-sm flex items-center gap-2"><Upload size={15} /> Değiştir</button>
              <button onClick={reset} className="btn-secondary text-sm">Temizle</button>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>
          </div>
        )}

        {ocrStatus === 'processing' && (
          <div className="mt-5 p-6 rounded-xl bg-teal-50 border border-teal-200 text-center">
            <Loader2 size={32} className="mx-auto text-teal-600 animate-spin mb-3" />
            <p className="text-sm font-semibold text-teal-700">Görüntü okunuyor... %{ocrProgress}</p>
            <div className="h-2 rounded-full bg-teal-200 overflow-hidden mt-3 max-w-xs mx-auto">
              <div className="h-full bg-teal-600 transition-all duration-300" style={{ width: `${ocrProgress}%` }} />
            </div>
          </div>
        )}

        {ocrStatus === 'error' && (
          <div className="mt-5 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
            <AlertTriangle size={20} className="text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Görüntü okunamadı.</p>
              <p className="text-xs text-red-600 mt-1">Lütfen daha net bir ekran görüntüsü deneyin.</p>
            </div>
          </div>
        )}

        {ocrStatus === 'done' && parsedLines.length > 0 && (
          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-teal-700">
              <CheckCircle2 size={18} /> {parsedLines.length} teklif bulundu
            </div>
            <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">#</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Okunan Şirket</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Eşleşen</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedLines.map((line, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2 text-xs text-slate-400">{i + 1}</td>
                      <td className="px-3 py-2 text-xs text-slate-500 font-mono">{line.rawCompany}</td>
                      <td className="px-3 py-2">
                        {line.company
                          ? <span className="text-xs font-semibold text-teal-700">{line.company}</span>
                          : <span className="text-xs text-amber-600 font-semibold">Eşleşmedi</span>}
                      </td>
                      <td className="px-3 py-2 font-mono text-sm font-semibold">{line.amount} ₺</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <label className="field">
              Teklifler hangi acenteye ait?
              <select value={selectedAgency} onChange={e => setSelectedAgency(e.target.value)}>
                <option value="">Acente seçin</option>
                {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>

            <button
              onClick={handleApply}
              disabled={!selectedAgency}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Zap size={18} /> {parsedLines.length} Teklifi Aktar
            </button>
          </div>
        )}

        {ocrStatus === 'done' && parsedLines.length === 0 && (
          <div className="mt-5 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-700">Hiç teklif bulunamadı.</p>
              <p className="text-xs text-amber-600 mt-1">Görüntüde şirket adı ve fiyat içeren satırlar net görünmüyor olabilir. Daha net bir görüntü deneyin.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
