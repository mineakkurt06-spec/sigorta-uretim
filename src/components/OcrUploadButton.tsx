import { useRef, useState, useCallback } from 'react';
import { FileScan, Loader2, AlertTriangle, RotateCcw, X, Info } from 'lucide-react';
import { extractPolicyData, getErrorMessage, type ExtractedPolicyData } from '@/lib/ocr/extractPolicyData';

function computeMissingFields(data: ExtractedPolicyData): string[] {
  const labels: Record<string, string> = {
    sigortaSirketi: 'Sigorta Şirketi',
    musteriAdi: 'Müşteri Adı',
    policeNo: 'Poliçe No',
    belgeSeriNo: 'Belge Seri No',
    plaka: 'Plaka',
    sigortaTuru: 'Sigorta Türü',
    bitisTarihi: 'Bitiş Tarihi',
    netPrim: 'Net Prim',
    brutPrim: 'Brüt Prim',
    acente: 'Acente',
  };
  const missing: string[] = [];
  (Object.keys(labels) as (keyof typeof labels)[]).forEach(key => {
    const val = data[key as keyof ExtractedPolicyData];
    if (val === null || val === undefined || val === '') missing.push(labels[key]);
  });
  return missing;
}

type OcrUploadButtonProps = {
  onExtracted: (data: ExtractedPolicyData, file: File) => void;
  companies: { name: string }[];
  agencies: { id: string; name: string }[];
};

function normalizeTr(s: string): string {
  return s
    .replace(/İ/g, 'I').replace(/ı/g, 'i').replace(/Ş/g, 'S').replace(/ş/g, 's')
    .replace(/Ğ/g, 'G').replace(/ğ/g, 'g').replace(/Ç/g, 'C').replace(/ç/g, 'c')
    .replace(/Ü/g, 'U').replace(/ü/g, 'u').replace(/Ö/g, 'O').replace(/ö/g, 'o')
    .replace(/\s+/g, ' ').trim().toLowerCase();
}

function matchCompany(rawName: string, companies: { name: string }[]): string {
  const norm = normalizeTr(rawName);
  if (!norm) return '';
  const exact = companies.find(c => normalizeTr(c.name) === norm);
  if (exact) return exact.name;
  const partial = companies.find(c => norm.includes(normalizeTr(c.name)) || normalizeTr(c.name).includes(norm));
  return partial?.name || rawName;
}

function matchAgency(rawName: string, agencies: { id: string; name: string }[]): string {
  const norm = normalizeTr(rawName);
  if (!norm) return '';
  const exact = agencies.find(a => normalizeTr(a.name) === norm);
  if (exact) return exact.id;
  const partial = agencies.find(a => norm.includes(normalizeTr(a.name)) || normalizeTr(a.name).includes(norm));
  return partial?.id || '';
}

type ErrorState = { title: string; detail: string } | null;

export function OcrUploadButton({ onExtracted, companies, agencies }: OcrUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorState>(null);
  const [info, setInfo] = useState('');
  const [lastFile, setLastFile] = useState<File | null>(null);
  const cancelRef = useRef(false);

  const processFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setInfo('Belge okunuyor...');
    cancelRef.current = false;
    try {
      const data = await extractPolicyData(file);
      if (cancelRef.current) return;

      // Compute missing fields on ORIGINAL data before enrichment
      const originalMissing = data.missingFields ?? computeMissingFields(data);

      const enriched: ExtractedPolicyData = {
        ...data,
        sigortaSirketi: data.sigortaSirketi ? matchCompany(data.sigortaSirketi, companies) : null,
        acente: data.acente ? matchAgency(data.acente, agencies) : null,
      };

      onExtracted(enriched, file);
      setLastFile(file);

      if (originalMissing.length > 0) {
        setInfo(`Şu alanlar okunamadı, lütfen kontrol edin: ${originalMissing.join(', ')}`);
      } else {
        setInfo('');
      }
    } catch (err) {
      if (cancelRef.current) return;
      const msg = getErrorMessage(err);
      setError(msg);
      setInfo('');
      console.error('[OCR] Extraction failed:', err);
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [companies, agencies, onExtracted]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    void processFile(file);
  }

  function retry() {
    if (lastFile) void processFile(lastFile);
  }

  function cancel() {
    cancelRef.current = true;
    setLoading(false);
    setInfo('');
  }

  function dismissError() {
    setError(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          className="btn-secondary flex items-center gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <FileScan size={16} />}
          {loading ? 'Belge okunuyor...' : 'Dosyadan Oku (OCR)'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.heic,.heif,.webp,.bmp,application/pdf,image/*"
          className="hidden"
          onChange={handleFile}
        />
        {loading && (
          <button type="button" onClick={cancel} className="btn-secondary text-sm flex items-center gap-1.5">
            <X size={14} /> İptal
          </button>
        )}
        {loading && (
          <span className="text-xs text-slate-500">Bu işlem birkaç saniye sürebilir...</span>
        )}
      </div>

      {info && !error && !loading && (
        <div className="flex items-start gap-2 text-sm text-teal-700 bg-teal-50 border border-teal-200 rounded-lg p-3">
          <Info size={16} className="shrink-0 mt-0.5" />
          <span>{info}</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertTriangle size={18} className="shrink-0 text-red-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-700">{error.title}</p>
            <p className="text-red-600 mt-0.5 text-xs">{error.detail}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={retry} className="text-xs font-semibold text-red-700 bg-white border border-red-300 rounded-md px-2.5 py-1.5 hover:bg-red-50 transition flex items-center gap-1">
              <RotateCcw size={13} /> Tekrar Dene
            </button>
            <button type="button" onClick={dismissError} className="text-red-400 hover:text-red-600">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
