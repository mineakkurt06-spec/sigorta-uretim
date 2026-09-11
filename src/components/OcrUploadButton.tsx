import { useRef, useState } from 'react';
import { FileScan, Loader2 } from 'lucide-react';
import { extractPolicyData, type ExtractedPolicyData } from '@/lib/ocr/extractPolicyData';

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

export function OcrUploadButton({ onExtracted, companies, agencies }: OcrUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const data = await extractPolicyData(file);
      const enriched: ExtractedPolicyData = {
        ...data,
        sigortaSirketi: data.sigortaSirketi ? matchCompany(data.sigortaSirketi, companies) : null,
        acente: data.acente ? matchAgency(data.acente, agencies) : null,
      };
      onExtracted(enriched, file);
    } catch {
      setError('Belge okunamadı, lütfen alanları manuel doldurun.');
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex items-center gap-3">
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
        accept=".pdf,.png,.jpg,.jpeg"
        className="hidden"
        onChange={handleFile}
      />
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
