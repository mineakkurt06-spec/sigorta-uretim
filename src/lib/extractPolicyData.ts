import { GoogleGenAI, Type } from '@google/genai';

export interface ExtractedPolicyData {
  sigortaSirketi: string | null;
  musteriAdi: string | null;
  policeNo: string | null;
  plaka: string | null;
  sigortaTuru: string | null;
  netPrim: number | null;
  brutPrim: number | null;
  acente: string | null;
}

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // "data:application/pdf;base64,AAAA..." -> sadece AAAA... kısmını al
      resolve(result.split(',')[1]);
    };
    reader.onerror = () => reject(new Error('Dosya okunamadı.'));
    reader.readAsDataURL(file);
  });
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    sigortaSirketi: { type: Type.STRING, nullable: true },
    musteriAdi: { type: Type.STRING, nullable: true },
    policeNo: { type: Type.STRING, nullable: true },
    plaka: { type: Type.STRING, nullable: true },
    sigortaTuru: { type: Type.STRING, nullable: true },
    netPrim: { type: Type.NUMBER, nullable: true },
    brutPrim: { type: Type.NUMBER, nullable: true },
    acente: { type: Type.STRING, nullable: true },
  },
  required: [
    'sigortaSirketi', 'musteriAdi', 'policeNo', 'plaka',
    'sigortaTuru', 'netPrim', 'brutPrim', 'acente',
  ],
};

const EXTRACTION_PROMPT = `
Sen bir Türk sigorta poliçesi belgesi analiz asistanısın. Sana verilen belge
(PDF veya fotoğraf/tarama) bir sigorta poliçesi, teklifi veya zeyilidir. Belgeyi
dikkatlice oku ve aşağıdaki alanları çıkar:

- sigortaSirketi: Poliçeyi düzenleyen ASIL sigorta şirketi. Genellikle sayfanın
  üst kısmındaki logo/antette veya alt kısımdaki "... SİGORTA A.Ş." imza
  bloğunda yazar. "Ö. SİGORTA ŞİRKETİ", "ÖNCEKİ ACENTE NO" gibi TRAMER/geçmiş
  poliçe bilgisi alanlarıyla KARIŞTIRMA — bunlar önceki sigortaya aittir, senin
  istediğin bu belgeyi düzenleyen şirket.
- musteriAdi: Sigortalı / sigorta ettiren kişi ya da kurumun adı soyadı/unvanı.
- policeNo: Poliçe numarası (ana numara; "/0" gibi yenileme ekini gerekmiyorsa
  ayırabilirsin ama tam numarayı da yazabilirsin).
- plaka: Araca ait plaka numarası. Belge bir araç poliçesi değilse veya plaka
  yoksa null döndür.
- sigortaTuru: Poliçe türü (ör. "Trafik Sigortası", "Kasko", "DASK", "Sağlık
  Sigortası", "İşyeri Sigortası" vb.) — belge başlığından ve teminat
  tablosundan çıkar.
- netPrim: Toplam net prim tutarı. Türkçe sayı biçimini ("12.329,64") normal
  ondalık sayıya çevir (12329.64). Sadece sayı, para birimi ekleme.
- brutPrim: Brüt prim / ödenecek toplam tutar. Aynı şekilde sayıya çevir.
- acente: Acente veya brokerin adı (varsa acente kodu ile birlikte).

Emin olmadığın veya belgede bulunmayan bir alan için ASLA tahmin uydurma,
null döndür. Sadece istenen JSON şemasına uygun yanıt ver.
`.trim();

export async function extractPolicyDataFromFile(
  file: File
): Promise<ExtractedPolicyData> {
  const base64Data = await fileToBase64(file);
  const mimeType = file.type || 'application/pdf';

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      { text: EXTRACTION_PROMPT },
      { inlineData: { mimeType, data: base64Data } },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const raw = response.text;
  if (!raw) {
    throw new Error('Belgeden veri okunamadı (boş yanıt).');
  }

  return JSON.parse(raw) as ExtractedPolicyData;
}