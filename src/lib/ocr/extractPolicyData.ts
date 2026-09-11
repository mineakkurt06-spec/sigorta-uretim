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
  plaka: string | null;
  sigortaTuru: string | null;
  bitisTarihi: string | null; // YYYY-MM-DD (ISO) formatında
  netPrim: number | null;
  brutPrim: number | null;
  acente: string | null;
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    sigortaSirketi: {
      type: Type.STRING,
      description:
        'Poliçeyi düzenleyen ASIL sigorta şirketi adı. Belgenin logosundan/antetinden/imza bloğundan al. Tramer/geçmiş bilgisi alanlarındaki önceki sigorta şirketiyle KARIŞTIRMA.',
    },
    musteriAdi: {
      type: Type.STRING,
      description: 'Sigortalı / sigorta ettiren adı soyadı veya unvanı.',
    },
    policeNo: {
      type: Type.STRING,
      description: 'Ana poliçe numarası (yenileme/zeyil ek numarası değil).',
    },
    plaka: {
      type: Type.STRING,
      description: 'Araç plakası. Belgede yoksa null döndür.',
    },
    sigortaTuru: {
      type: Type.STRING,
      enum: BRANS_LISTESI as unknown as string[],
      description:
        'Poliçenin branşı/türü. SADECE verilen listedeki değerlerden BİRİNİ seç, listede olmayan bir şey UYDURMA. Belge trafik sigortası ise "TRAFİK SİGORTASI", kasko ise "KASKO", DASK ise "DASK" vb. seç. Hiçbiri net şekilde uymuyorsa "DİĞER" döndür.',
    },
    bitisTarihi: {
      type: Type.STRING,
      description:
        'Poliçenin bitiş tarihi (poliçe sonu / vade sonu / BİTİŞ TARİHİ alanı). YYYY-MM-DD formatında ISO tarih olarak döndür (örn. belgede "17/08/2027" yazıyorsa "2027-08-17" döndür). Emin değilsen null döndür.',
    },
    netPrim: {
      type: Type.NUMBER,
      description:
        'Net prim tutarı (sayısal). Türkçe biçimden çevir: "12.329,64" → 12329.64',
    },
    brutPrim: {
      type: Type.NUMBER,
      description: 'Brüt prim / ödenecek toplam tutar (sayısal).',
    },
    acente: {
      type: Type.STRING,
      description: 'Acente/broker adı ve varsa acente kodu.',
    },
  },
};

function fileToBase64(file: File): Promise<{ data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      resolve({ data: base64, mimeType: file.type || 'application/octet-stream' });
    };
    reader.onerror = () => reject(new Error('Dosya okunamadı.'));
    reader.readAsDataURL(file);
  });
}

export async function extractPolicyData(file: File): Promise<ExtractedPolicyData> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini API anahtarı bulunamadı.');

  const { data: base64Data, mimeType } = await fileToBase64(file);

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Bu bir sigorta poliçesi belgesidir (PDF veya taranmış görüntü). Aşağıdaki alanları belgeden çıkar:
- sigortaSirketi: Poliçeyi düzenleyen ASIL sigorta şirketi. Belgenin logosundan, antetinden veya imza bloğundan al. TRAMER/geçmiş poliçe bilgileri alanındaki "Ö. SİGORTA ŞİRKETİ" veya "ÖNCEKİ ACENTE" gibi bilgilerle KARIŞTIRMA — bunlar önceki poliçeye aittir.
- musteriAdi: Sigortalı / sigorta ettiren kişinin adı soyadı veya unvanı.
- policeNo: Ana poliçe numarası (zeyil/yenileme ek numarası değil).
- plaka: Araç plakası. Belgede yoksa null.
- sigortaTuru: Verilen sabit listeden SADECE birini seç (şemadaki enum'a bak). Listede tam karşılığı yoksa "DİĞER" seç.
- bitisTarihi: Poliçe bitiş tarihi. YYYY-MM-DD formatında döndür.
- netPrim: Net prim tutarı. Türkçe sayı biçimini normal ondalığa çevir (örn "12.329,64" → 12329.64).
- brutPrim: Brüt prim / ödenecek toplam tutar, aynı şekilde çevir.
- acente: Acente/broker adı ve varsa kodu.
Bir alan belgede yoksa veya emin değilsen null döndür, tahmin uydurma.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: [
      { text: prompt },
      { inlineData: { mimeType, data: base64Data } },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: responseSchema,
    },
  });

  const text = response.text;
  if (!text) throw new Error('Gemini boş yanıt döndürdü.');

  const parsed = JSON.parse(text) as ExtractedPolicyData;
  return {
    sigortaSirketi: parsed.sigortaSirketi ?? null,
    musteriAdi: parsed.musteriAdi ?? null,
    policeNo: parsed.policeNo ?? null,
    plaka: parsed.plaka ?? null,
    sigortaTuru: parsed.sigortaTuru ?? null,
    bitisTarihi: parsed.bitisTarihi ?? null,
    netPrim: typeof parsed.netPrim === 'number' ? parsed.netPrim : null,
    brutPrim: typeof parsed.brutPrim === 'number' ? parsed.brutPrim : null,
    acente: parsed.acente ?? null,
  };
}