import { useRef, useState } from 'react';
import { ScanLine, Loader2 } from 'lucide-react';
import {
  extractPolicyDataFromFile,
  type ExtractedPolicyData,
} from '../lib/ocr/extractPolicyData';

interface OcrUploadButtonProps {
  onExtracted: (data: ExtractedPolicyData) => void;
}

export function OcrUploadButton({ onExtracted }: OcrUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const data = await extractPolicyDataFromFile(file);
      onExtracted(data);
    } catch (err) {
      console.error('OCR çıkarma hatası:', err);
      setError('Belge okunamadı. Lütfen alanları manuel doldurun.');
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white
                   text-sm font-medium hover:bg-blue-700 disabled:opacity-60
                   disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <ScanLine size={16} />
        )}
        {loading ? 'Belge okunuyor...' : 'Dosyadan Oku (OCR)'}
      </button>
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
    </div>
  );
}