export type ParsedCustomer = {
  tcKimlikNo: string;
  adSoyad: string;
  telefon: string;
  email: string;
  referans: string;
  dogumTarihi: string;
  aracTipi: string;
  plakaNo: string;
  ruhsatBelgeNo: string;
  aracYili: string;
  aracMarkasi: string;
  aracModeli: string;
  aracKodu: string;
  motorNo: string;
  saseNo: string;
  uavtAdresKodu: string;
};

const empty: ParsedCustomer = {
  tcKimlikNo: '', adSoyad: '', telefon: '', email: '', referans: '',
  dogumTarihi: '', aracTipi: '', plakaNo: '', ruhsatBelgeNo: '',
  aracYili: '', aracMarkasi: '', aracModeli: '', aracKodu: '',
  motorNo: '', saseNo: '', uavtAdresKodu: '',
};

const normalize = (s: string) => s
  .replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ğ/g, 'G')
  .replace(/Ü/g, 'U').replace(/Ö/g, 'O').replace(/Ç/g, 'C');

type VEHICLE_TYPE_ENTRY = { aliases: string[]; label: string };

const VEHICLE_TYPE_KEYWORDS: VEHICLE_TYPE_ENTRY[] = [
  { aliases: ['OZEL AMACLI TASIT', 'OZEL AMACI TASIT'], label: 'Özel Amaçlı Taşıt' },
  { aliases: ['TARIM MAKINESI', 'TARIM MAKINESI'], label: 'Tarım Makinesi' },
  { aliases: ['IS MAKINESI'], label: 'İş Makinesi' },
  { aliases: ['KAMYONET'], label: 'Kamyonet' },
  { aliases: ['MOTORSIKLET', 'MOTOSIKLET'], label: 'Motorsiklet' },
  { aliases: ['MINIBUS', 'MINIBUS'], label: 'Minibüs' },
  { aliases: ['OTOBUS', 'OTOBUS'], label: 'Otobüs' },
  { aliases: ['TRAKTOR', 'TRAKTOR'], label: 'Traktör' },
  { aliases: ['ROMORK', 'ROMORK'], label: 'Römork' },
  { aliases: ['CEKICI', 'CEKICI'], label: 'Çekici' },
  { aliases: ['TAKSI', 'TAKSI'], label: 'Taksi' },
  { aliases: ['KAMYON'], label: 'Kamyon' },
  { aliases: ['TANKER'], label: 'Tanker' },
  { aliases: ['OTOMOBIL', 'OTOMOBIL'], label: 'Otomobil' },
  { aliases: ['OTO'], label: 'Oto' },
];

const VEHICLE_TYPE_KEYWORDS_SORTED = [...VEHICLE_TYPE_KEYWORDS].sort((a, b) =>
  Math.max(...b.aliases.map(x => normalize(x).length)) - Math.max(...a.aliases.map(x => normalize(x).length))
);

const VEHICLE_TYPE_MAP: Record<string, string> = {};
for (const entry of VEHICLE_TYPE_KEYWORDS) {
  for (const alias of entry.aliases) {
    VEHICLE_TYPE_MAP[normalize(alias).toLowerCase()] = entry.label;
  }
}

const KNOWN_BRANDS = [
  'TOFAS-FIAT', 'TOFAŞ-FİAT', 'FIAT', 'FİAT', 'RENAULT', 'FORD', 'VOLKSWAGEN', 'VW',
  'BMW', 'MERCEDES', 'AUDI', 'OPEL', 'PEUGEOT', 'CITROEN', 'TOYOTA', 'HONDA',
  'HYUNDAI', 'KIA', 'NISSAN', 'MAZDA', 'MITSUBISHI', 'SUBARU', 'VOLVO', 'SKODA',
  'SEAT', 'DACIA', 'CHEVROLET', 'ALFA ROMEO', 'JEEP', 'LAND ROVER', 'SUZUKI',
  'ISUZU', 'IVECO', 'MAN', 'BMC', 'TEMSA', 'FORD OTOSAN', 'KARSAN', 'BETO',
  'CITROEN', 'PEUGEOT', 'RENAULT', 'DACIA', 'TATA', 'ASHOK LEYLAND',
];

function findPhone(text: string): string {
  const candidates = text.match(/\b(0?5\d{9})\b/g) || text.match(/\b0\d{10}\b/g) || [];
  for (const c of candidates) if (c.length >= 10) return c;
  return '';
}

function findTC(text: string, phone: string): string {
  const all11 = text.match(/\b\d{11}\b/g) || [];
  for (const c of all11) {
    if (c === phone) continue;
    if (/^0?5\d{9}$/.test(c)) continue;
    return c;
  }
  return '';
}

function findDate(text: string): string {
  const m = text.match(/\b(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})\b/);
  if (!m) return '';
  const d = m[1].padStart(2, '0');
  const mo = m[2].padStart(2, '0');
  return `${d}.${mo}.${m[3]}`;
}

function findPlate(text: string): string {
  const m = text.match(/\b(\d{2})([A-Z]{1,4})(\d{2,4})\b/);
  return m ? m[0] : '';
}

function findRuhsat(text: string): string {
  const m = text.match(/\b([A-Z]{2}\d{6,8})\b/);
  return m ? m[0] : '';
}

function findYear(text: string, dogumTarihi: string): string {
  const birthYear = dogumTarihi ? dogumTarihi.split('.').pop() : '';
  const allYears = text.match(/\b((?:19|20)\d{2})\b/g) || [];
  for (const y of allYears) {
    if (y === birthYear) continue;
    return y;
  }
  return '';
}

function findAfterLabel(text: string, labels: string[]): string {
  for (const label of labels) {
    const pattern = new RegExp(`${label}\\s*[:\\s]*\\s*([A-Za-z0-9ÇĞİÖŞÜçğıöşü\\s.\\/-]+)`, 'iu');
    const m = text.match(pattern);
    if (m) return m[1].trim();
  }
  return '';
}

function findMotorNo(text: string): string {
  const labeled = findAfterLabel(text, ['MOTOR\\s*N?O?', 'MOTOR']);
  if (labeled) {
    const m = labeled.match(/([A-Z0-9]{6,})/);
    if (m) return m[1];
  }
  const m = text.match(/MOTOR\s+([A-Z0-9]{6,})/i);
  return m ? m[1] : '';
}

function findSaseNo(text: string): string {
  const labeled = findAfterLabel(text, ['SASE', 'SASI', 'ŞASE', 'ŞASİ']);
  if (labeled) {
    const m = labeled.match(/([A-Z0-9]{6,})/);
    if (m) return m[1];
  }
  const m = text.match(/(?:ŞASE|ŞASİ|SASE|SASI)\s+([A-Z0-9]{6,})/i);
  return m ? m[1] : '';
}

function findAracKodu(text: string): string {
  const m = text.match(/(?:OTO\s*KODU|ARAC\s*KODU|ARAÇ\s*KODU)\s*[:\\s]*\s*([\d\s]+)/i);
  if (m) return m[1].trim().replace(/\s+/g, ' ');
  return '';
}

function findUavtAdresKodu(text: string): string {
  const labeled = text.match(/UAVT\s*(?:ADRES\s*)?(?:KODU)?\s*[:\s]*\s*(\d{10})/i);
  if (labeled) return labeled[1];
  const all10 = text.match(/\b[1-9]\d{9}\b/g) || [];
  for (const c of all10) {
    if (/^0/.test(c)) continue;
    return c;
  }
  return '';
}

function findReferans(text: string): string {
  const groups = text.match(/\(([^)]+)\)/g) || [];
  for (const g of groups) {
    const inner = g.slice(1, -1).trim();
    if (/^[\d\s+]+$/.test(inner)) continue;
    let name = inner
      .replace(/\s+REFERANS(?:I)?$/i, '')
      .replace(/^REFERANS\s*[:\-]?\s*/i, '')
      .trim();
    if (name) return name;
  }
  const labeled = findAfterLabel(text, ['REFERANS']);
  if (labeled) {
    return labeled.replace(/\s+REFERANS(?:I)?$/i, '').trim();
  }
  return '';
}

function detectTypeFromEnd(modelText: string): { type: string; cleanedModel: string } {
  const trimmed = modelText.trim();
  if (!trimmed) return { type: '', cleanedModel: modelText };
  const normModel = normalize(trimmed.toUpperCase());
  for (const { aliases, label } of VEHICLE_TYPE_KEYWORDS_SORTED) {
    for (const alias of aliases) {
      const na = normalize(alias);
      if (!normModel.endsWith(na)) continue;
      const startPos = normModel.length - na.length;
      if (startPos > 0 && /\w/.test(normModel[startPos - 1])) continue;
      const cleaned = trimmed.substring(0, startPos).trim();
      return { type: label, cleanedModel: cleaned };
    }
  }
  return { type: '', cleanedModel: modelText };
}

function findTypeInText(text: string): string {
  const cleaned = text.replace(/OTO\s*KODU\s*[:\s]*[\d\s]+/gi, '');
  const norm = normalize(cleaned.toUpperCase());
  for (const { aliases, label } of VEHICLE_TYPE_KEYWORDS_SORTED) {
    for (const alias of aliases) {
      const na = normalize(alias);
      const regex = new RegExp(`\\b${na.replace(/\s+/g, '\\s+')}\\b`, 'i');
      if (regex.test(norm)) return label;
    }
  }
  return '';
}

function findVehicleInfo(text: string, dogumTarihi: string): { yil: string; marka: string; model: string; tipi: string } {
  let yil = '';
  let marka = '';
  let model = '';
  let tipi = '';

  const norm = normalize(text.toUpperCase());
  for (const brand of KNOWN_BRANDS) {
    const nb = normalize(brand.toUpperCase());
    if (norm.includes(nb)) {
      marka = brand;
      const idx = norm.indexOf(nb);
      const after = text.substring(idx + brand.length).trim();
      const yearM = after.match(/^(?:MODEL\s*)?(\d{4})?\s*(.+)/i);
      if (yearM) {
        if (yearM[1]) yil = yearM[1];
        let modelPart = (yearM[2] || after).replace(/^MODEL\s*/i, '').trim();
        const stopIdx = modelPart.search(/\b(?:OTO\s*KODU|MOTOR|SASE|SASI|ŞASE|ŞASİ)\b/i);
        if (stopIdx >= 0) modelPart = modelPart.substring(0, stopIdx).trim();
        const detected = detectTypeFromEnd(modelPart);
        model = detected.cleanedModel;
        tipi = detected.type;
      }
      break;
    }
  }

  if (!yil) yil = findYear(text, dogumTarihi);
  if (!tipi) tipi = findTypeInText(text);

  return { yil, marka, model, tipi };
}

function findName(text: string, tc: string, phone: string, plate: string): string {
  let cleaned = text;
  if (tc) cleaned = cleaned.replace(tc, '');
  if (phone) cleaned = cleaned.replace(phone, '');
  if (plate) cleaned = cleaned.replace(plate, '');
  cleaned = cleaned.replace(/\([^)]*\)/g, '');
  cleaned = cleaned.replace(/\d{1,2}[.\/-]\d{1,2}[.\/-]\d{4}/g, '');
  cleaned = cleaned.replace(/(?:MOTOR|SASE|SASI|ŞASE|ŞASİ|OTO\s*KODU|ARAC\s*KODU|ARAÇ\s*KODU|MODEL)[A-Z0-9ÇĞİÖŞÜçğıöşü\s:.\/-]+/gi, '');
  cleaned = cleaned.replace(/[A-Z]{2}\d{6,}/g, '').replace(/\b\d{4}\b/g, '');

  const tokens = cleaned.trim().split(/\s+/).filter(t => t.length >= 2 && /[A-ZÇĞİÖŞÜa-zçğıöşü]/.test(t) && !/^\d+$/.test(t));
  const nameTokens: string[] = [];
  for (const t of tokens) {
    if (KNOWN_BRANDS.some(b => normalize(b.toUpperCase()) === normalize(t.toUpperCase()))) break;
    if (VEHICLE_TYPE_MAP[normalize(t).toLowerCase()]) break;
    nameTokens.push(t);
    if (nameTokens.length >= 3) break;
  }
  return nameTokens.join(' ').trim();
}

export function isLikelyCustomerText(text: string): boolean {
  const trimmed = text.trim();
  if (/^\d{11}$/.test(trimmed)) return false;
  const hasTC = /\b\d{11}\b/.test(trimmed) && !/^\d{11}$/.test(trimmed);
  const hasPhone = /\b0?5\d{9}\b/.test(trimmed);
  const hasDate = /\b\d{1,2}[.\/-]\d{1,2}[.\/-]\d{4}\b/.test(trimmed);
  const hasPlate = /\b\d{2}[A-Z]{1,4}\d{2,4}\b/.test(trimmed);
  const hasReference = /\([^)]*[A-Za-zÇĞİÖŞÜçğıöşü][^)]*\)/.test(trimmed);
  const longEnough = trimmed.length > 20;
  return longEnough && (hasTC || hasPhone || hasDate || hasPlate || hasReference || findMotorNo(trimmed).length > 0 || findSaseNo(trimmed).length > 0);
}

export function parseCustomerClipboard(text: string): ParsedCustomer {
  const result = { ...empty };
  if (!text || !text.trim()) return result;

  const raw = text.trim();

  if (/^\d{11}$/.test(raw)) { result.tcKimlikNo = raw; return result; }

  result.telefon = findPhone(raw);
  result.tcKimlikNo = findTC(raw, result.telefon);
  result.dogumTarihi = findDate(raw);
  result.plakaNo = findPlate(raw);
  result.ruhsatBelgeNo = findRuhsat(raw);
  result.motorNo = findMotorNo(raw);
  result.saseNo = findSaseNo(raw);
  result.aracKodu = findAracKodu(raw);
  result.referans = findReferans(raw);
  result.uavtAdresKodu = findUavtAdresKodu(raw);

  const veh = findVehicleInfo(raw, result.dogumTarihi);
  result.aracYili = veh.yil;
  result.aracMarkasi = veh.marka;
  result.aracModeli = veh.model;
  result.aracTipi = veh.tipi;

  result.adSoyad = findName(raw, result.tcKimlikNo, result.telefon, result.plakaNo);

  return result;
}

export function countFilled(parsed: ParsedCustomer): number {
  return Object.values(parsed).filter(v => v && v.trim().length > 0).length;
}

export function extractUavtCode(text: string): string {
  const trimmed = text.trim();
  if (/^[1-9]\d{9}$/.test(trimmed)) return trimmed;
  return findUavtAdresKodu(text);
}

function findAfterLabelRegex(text: string, labels: RegExp[]): string {
  for (const label of labels) {
    const m = text.match(label);
    if (m && m[1]) return m[1].trim();
  }
  return '';
}

function findLabeledField(text: string, fieldLabels: RegExp[]): string {
  return findAfterLabelRegex(text, fieldLabels);
}

const AD_SOYAD_LABELS = [/müşteri\s*adı\s*soyadı\s*[:\-]?\s*(.+)/i, /ad\s*soyad\s*[:\-]?\s*(.+)/i];
const TELEFON_LABELS = [/telefon\s*numarası\s*[:\-]?\s*(.+)/i, /telefon\s*[:\-]?\s*(.+)/i, /tel\s*[:\-]?\s*(.+)/i];
const REFERANS_LABELS = [/referans\s*[:\-]?\s*(.+)/i];
const TC_LABELS = [/t\.?\s*c\.?\s*kimlik\s*(?:no)?\s*[:\-]?\s*(\d+)/i, /tc\s*[:\-]?\s*(\d+)/i, /tckn\s*[:\-]?\s*(\d+)/i];
const DOGUM_LABELS = [/doğum\s*tarihi\s*[:\-]?\s*(.+)/i, /doğum\s*[:\-]?\s*(.+)/i];
const PLAKA_LABELS = [/plaka\s*(?:no)?\s*[:\-]?\s*(.+)/i];
const RUHSAT_LABELS = [/ruhsat\s*belge\s*no\s*[:\-]?\s*(.+)/i, /ruhsat\s*[:\-]?\s*(.+)/i, /belge\s*no\s*[:\-]?\s*(.+)/i];
const YIL_LABELS = [/araç\s*yılı\s*[:\-]?\s*(\d{4})/i, /model\s*yılı\s*[:\-]?\s*(\d{4})/i, /yıl\s*[:\-]?\s*(\d{4})/i];
const MARKA_LABELS = [/araç\s*markası\s*[:\-]?\s*(.+)/i, /marka\s*[:\-]?\s*(.+)/i];
const MODEL_LABELS = [/araç\s*modeli\s*[:\-]?\s*(.+)/i, /model\s*[:\-]?\s*(.+)/i];
const TIP_LABELS = [/araç\s*tipi\s*[:\-]?\s*(.+)/i, /tip\s*[:\-]?\s*(.+)/i];
const KOD_LABELS = [/araç\s*kodu\s*[:\-]?\s*(.+)/i, /kod\s*[:\-]?\s*(.+)/i];
const MOTOR_LABELS = [/motor\s*no\s*[:\-]?\s*(.+)/i, /motor\s*[:\-]?\s*(.+)/i];
const SASE_LABELS = [/şase\s*no\s*[:\-]?\s*(.+)/i, /şasi\s*no\s*[:\-]?\s*(.+)/i, /sase\s*no\s*[:\-]?\s*(.+)/i, /sasi\s*no\s*[:\-]?\s*(.+)/i, /şase\s*[:\-]?\s*(.+)/i, /şasi\s*[:\-]?\s*(.+)/i, /sase\s*[:\-]?\s*(.+)/i, /sasi\s*[:\-]?\s*(.+)/i];

function cleanValue(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

function parseLabeledBlock(text: string): ParsedCustomer {
  const result = { ...empty };

  let val: string;

  val = findLabeledField(text, AD_SOYAD_LABELS);
  if (val) result.adSoyad = cleanValue(val);

  val = findLabeledField(text, TELEFON_LABELS);
  if (val) result.telefon = val.replace(/\D/g, '');

  val = findLabeledField(text, REFERANS_LABELS);
  if (val) result.referans = cleanValue(val);

  val = findLabeledField(text, TC_LABELS);
  if (val) result.tcKimlikNo = val.replace(/\D/g, '');

  val = findLabeledField(text, DOGUM_LABELS);
  if (val) {
    const dm = val.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/);
    if (dm) result.dogumTarihi = `${dm[1].padStart(2, '0')}.${dm[2].padStart(2, '0')}.${dm[3]}`;
  }

  val = findLabeledField(text, PLAKA_LABELS);
  if (val) result.plakaNo = val.replace(/\s+/g, '').toUpperCase().replace(/[^0-9A-Z]/g, '');

  val = findLabeledField(text, RUHSAT_LABELS);
  if (val) result.ruhsatBelgeNo = val.replace(/\s+/g, '').toUpperCase().replace(/[^0-9A-Z]/g, '');

  val = findLabeledField(text, YIL_LABELS);
  if (val) result.aracYili = val;

  val = findLabeledField(text, MARKA_LABELS);
  if (val) result.aracMarkasi = cleanValue(val);

  val = findLabeledField(text, MODEL_LABELS);
  if (val) result.aracModeli = cleanValue(val);

  val = findLabeledField(text, TIP_LABELS);
  if (val) result.aracTipi = cleanValue(val);

  val = findLabeledField(text, KOD_LABELS);
  if (val) result.aracKodu = cleanValue(val);

  val = findLabeledField(text, MOTOR_LABELS);
  if (val) result.motorNo = val.replace(/\s+/g, '').toUpperCase().replace(/[^0-9A-Z]/g, '');

  val = findLabeledField(text, SASE_LABELS);
  if (val) result.saseNo = val.replace(/\s+/g, '').toUpperCase().replace(/[^0-9A-Z]/g, '');

  return result;
}

function mergeParsed(labeled: ParsedCustomer, fallback: ParsedCustomer): ParsedCustomer {
  const out = { ...empty };
  (Object.keys(out) as (keyof ParsedCustomer)[]).forEach(k => {
    const lv = labeled[k] || '';
    const fv = fallback[k] || '';
    out[k] = lv || fv;
  });
  return out;
}

export function parseBulkCustomerText(text: string): ParsedCustomer[] {
  if (!text || !text.trim()) return [];
  const normalized = text.replace(/\r\n/g, '\n');
  const blocks = normalized.split(/^-{3,}$/m).map(b => b.trim()).filter(b => b.length > 0);

  const results: ParsedCustomer[] = [];
  for (const block of blocks) {
    const labeled = parseLabeledBlock(block);
    const fallback = parseCustomerClipboard(block);
    const merged = mergeParsed(labeled, fallback);
    if (merged.adSoyad || merged.plakaNo || merged.tcKimlikNo) {
      results.push(merged);
    }
  }

  if (results.length === 0) {
    const lines = normalized.split('\n');
    const currentLines: string[] = [];
    const flush = () => {
      if (currentLines.length === 0) return;
      const blockText = currentLines.join('\n');
      const labeled = parseLabeledBlock(blockText);
      const fallback = parseCustomerClipboard(blockText);
      const merged = mergeParsed(labeled, fallback);
      if (merged.adSoyad || merged.plakaNo || merged.tcKimlikNo) {
        results.push(merged);
      }
      currentLines.length = 0;
    };
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '') {
        flush();
      } else {
        currentLines.push(line);
      }
    }
    flush();
  }
  return results;
}
