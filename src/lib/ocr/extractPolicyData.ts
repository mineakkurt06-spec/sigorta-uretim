import { GoogleGenAI, Type } from '@google/genai';

export const BRANS_LISTESI = [
  'Bireysel Emeklilik Sistemi (BES)',
  'BİRİKİMLİ HAYAT SİGORTASI',
  'DASK',
  'Emtea Nakliyat / Kargo',
  'FERDİ KAZA',
  'Hayat Sigortası',
  'Hukuksal Koruma',
  'İMM',
  'Inşaat Tüm Riskler (CAR) & Montaj Tüm Riskler (EAR)',
  'İŞ YERİ SİGORTASI',
  'İşveren Sorumluluk',
  'KASKO',
  'Kefalet Sigortası',
  'KİRA KAYBI VE İŞ DURMASI SİGORTASI',
  'KONUT SİGORTASI',
  'Makine Kırılması & Elektronik Cihaz',
  'Mesleki Sorumluluk Sigortası',
  'ÖSS',
  'SEYEHAT SAĞLIK SİGORTASI',
  'Siber Riskler Sigortası',
  'Tarım Sigortaları (TARSİM)',
  'Tehlikeli / Kritik Hastalıklar Sigortası',
  'Tekne ve Yat (Su Araçları)',
  'Ticari Kredi Sigortası',
  'TRAFİK SİGORTASI',
  'TSS',
  'Üçüncü Şahıs Mali Sorumluluk',
  'YEŞİL KART',
  'DİĞER',
] as const;

export type ExtractedPolicyData = {
  sigortaSirketi: string | null;
  musteriAdi: string | null;
  policeNo: string | null;
  belgeSeriNo: string | null;
  plaka: string | null;
  sigortaTuru: string | null;
  bitisTarihi: string | null;
  netPrim: string | null;
  brutPrim: string | null;
  acente: string | null;
  rawText?: string | null;
  missingFields?: string[];
  extractionMethod?: string;
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    sigortaSirketi: {
      type: Type.STRING,
      description:
        'Poliçeyi düzenleyen ASIL sigorta şirketi adı. Belgenin logosundan/antetinden/imza bloğundan al. Tramer/geçmiş bilgisi alanlarındaki önceki sigorta şirketiyle KARIŞTIRMA. Belgede net bir sigorta şirketi adı görmüyorsan boş string döndür.',
    },
    musteriAdi: {
      type: Type.STRING,
      description: 'Sigortalı / sigorta ettiren adı soyadı veya unvanı. Belgede şu etiketlerden birinin yanında olabilir: "Sigortalı", "Sigorta Ettiren", "Müşteri Adı", "Ad Soyad", "Adı Soyadı", "Ünvan", "Unvan". Belgede yoksa boş string döndür.',
    },
    policeNo: {
      type: Type.STRING,
      description: 'Ana poliçe numarası (yenileme/zeyil ek numarası değil). Bu bir KODDUR — en az 5 rakam/harf içeren alfanümerik bir koddur. "Detaylar", "bilgiler", "açıklama" gibi Türkçe kelimeler DEĞİL. Belgede "Poliçe No: 12345678" gibi bir alanda bulunur. Belgede net bir poliçe numarası görmüyorsan boş string döndür.',
    },
    belgeSeriNo: {
      type: Type.STRING,
      description: 'Poliçe belgesinin seri numarası (belge seri no). Genellikle 2 harf + 6 rakam formatındadır. Belgede yoksa boş string döndür.',
    },
    plaka: {
      type: Type.STRING,
      description: 'Araç plakası. Belgede yoksa boş string döndür.',
    },
    sigortaTuru: {
      type: Type.STRING,
      description:
        'Poliçenin branşı/türü. Belge trafik sigortası ise "TRAFİK SİGORTASI", kasko ise "KASKO", DASK ise "DASK", konut ise "KONUT SİGORTASI", hayat ise "Hayat Sigortası", ferdi kaza ise "FERDİ KAZA", İMM ise "İMM" vb. döndür. Hiçbiri net şekilde uymuyorsa "DİĞER" döndür. Belgede net bir sigorta türü görmüyorsan boş string döndür.',
    },
    bitisTarihi: {
      type: Type.STRING,
      description:
        'Poliçenin bitiş tarihi (poliçe sonu / vade sonu / BİTİŞ TARİHİ alanı). YYYY-MM-DD formatında ISO tarih olarak döndür (örn. belgede "17/08/2027" yazıyorsa "2027-08-17" döndür). Emin değilsen boş string döndür.',
    },
    netPrim: {
      type: Type.STRING,
      description:
        'Net prim tutarı. Belgede şu etiketlerden birinin yanında olabilir: "Net Prim", "Net Prim Tutarı", "Net". Türkçe sayı biçimini olduğu gibi al (örn "12.329,64" veya "12329.64"). Sayıyı metin olarak döndür. Belgede yoksa boş string döndür.',
    },
    brutPrim: {
      type: Type.STRING,
      description:
        'Brüt prim / ödenecek toplam tutar. Belgede şu etiketlerden birinin yanında olabilir: "Brüt Prim", "Toplam Prim", "Ödenecek Prim", "Genel Toplam", "Toplam Tutar", "Brüt". Türkçe sayı biçimini olduğu gibi al. Sayıyı metin olarak döndür. Belgede yoksa boş string döndür.',
    },
    acente: {
      type: Type.STRING,
      description: 'Acente/broker adı ve varsa acente kodu. Belgede şu etiketlerden birinin yanında olabilir: "Acente", "Acente Ünvanı", "Acente Adı", "Acente Unvanı", "Broker". Belgede yoksa boş string döndür.',
    },
  },
};

const FIELD_LABELS: Record<keyof Omit<ExtractedPolicyData, 'rawText' | 'missingFields' | 'extractionMethod'>, string> = {
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

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_IMAGE_DIM = 2000;
const GEMINI_TIMEOUT_MS = 90_000;
const TESSERACT_TIMEOUT_MS = 120_000;
const MODEL_CANDIDATES = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];

export class OcrError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'OcrError';
  }
}

function fileToBase64(file: File): Promise<{ data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      resolve({ data: base64, mimeType: file.type || 'application/octet-stream' });
    };
    reader.onerror = () => reject(new OcrError('READ_FAILED', 'Dosya okunamadı.'));
    reader.readAsDataURL(file);
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new OcrError('TIMEOUT', `${label} — işlem zaman aşımına uğradı (${Math.round(ms / 1000)}sn).`)), ms);
    promise.then(v => { clearTimeout(timer); resolve(v); }, e => { clearTimeout(timer); reject(e); });
  });
}

// --- Image preprocessing via canvas: resize, grayscale, contrast ---

async function loadImageFromBlob(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new OcrError('IMAGE_LOAD_FAILED', 'Görüntü yüklenemedi.')); };
    img.src = url;
  });
}

function preprocessImage(img: HTMLImageElement): { data: string; mimeType: string } {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;

  let outW = w;
  let outH = h;
  if (Math.max(w, h) > MAX_IMAGE_DIM) {
    if (w >= h) { outW = MAX_IMAGE_DIM; outH = Math.round((h / w) * MAX_IMAGE_DIM); }
    else { outH = MAX_IMAGE_DIM; outW = Math.round((w / h) * MAX_IMAGE_DIM); }
  }

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new OcrError('CANVAS_FAILED', 'Görüntü işlenemedi (canvas desteklenmiyor).');

  ctx.drawImage(img, 0, 0, outW, outH);

  // Grayscale + contrast boost for better OCR
  const imageData = ctx.getImageData(0, 0, outW, outH);
  const d = imageData.data;
  const contrast = 1.3;
  const intercept = 128 * (1 - contrast);
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = Math.max(0, Math.min(255, gray * contrast + intercept));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(imageData, 0, 0);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  const base64 = dataUrl.split(',')[1] || '';
  return { data: base64, mimeType: 'image/jpeg' };
}

async function imageFileToProcessedBase64(file: File): Promise<{ data: string; mimeType: string }> {
  const img = await loadImageFromBlob(file);
  return preprocessImage(img);
}

function imageToCanvasDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      let outW = w, outH = h;
      if (Math.max(w, h) > MAX_IMAGE_DIM) {
        if (w >= h) { outW = MAX_IMAGE_DIM; outH = Math.round((h / w) * MAX_IMAGE_DIM); }
        else { outH = MAX_IMAGE_DIM; outW = Math.round((w / h) * MAX_IMAGE_DIM); }
      }
      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new OcrError('CANVAS_FAILED', 'Görüntü işlenemedi.')); return; }
      ctx.drawImage(img, 0, 0, outW, outH);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new OcrError('IMAGE_LOAD_FAILED', 'Görüntü yüklenemedi.')); };
    img.src = url;
  });
}

// --- PDF handling ---

async function extractPdfTextLayer(file: File): Promise<string | null> {
  try {
    const pdfjs = await import('pdfjs-dist');
    const workerUrl = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

    const buf = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buf }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map((item: unknown) => {
        const ti = item as { str?: string };
        return ti.str || '';
      }).join(' ');
      fullText += text + '\n';
    }
    pdf.destroy();
    return fullText.trim() || null;
  } catch {
    return null;
  }
}

async function renderPdfPagesToImages(file: File, maxPages = 5): Promise<{ data: string; mimeType: string }[]> {
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const pages: { data: string; mimeType: string }[] = [];
  const count = Math.min(pdf.numPages, maxPages);
  for (let i = 1; i <= count; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const base64 = dataUrl.split(',')[1] || '';
    pages.push({ data: base64, mimeType: 'image/jpeg' });
  }
  pdf.destroy();
  return pages;
}

async function renderPdfPagesToDataUrls(file: File, maxPages = 5): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const dataUrls: string[] = [];
  const count = Math.min(pdf.numPages, maxPages);
  for (let i = 1; i <= count; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    await page.render({ canvasContext: ctx, viewport }).promise;
    dataUrls.push(canvas.toDataURL('image/jpeg', 0.85));
  }
  pdf.destroy();
  return dataUrls;
}

// --- HEIC detection ---
function isHeic(file: File): boolean {
  const name = file.name.toLowerCase();
  return file.type === 'image/heic' || file.type === 'image/heif' || name.endsWith('.heic') || name.endsWith('.heif');
}

// --- Validation ---

export function validateFile(file: File): void {
  const name = file.name.toLowerCase();
  const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf');
  const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|heic|heif|webp|bmp)$/.test(name);

  if (!isPdf && !isImage) {
    throw new OcrError('UNSUPPORTED_TYPE', 'Bu dosya tipi desteklenmiyor. PDF, JPG, PNG veya HEIC yükleyin.');
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new OcrError('FILE_TOO_LARGE', `Dosya çok büyük (max ${Math.round(MAX_FILE_BYTES / 1024 / 1024)}MB). Daha küçük bir dosya deneyin.`);
  }
  if (file.size === 0) {
    throw new OcrError('EMPTY_FILE', 'Dosya boş görünüyor.');
  }
}

// --- Gemini extraction ---

function buildPrompt(): string {
  return `Bu bir sigorta poliçesi belgesidir (PDF veya taranmış görüntü). Aşağıdaki alanları belgeden çıkar:
- sigortaSirketi: Poliçeyi düzenleyen ASIL sigorta şirketi. Belgenin logosundan, antetinden veya imza bloğundan al. TRAMER/geçmiş poliçe bilgileri alanındaki "Ö. SİGORTA ŞİRKETİ" veya "ÖNCEKİ ACENTE" gibi bilgilerle KARIŞTIRMA — bunlar önceki poliçeye aittir. Belgede net bir sigorta şirketi adı görmüyorsan boş string döndür.
- musteriAdi: Sigortalı / sigorta ettiren kişinin adı soyadı veya unvanı. Belgede şu etiketlerden birinin yanında olabilir: "Sigortalı", "Sigorta Ettiren", "Müşteri Adı", "Ad Soyad", "Adı Soyadı", "Ünvan", "Unvan". Kişi/tüzel kişi adını tam olarak al. Belgede yoksa boş string döndür.
- policeNo: Ana poliçe numarası (zeyil/yenileme ek numarası değil). Bu bir KODDUR — en az 5 rakam/harf içeren alfanümerik bir koddur. "Detaylar", "bilgiler", "açıklama" gibi normal kelimeler DEĞİL. Belgede "Poliçe No" etiketinin yanında bulunur. Net bir poliçe numarası göremiyorsan boş string döndür.
- belgeSeriNo: Poliçe belgesinin seri numarası (belge seri no). Genellikle 2 harf + 6 rakam formatındadır. Belgede yoksa boş string döndür.
- plaka: Araç plakası. Belgede yoksa boş string döndür.
- sigortaTuru: Poliçenin branşı/türü. Belge trafik sigortası ise "TRAFİK SİGORTASI", kasko ise "KASKO", DASK ise "DASK", konut ise "KONUT SİGORTASI", hayat ise "Hayat Sigortası", ferdi kaza ise "FERDİ KAZA", İMM ise "İMM" vb. döndür. Hiçbiri net şekilde uymuyorsa "DİĞER" döndür. Belgede net bir sigorta türü görmüyorsan boş string döndür.
- bitisTarihi: Poliçe bitiş tarihi. YYYY-MM-DD formatında döndür. Belgede yoksa boş string döndür.
- netPrim: Net prim tutarı. Belgede şu etiketlerden birinin yanında olabilir: "Net Prim", "Net Prim Tutarı", "Net". Türkçe sayı biçimini olduğu gibi metin olarak döndür (örn "12.329,64" veya "12329.64"). Belgede yoksa boş string döndür.
- brutPrim: Brüt prim / ödenecek toplam tutar. Belgede şu etiketlerden birinin yanında olabilir: "Brüt Prim", "Toplam Prim", "Ödenecek Prim", "Genel Toplam", "Toplam Tutar", "Brüt". Türkçe sayı biçimini olduğu gibi metin olarak döndür. Belgede yoksa boş string döndür.
- acente: Acente/broker adı ve varsa kodu. Belgede şu etiketlerden birinin yanında olabilir: "Acente", "Acente Ünvanı", "Acente Adı", "Acente Unvanı", "Broker". Belgede yoksa boş string döndür.
Önemli: Bir alan belgede yoksa boş string döndür, tahmin uydurma. Ancak alan belgede varsa mutlaka doldur — asla boş bırakma. Her alanı dikkatle oku, özellikle müşteri adı, net prim, brüt prim ve acente alanlarını atlama.`;
}

function isValidPoliceNo(s: string | null): string | null {
  if (!s) return null;
  const trimmed = s.trim();
  if (!trimmed) return null;
  // Must contain at least 4 digits to be a real policy number
  const digitCount = (trimmed.match(/\d/g) || []).length;
  if (digitCount < 4) return null;
  // Clean: keep only alphanumeric and spaces
  const cleaned = trimmed.replace(/[^A-Z0-9]/gi, '');
  if (cleaned.length < 5) return null;
  return cleaned;
}

function parseGeminiPrim(val: unknown): string | null {
  if (val == null) return null;
  if (typeof val === 'number') return isNaN(val) ? null : String(val);
  const s = String(val).trim();
  if (!s) return null;
  return s;
}

function parseGeminiResponse(text: string): ExtractedPolicyData {
  const parsed = JSON.parse(text) as Partial<ExtractedPolicyData> & { netPrim?: unknown; brutPrim?: unknown };
  const strOrNull = (v: unknown): string | null => {
    if (v == null) return null;
    const s = String(v).trim();
    return s || null;
  };
  return {
    sigortaSirketi: strOrNull(parsed.sigortaSirketi),
    musteriAdi: strOrNull(parsed.musteriAdi),
    policeNo: isValidPoliceNo(strOrNull(parsed.policeNo)),
    belgeSeriNo: strOrNull(parsed.belgeSeriNo),
    plaka: strOrNull(parsed.plaka),
    sigortaTuru: strOrNull(parsed.sigortaTuru),
    bitisTarihi: strOrNull(parsed.bitisTarihi),
    netPrim: parseGeminiPrim(parsed.netPrim),
    brutPrim: parseGeminiPrim(parsed.brutPrim),
    acente: strOrNull(parsed.acente),
  };
}

function mergeMissingFields(gemini: ExtractedPolicyData, rawText: string | null): ExtractedPolicyData {
  if (!rawText || !rawText.trim()) return gemini;
  const regexResult = extractFieldsWithRegex(rawText);
  const merged = { ...gemini };
  (Object.keys(regexResult) as (keyof ExtractedPolicyData)[]).forEach(key => {
    if (key === 'rawText' || key === 'missingFields' || key === 'extractionMethod') return;
    const geminiVal = gemini[key];
    const regexVal = regexResult[key];
    if ((geminiVal === null || geminiVal === undefined || geminiVal === '') && regexVal !== null && regexVal !== undefined && regexVal !== '') {
      (merged as Record<string, unknown>)[key] = regexVal;
    }
  });
  return merged;
}

function computeMissingFields(data: ExtractedPolicyData): string[] {
  const missing: string[] = [];
  (Object.keys(FIELD_LABELS) as (keyof typeof FIELD_LABELS)[]).forEach(key => {
    const val = data[key];
    if (val === null || val === undefined || val === '') missing.push(FIELD_LABELS[key]);
  });
  return missing;
}

async function tryGeminiModels(
  ai: GoogleGenAI | null,
  contents: unknown[],
  timeoutMs: number,
  label: string
): Promise<string | null> {
  if (!ai) return null;
  for (const model of MODEL_CANDIDATES) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model,
          contents: contents as never,
          config: {
            responseMimeType: 'application/json',
            responseSchema: responseSchema,
          },
        }),
        timeoutMs,
        label
      );
      if (response.text) return response.text;
    } catch (err) {
      console.debug(`[OCR] Gemini model ${model} failed:`, err instanceof Error ? err.message : err);
    }
  }
  return null;
}

async function callGeminiWithImage(
  ai: GoogleGenAI | null,
  imageData: { data: string; mimeType: string }
): Promise<ExtractedPolicyData | null> {
  const text = await tryGeminiModels(
    ai,
    [
      { text: buildPrompt() },
      { inlineData: { mimeType: imageData.mimeType, data: imageData.data } },
    ],
    GEMINI_TIMEOUT_MS,
    'Belge okuma (görüntü)'
  );
  if (!text) return null;
  return parseGeminiResponse(text);
}

async function callGeminiWithText(ai: GoogleGenAI | null, textContent: string): Promise<ExtractedPolicyData | null> {
  const prompt = `${buildPrompt()}\n\nBelgeden çıkarılan ham metin:\n"""\n${textContent}\n"""`;
  const text = await tryGeminiModels(
    ai,
    [{ text: prompt }],
    GEMINI_TIMEOUT_MS,
    'Metin katmanı okuma'
  );
  if (!text) return null;
  return parseGeminiResponse(text);
}

// --- Tesseract OCR fallback (works in-browser, no API key needed) ---

async function tesseractRecognize(dataUrl: string): Promise<string> {
  const Tesseract = await import('tesseract.js');
  const result = await withTimeout(
    Tesseract.recognize(dataUrl, 'tur+eng', {}),
    TESSERACT_TIMEOUT_MS,
    'Tesseract OCR'
  );
  return result.data.text || '';
}

// --- Regex-based field extraction from raw text (final fallback) ---

function normalizeTrLower(s: string): string {
  return s
    .replace(/İ/g, 'I').replace(/ı/g, 'i').replace(/Ş/g, 'S').replace(/ş/g, 's')
    .replace(/Ğ/g, 'G').replace(/ğ/g, 'g').replace(/Ç/g, 'C').replace(/ç/g, 'c')
    .replace(/Ü/g, 'U').replace(/ü/g, 'u').replace(/Ö/g, 'O').replace(/ö/g, 'o')
    .toLowerCase();
}

function parseAmount(s: string): number | null {
  // Handle Turkish number format: "1.234,56" → 1234.56, also "1234,56" → 1234.56, "1234.56" → 1234.56
  const cleaned = s.replace(/[^\d.,-]/g, '').trim();
  if (!cleaned) return null;
  // If both . and , present, assume . is thousands separator
  if (cleaned.includes('.') && cleaned.includes(',')) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
  }
  // If only , present, assume decimal separator
  if (cleaned.includes(',') && !cleaned.includes('.')) {
    return parseFloat(cleaned.replace(',', '.'));
  }
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function parseDateToISO(s: string): string | null {
  // Try GG.AA.YYYY, GG/AA/YYYY, GG-AA-YYYY
  const m = s.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}

function extractFieldsWithRegex(text: string): ExtractedPolicyData {
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
  const fullText = text;
  const norm = normalizeTrLower(fullText);

  // Plaka: "34 ABC 123" or "34ABC123" or similar Turkish plate patterns
  let plaka: string | null = null;
  const plateMatch = fullText.match(/\b(\d{2})\s*([A-Z]{1,3})\s*(\d{2,4})\b/i);
  if (plateMatch) {
    plaka = `${plateMatch[1]} ${plateMatch[2].toUpperCase()} ${plateMatch[3]}`;
  }

  // Police No: look for "poliçe no" followed by alphanumeric code (must contain at least one digit)
  let policeNo: string | null = null;
  const policeMatch = fullText.match(/(?:poli[çc]e\s*(?:no|numaras[ıi])?|policeno)\s*[:.]?\s*((?=[A-Z0-9\s]*\d)[A-Z0-9\s]{5,25})/i);
  if (policeMatch) policeNo = policeMatch[1].replace(/\s+/g, '').trim();

  // Belge Seri No: "belge seri no" followed by 2 letters + digits
  let belgeSeriNo: string | null = null;
  const belgeMatch = fullText.match(/(?:belge\s*seri\s*(?:no|numaras[ıi])?|belgeseri)\s*[:.]?\s*([A-Z]{1,3}\s*\d{4,8})/i);
  if (belgeMatch) belgeSeriNo = belgeMatch[1].replace(/\s+/g, ' ').trim();

  // Bitiş tarihi: "bitiş tarihi" followed by date, or just find dates
  let bitisTarihi: string | null = null;
  const bitisMatch = fullText.match(/(?:bi[ti]i[sş]\s*tarih(?:i)?)\s*[:.]?\s*(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{4})/i);
  if (bitisMatch) {
    bitisTarihi = parseDateToISO(bitisMatch[1]);
  }
  if (!bitisTarihi) {
    // Find the latest date in the text (often the bitiş tarihi)
    const allDates = [...fullText.matchAll(/(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{4})/g)];
    if (allDates.length > 0) {
      // Try to find one near "bitiş" or take the last date
      for (const d of allDates) {
        const iso = parseDateToISO(d[1]);
        if (iso) {
          const year = parseInt(iso.split('-')[0]);
          if (year >= new Date().getFullYear()) {
            bitisTarihi = iso;
            break;
          }
        }
      }
      if (!bitisTarihi) {
        const last = allDates[allDates.length - 1];
        bitisTarihi = parseDateToISO(last[1]);
      }
    }
  }

  // Prim amounts: look for various labels
  let netPrim: string | null = null;
  let brutPrim: string | null = null;
  const netPrimLabels = ['net\s*prim\s*tutar[ıi]?', 'net\s*prim', 'net'];
  for (const label of netPrimLabels) {
    const re = new RegExp(`(?:${label})\s*[:\-]?\s*([\d.,]+)`, 'i');
    const m = fullText.match(re);
    if (m && m[1]) { netPrim = m[1].trim(); if (netPrim) break; }
  }
  const brutPrimLabels = [
    'br[uü]t\s*prim', 'toplam\s*prim', '[oö]denecek\s*prim',
    'genel\s*toplam', 'toplam\s*tutar', 'toplam', 'br[uü]t',
  ];
  for (const label of brutPrimLabels) {
    const re = new RegExp(`(?:${label})\s*[:\-]?\s*([\d.,]+)`, 'i');
    const m = fullText.match(re);
    if (m && m[1]) { brutPrim = m[1].trim(); if (brutPrim) break; }
  }

  // Sigorta türü: detect from text
  let sigortaTuru: string | null = null;
  if (norm.includes('trafik')) sigortaTuru = 'TRAFİK SİGORTASI';
  else if (norm.includes('kasko')) sigortaTuru = 'KASKO';
  else if (norm.includes('dask')) sigortaTuru = 'DASK';
  else if (norm.includes('konut')) sigortaTuru = 'KONUT SİGORTASI';
  else if (norm.includes('hayat') && !norm.includes('ferdi')) sigortaTuru = 'Hayat Sigortası';
  else if (norm.includes('ferdi') && norm.includes('kaza')) sigortaTuru = 'FERDİ KAZA';
  else if (norm.includes('imm')) sigortaTuru = 'İMM';
  else if (norm.includes('seyahat')) sigortaTuru = 'SEYEHAT SAĞLIK SİGORTASI';
  else if (norm.includes('yesil') && norm.includes('kart')) sigortaTuru = 'YEŞİL KART';

  // Sigorta şirketi: look for known company names in text
  let sigortaSirketi: string | null = null;
  const knownCompanies = [
    'Anadolu', 'Türkiye Sigorta', 'Turkiye Sigorta', 'Allianz', 'AXA', 'Zurich', 'Mapfre',
    'Sompo', 'Aksigorta', 'AgeSA', 'HDI', 'Quick', 'Ray', 'Boyut', 'Doğa', 'Ethica',
    'Generali', 'Metlife', 'Berea', 'Lucky', 'Magdeburger', 'Zurich', 'Corealidade',
    'Howden', 'Chubb', 'BNP', 'Cardif', 'NeoHüviyet', 'Türkiye Sigorta Birliği',
    'Groupama', 'QNB', 'Albaraka', 'Vakıf', 'Hekim', 'Surasra', 'Demir',
    'AIG', 'TURK NIPON', 'GIG', 'SABB Takaful', 'Saudi',
  ];
  for (const c of knownCompanies) {
    if (norm.includes(normalizeTrLower(c))) {
      sigortaSirketi = c;
      break;
    }
  }

  // Müşteri adı: look for various labels followed by a name
  let musteriAdi: string | null = null;
  const customerLabels = [
    'sigortal[ıi]', 'sigorta\s*ettiren', 'm[uü]steri\s*ad[ıi]',
    'ad\s*soyad', 'ad[ıi]\s*soyad[ıi]', '[uü]nvan', 'unvan',
  ];
  for (const label of customerLabels) {
    const re = new RegExp(`(?:${label})\s*[:\-]?\s*([A-ZÇĞİÖŞÜ][\wÇĞİÖŞÜçğıöşü\s.&-]{2,60})`, 'i');
    const m = fullText.match(re);
    if (m && m[1]) {
      const name = m[1].trim();
      // Reject if it looks like a number or code, not a name
      if (!/^\d+$/.test(name) && /[A-ZÇĞİÖŞÜa-zçğıöşü]/.test(name)) {
        musteriAdi = name;
        break;
      }
    }
  }

  // Acente: look for various labels followed by name
  let acente: string | null = null;
  const acenteLabels = ['acente\s*[uü]nvan[ıi]?', 'acente\s*ad[ıi]?', 'acente', 'broker'];
  for (const label of acenteLabels) {
    const re = new RegExp(`(?:${label})\s*[:\-]?\s*([A-ZÇĞİÖŞÜ][\wÇĞİÖŞÜçğıöşü\s.&-]{2,50})`, 'i');
    const m = fullText.match(re);
    if (m && m[1]) { acente = m[1].trim(); break; }
  }

  return {
    sigortaSirketi,
    musteriAdi,
    policeNo,
    belgeSeriNo,
    plaka,
    sigortaTuru,
    bitisTarihi,
    netPrim,
    brutPrim,
    acente,
  };
}

// --- Main entry ---

export async function extractPolicyData(file: File): Promise<ExtractedPolicyData> {
  validateFile(file);

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const ai: GoogleGenAI | null = apiKey ? new GoogleGenAI({ apiKey }) : null;

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  // PDF: try text layer first, then page images, then Tesseract
  if (isPdf) {
    let bestResult: ExtractedPolicyData | null = null;
    let bestMethod = '';
    let rawTextSnippet = '';

    // Step 1: try extracting real text from PDF
    const textLayer = await extractPdfTextLayer(file);
    if (textLayer && textLayer.length > 30) {
      rawTextSnippet = textLayer.slice(0, 500);
      // Try Gemini with text
      const geminiResult = await callGeminiWithText(ai, textLayer);
      if (geminiResult) {
        const merged = mergeMissingFields(geminiResult, textLayer);
        bestResult = merged;
        bestMethod = 'PDF metin + Gemini';
        const missing = computeMissingFields(merged);
        console.debug('[OCR] PDF text-layer + Gemini succeeded, missing:', missing);
        if (missing.length === 0) {
          return { ...merged, rawText: rawTextSnippet, missingFields: missing, extractionMethod: bestMethod };
        }
      }
      // Gemini failed but we have text — use regex
      if (!bestResult) {
        const regexResult = extractFieldsWithRegex(textLayer);
        if (Object.values(regexResult).some(v => v !== null)) {
          bestResult = regexResult;
          bestMethod = 'PDF metin + desen';
          console.debug('[OCR] PDF text-layer + regex fallback');
        }
      }
    }

    // Step 2: render PDF pages to images (if still missing fields)
    if (!bestResult || computeMissingFields(bestResult).length > 0) {
      try {
        const pages = await renderPdfPagesToImages(file);
        if (pages.length > 0) {
          // Try Gemini with first page image
          const geminiResult = await callGeminiWithImage(ai, pages[0]);
          if (geminiResult) {
            if (bestResult) {
              (Object.keys(geminiResult) as (keyof ExtractedPolicyData)[]).forEach(key => {
                if (key === 'rawText' || key === 'missingFields' || key === 'extractionMethod') return;
                const bestVal = bestResult![key];
                const imgVal = geminiResult[key];
                if ((bestVal === null || bestVal === undefined || bestVal === '') && imgVal !== null && imgVal !== undefined && imgVal !== '') {
                  (bestResult as Record<string, unknown>)[key] = imgVal;
                }
              });
              bestMethod = bestMethod + ' + görüntü';
            } else {
              bestResult = geminiResult;
              bestMethod = 'PDF görüntü + Gemini';
            }
            console.debug('[OCR] PDF image + Gemini, missing:', bestResult ? computeMissingFields(bestResult) : 'all');
            if (bestResult && computeMissingFields(bestResult).length === 0) {
              return { ...bestResult, missingFields: [], extractionMethod: bestMethod };
            }
          }

          // Try Gemini with all pages
          if (bestResult && computeMissingFields(bestResult).length > 0 && pages.length > 1) {
            const allPagesText = await tryGeminiModels(
              ai,
              [
                { text: buildPrompt() },
                ...pages.map(p => ({ inlineData: { mimeType: p.mimeType, data: p.data } })),
              ],
              GEMINI_TIMEOUT_MS,
              'Çok sayfalı belge okuma'
            );
            if (allPagesText) {
              const multiResult = parseGeminiResponse(allPagesText);
              if (bestResult) {
                (Object.keys(multiResult) as (keyof ExtractedPolicyData)[]).forEach(key => {
                  if (key === 'rawText' || key === 'missingFields' || key === 'extractionMethod') return;
                  const bestVal = bestResult![key];
                  const multiVal = multiResult[key];
                  if ((bestVal === null || bestVal === undefined || bestVal === '') && multiVal !== null && multiVal !== undefined && multiVal !== '') {
                    (bestResult as Record<string, unknown>)[key] = multiVal;
                  }
                });
                bestMethod = bestMethod + ' + çok sayfa';
              } else {
                bestResult = multiResult;
                bestMethod = 'PDF çok sayfa + Gemini';
              }
              console.debug('[OCR] PDF multi-page + Gemini, missing:', bestResult ? computeMissingFields(bestResult) : 'all');
              if (bestResult && computeMissingFields(bestResult).length === 0) {
                return { ...bestResult, missingFields: [], extractionMethod: bestMethod };
              }
            }
          }

          // Tesseract on page images to fill remaining gaps
          if (bestResult && computeMissingFields(bestResult).length > 0) {
            console.debug('[OCR] PDF fields missing, running Tesseract on pages');
            const pageDataUrls = await renderPdfPagesToDataUrls(file);
            let fullText = '';
            for (const dataUrl of pageDataUrls) {
              try {
                const pageText = await tesseractRecognize(dataUrl);
                fullText += pageText + '\n';
              } catch (err) {
                console.debug('[OCR] Tesseract page failed:', err);
              }
            }
            if (fullText.trim()) {
              rawTextSnippet = fullText.slice(0, 500);
              const geminiFromTesseract = await callGeminiWithText(ai, fullText);
              if (geminiFromTesseract) {
                const tessMerged = mergeMissingFields(geminiFromTesseract, fullText);
                if (bestResult) {
                  (Object.keys(tessMerged) as (keyof ExtractedPolicyData)[]).forEach(key => {
                    if (key === 'rawText' || key === 'missingFields' || key === 'extractionMethod') return;
                    const bestVal = bestResult![key];
                    const tessVal = tessMerged[key];
                    if ((bestVal === null || bestVal === undefined || bestVal === '') && tessVal !== null && tessVal !== undefined && tessVal !== '') {
                      (bestResult as Record<string, unknown>)[key] = tessVal;
                    }
                  });
                  bestMethod = bestMethod + ' + Tesseract';
                } else {
                  bestResult = tessMerged;
                  bestMethod = 'PDF Tesseract + Gemini';
                }
              } else {
                const regexResult = extractFieldsWithRegex(fullText);
                if (bestResult) {
                  (Object.keys(regexResult) as (keyof ExtractedPolicyData)[]).forEach(key => {
                    if (key === 'rawText' || key === 'missingFields' || key === 'extractionMethod') return;
                    const bestVal = bestResult![key];
                    const regexVal = regexResult[key];
                    if ((bestVal === null || bestVal === undefined || bestVal === '') && regexVal !== null && regexVal !== undefined && regexVal !== '') {
                      (bestResult as Record<string, unknown>)[key] = regexVal;
                    }
                  });
                  bestMethod = bestMethod + ' + Tesseract desen';
                } else {
                  bestResult = regexResult;
                  bestMethod = 'PDF Tesseract + desen';
                }
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof OcrError) throw err;
        console.debug('[OCR] PDF processing error:', err);
      }
    }

    if (bestResult) {
      const missing = computeMissingFields(bestResult);
      return { ...bestResult, rawText: rawTextSnippet || undefined, missingFields: missing, extractionMethod: bestMethod };
    }

    throw new OcrError('PDF_FAILED', 'PDF okunamadı. Şifreli veya bozuk olabilir.');
  }

  // Image files
  let imageFile = file;
  if (isHeic(file)) {
    throw new OcrError('HEIC_UNSUPPORTED', 'HEIC dosya dönüştürülemedi. Lütfen JPEG veya PDF yükleyin.');
  }

  // Preprocess image
  let imageData: { data: string; mimeType: string };
  let dataUrlForTesseract: string;
  try {
    imageData = await imageFileToProcessedBase64(imageFile);
    // For Tesseract we need a data URL
    dataUrlForTesseract = `data:image/jpeg;base64,${imageData.data}`;
  } catch (err) {
    if (err instanceof OcrError) throw err;
    // Fallback: send raw file
    imageData = await fileToBase64(imageFile);
    dataUrlForTesseract = await imageToCanvasDataUrl(imageFile).catch(() => `data:${imageData.mimeType};base64,${imageData.data}`);
  }

  let bestResult: ExtractedPolicyData | null = null;
  let bestMethod = '';

  // Step 1: Try Gemini with preprocessed image
  const geminiResult = await callGeminiWithImage(ai, imageData);
  if (geminiResult) {
    bestResult = geminiResult;
    bestMethod = 'Görüntü + Gemini';
    const missing = computeMissingFields(geminiResult);
    console.debug('[OCR] Image + Gemini succeeded, missing:', missing);
    if (missing.length === 0) {
      return { ...geminiResult, missingFields: missing, extractionMethod: bestMethod };
    }
  }

  // Step 2: Try raw image with Gemini if still missing fields
  if (!bestResult || computeMissingFields(bestResult).length > 0) {
    try {
      const rawData = await fileToBase64(imageFile);
      const geminiRaw = await callGeminiWithImage(ai, rawData);
      if (geminiRaw) {
        const rawMissing = computeMissingFields(geminiRaw);
        console.debug('[OCR] Raw image + Gemini succeeded, missing:', rawMissing);
        if (!bestResult || rawMissing.length < computeMissingFields(bestResult).length) {
          bestResult = geminiRaw;
          bestMethod = 'Ham görüntü + Gemini';
        }
        if (rawMissing.length === 0) {
          return { ...geminiRaw, missingFields: rawMissing, extractionMethod: bestMethod };
        }
      }
    } catch (err) {
      console.debug('[OCR] Raw image Gemini attempt failed:', err);
    }
  }

  // Step 3: Tesseract OCR to fill missing fields (or as full fallback)
  const hasMissing = !bestResult || computeMissingFields(bestResult).length > 0;
  if (hasMissing) {
    console.debug('[OCR] Fields missing, running Tesseract to fill gaps');
    let tesseractText = '';
    try {
      tesseractText = await tesseractRecognize(dataUrlForTesseract);
    } catch (err) {
      console.debug('[OCR] Tesseract failed:', err);
      try {
        const rawDataUrl = await imageToCanvasDataUrl(imageFile);
        tesseractText = await tesseractRecognize(rawDataUrl);
      } catch (err2) {
        console.debug('[OCR] Tesseract raw also failed:', err2);
      }
    }

    if (tesseractText.trim()) {
      // Try Gemini with Tesseract text
      const geminiFromTesseract = await callGeminiWithText(ai, tesseractText);
      if (geminiFromTesseract) {
        const merged = mergeMissingFields(geminiFromTesseract, tesseractText);
        if (bestResult) {
          // Merge bestResult with Tesseract results to fill gaps
          (Object.keys(merged) as (keyof ExtractedPolicyData)[]).forEach(key => {
            if (key === 'rawText' || key === 'missingFields' || key === 'extractionMethod') return;
            const bestVal = bestResult![key];
            const tessVal = merged[key];
            if ((bestVal === null || bestVal === undefined || bestVal === '') && tessVal !== null && tessVal !== undefined && tessVal !== '') {
              (bestResult as Record<string, unknown>)[key] = tessVal;
            }
          });
          bestMethod = bestMethod + ' + Tesseract';
        } else {
          bestResult = merged;
          bestMethod = 'Tesseract + Gemini';
        }
      } else {
        // Regex fallback
        const regexResult = extractFieldsWithRegex(tesseractText);
        if (bestResult) {
          (Object.keys(regexResult) as (keyof ExtractedPolicyData)[]).forEach(key => {
            if (key === 'rawText' || key === 'missingFields' || key === 'extractionMethod') return;
            const bestVal = bestResult![key];
            const regexVal = regexResult[key];
            if ((bestVal === null || bestVal === undefined || bestVal === '') && regexVal !== null && regexVal !== undefined && regexVal !== '') {
              (bestResult as Record<string, unknown>)[key] = regexVal;
            }
          });
          bestMethod = bestMethod + ' + Tesseract desen';
        } else {
          bestResult = regexResult;
          bestMethod = 'Tesseract + desen';
        }
      }
    }
  }

  if (bestResult) {
    const missing = computeMissingFields(bestResult);
    return { ...bestResult, missingFields: missing, extractionMethod: bestMethod };
  }

  throw new OcrError('OCR_FAILED', 'Belge okunamadı. Daha net bir fotoğraf veya PDF deneyin, ya da bilgileri elle girin.');
}

export function getErrorMessage(error: unknown): { title: string; detail: string } {
  if (error instanceof OcrError) {
    const detailMap: Record<string, string> = {
      UNSUPPORTED_TYPE: 'PDF, JPG, PNG veya HEIC formatında bir dosya yükleyin.',
      FILE_TOO_LARGE: 'Dosyayı küçültüp tekrar deneyin.',
      EMPTY_FILE: 'Dosya boş — farklı bir dosya seçin.',
      NO_API_KEY: 'Sistem yöneticinizle iletişime geçin.',
      READ_FAILED: 'Dosya tarayıcıda okunamadı. Tekrar deneyin.',
      IMAGE_LOAD_FAILED: 'Görüntü açılamadı. Farklı bir dosya deneyin.',
      CANVAS_FAILED: 'Tarayıcı görüntü işlemeyi desteklemiyor.',
      HEIC_UNSUPPORTED: 'HEIC dosyayı JPEG\'e çeviremedik. JPEG veya PDF yükleyin.',
      PDF_FAILED: 'PDF bozuk veya şifreli olabilir.',
      PDF_RENDER_FAILED: 'PDF sayfaları görüntüye çevrilemedi.',
      TIMEOUT: 'İşlem uzun sürdü. Daha küçük bir dosya deneyin.',
      EMPTY_RESPONSE: 'Belge net olmayabilir. Daha net bir fotoğraf veya PDF deneyin.',
      GEMINI_ERROR: 'Bağlantı hatası. Tekrar deneyin veya bilgileri elle girin.',
      OCR_FAILED: 'Daha net bir fotoğraf deneyin veya bilgileri elle girin.',
      UNKNOWN: 'Beklenmeyen bir hata oluştu. Tekrar deneyin.',
    };
    return { title: error.message, detail: detailMap[error.code] || 'Tekrar deneyin veya bilgileri elle girin.' };
  }
  const msg = error instanceof Error ? error.message : 'Bilinmeyen hata.';
  return { title: 'Belge okunamadı.', detail: msg };
}
