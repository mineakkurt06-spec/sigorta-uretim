import { Banknote, CreditCard } from 'lucide-react';
import { OcrUploadButton } from '@/components/OcrUploadButton';
import type { ExtractedPolicyData } from '@/lib/ocr/extractPolicyData';
import type { Policy, InsuranceCompany, InsuranceBranch, BankAccount } from '@/lib/types';

export type Agency = { id: string; name: string; commission_rate?: number; is_external?: boolean; created_at?: string };

export type PolicyFormState = {
  record_type: string;
  sigorta_sirketi: string;
  musteri_adi: string;
  police_no: string;
  belge_seri_no: string;
  plaka: string;
  net_prim: string;
  brut_prim: string;
  bitis_tarihi: string;
  tanzim_tarihi: string;
  sigorta_turu: string;
  branch_group: string;
  agency_id: string;
  odeme_durumu: string;
  payment_method: string;
  aciklama: string;
  bank_account_id: string;
  issuing_agency_id: string;
  uretim_tipi: string;
};

export const emptyPolicyFormState: PolicyFormState = {
  record_type: 'uretim',
  sigorta_sirketi: '',
  musteri_adi: '',
  police_no: '',
  belge_seri_no: '',
  plaka: '',
  net_prim: '',
  brut_prim: '',
  bitis_tarihi: '',
  tanzim_tarihi: new Date().toISOString().slice(0, 10),
  sigorta_turu: '',
  branch_group: '',
  agency_id: '',
  odeme_durumu: 'verecek',
  payment_method: 'Nakit',
  aciklama: '',
  bank_account_id: '',
  issuing_agency_id: '',
  uretim_tipi: 'ic',
};

export function policyToFormState(policy?: Policy): PolicyFormState {
  if (!policy) return { ...emptyPolicyFormState };
  return {
    record_type: policy.record_type || 'uretim',
    sigorta_sirketi: policy.sigorta_sirketi || '',
    musteri_adi: policy.musteri_adi || '',
    police_no: policy.police_no || '',
    belge_seri_no: policy.belge_seri_no || '',
    plaka: policy.plaka || '',
    net_prim: String(policy.net_prim || ''),
    brut_prim: String(policy.brut_prim || ''),
    bitis_tarihi: policy.bitis_tarihi || '',
    tanzim_tarihi: policy.tanzim_tarihi || new Date().toISOString().slice(0, 10),
    sigorta_turu: policy.sigorta_turu || '',
    branch_group: policy.branch_group || '',
    agency_id: policy.agency_id || '',
    odeme_durumu: policy.odeme_durumu || 'verecek',
    payment_method: policy.payment_method || 'Nakit',
    aciklama: policy.aciklama || '',
    bank_account_id: policy.bank_account_id || '',
    issuing_agency_id: policy.issuing_agency_id || '',
    uretim_tipi: policy.uretim_tipi || 'ic',
  };
}

export const normalizeTr = (s: string) => s.replace(/İ/g, 'I').replace(/ı/g, 'i').replace(/Ş/g, 'S').replace(/ş/g, 's').replace(/Ğ/g, 'G').replace(/ğ/g, 'g').replace(/Ç/g, 'C').replace(/ç/g, 'c').replace(/Ü/g, 'U').replace(/ü/g, 'u').replace(/Ö/g, 'O').replace(/ö/g, 'o').replace(/\s+/g, ' ').trim().toLowerCase();

export const parseAmount = (value: string) => { const normalized = value.trim().replace(/\s/g, ''); if (!normalized) return 0; const lastComma = normalized.lastIndexOf(','); const lastDot = normalized.lastIndexOf('.'); if (lastComma >= 0 && lastDot >= 0) return Number(lastComma > lastDot ? normalized.replace(/\./g, '').replace(',', '.') : normalized.replace(/,/g, '')); if (lastComma >= 0) return Number(normalized.replace(',', '.')); return Number(normalized); };

export const dateBeforeOneYear = (date: string) => { if (!date) return ''; const d = new Date(`${date}T00:00:00`); d.setDate(d.getDate() - 365); return d.toISOString().slice(0, 10); };

export const commissionRateFor = (agency: Agency) => agency.commission_rate != null ? Number(agency.commission_rate) / 100 : 0.06;

export const money = (value: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value || 0);

export function sigortaTuruToBranchGroup(turu: string): string {
  const n = normalizeTr(turu);
  if (n.includes('trafik') || n.includes('kasko') || n.includes('yesil') || n.includes('imm') || n.includes('ferdi')) return 'OTO';
  if (n.includes('konut') || n.includes('kira') || n.includes('isyeri') || n.includes('is yeri') || n.includes('dask')) return 'KONUT';
  if (n.includes('hayat') || n.includes('saglik') || n.includes('seyahat')) return 'HAYAT';
  return 'DIGER';
}

export function PolicyFormFields({
  form,
  update,
  companies,
  branches,
  bankAccounts,
  agencyList,
  readOnly = false,
  showRecordType = true,
  showOcr = false,
  onOcrExtracted,
  dupError = '',
  existingFile,
}: {
  form: PolicyFormState;
  update: (key: string, value: string) => void;
  companies: InsuranceCompany[];
  branches: InsuranceBranch[];
  bankAccounts: BankAccount[];
  agencyList: Agency[];
  readOnly?: boolean;
  showRecordType?: boolean;
  showOcr?: boolean;
  onOcrExtracted?: (data: ExtractedPolicyData, ocrFile: File) => void;
  dupError?: string;
  existingFile?: string | null;
}) {
  const filteredBranches = form.branch_group ? branches.filter(b => b.branch_group === form.branch_group) : branches;
  const uniqueBankNames = [...new Set(bankAccounts.map(b => b.bank_name))];
  const agencyOptions = form.uretim_tipi === 'dis' ? agencyList.filter(a => a.is_external) : agencyList.filter(a => !a.is_external);

  const inputCls = readOnly ? 'opacity-70 bg-slate-50' : '';

  function handleOcrExtracted(data: ExtractedPolicyData, ocrFile: File) {
    if (!onOcrExtracted) return;
    const branchGroup = data.sigortaTuru ? sigortaTuruToBranchGroup(data.sigortaTuru) : '';
    const matchedBranch = branchGroup ? branches.find(b => b.branch_group === branchGroup && normalizeTr(b.name) === normalizeTr(data.sigortaTuru || '')) : null;
    const partialBranch = !matchedBranch && branchGroup ? branches.find(b => b.branch_group === branchGroup && (normalizeTr(b.name).includes(normalizeTr(data.sigortaTuru || '')) || normalizeTr(data.sigortaTuru || '').includes(normalizeTr(b.name)))) : null;
    onOcrExtracted(data, ocrFile);
    update('sigorta_sirketi', data.sigortaSirketi || form.sigorta_sirketi);
    update('musteri_adi', data.musteriAdi || form.musteri_adi);
    update('police_no', data.policeNo || form.police_no);
    update('belge_seri_no', data.belgeSeriNo || form.belge_seri_no);
    update('plaka', data.plaka || form.plaka);
    update('sigorta_turu', matchedBranch?.name || partialBranch?.name || data.sigortaTuru || form.sigorta_turu);
    update('branch_group', data.sigortaTuru ? branchGroup : form.branch_group);
    update('bitis_tarihi', data.bitisTarihi || form.bitis_tarihi);
    update('net_prim', data.netPrim || form.net_prim);
    update('brut_prim', data.brutPrim || form.brut_prim);
    update('agency_id', data.acente || form.agency_id);
    update('odeme_durumu', 'verdi');
    update('payment_method', 'Nakit');
  }

  return <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
    {showRecordType && <label className="field md:col-span-2 xl:col-span-3">Kayıt Tipi<select value={form.record_type} onChange={e => update('record_type', e.target.value)} disabled={readOnly}><option value="uretim">Üretim</option><option value="iptal">İptal</option><option value="ek_primli_zeyil">Ek Primli Zeyil</option><option value="iadeli_zeyil">İadeli Zeyil</option><option value="primsiz_zeyil">Primsiz Zeyil</option></select></label>}
    {showOcr && !readOnly && <div className="md:col-span-2 xl:col-span-3"><OcrUploadButton onExtracted={handleOcrExtracted} companies={companies} agencies={agencyList} /></div>}
    <label className="field">Sigorta Şirketi<select required value={form.sigorta_sirketi} onChange={e => update('sigorta_sirketi', e.target.value)} disabled={readOnly} className={inputCls}><option value="">Şirket seçin</option>{companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}{form.sigorta_sirketi && !companies.some(c => c.name === form.sigorta_sirketi) ? <option value={form.sigorta_sirketi}>{form.sigorta_sirketi} (listede yok)</option> : null}</select></label>
    <label className="field">Müşteri Adı / Ünvan<input required value={form.musteri_adi} onChange={e => update('musteri_adi', e.target.value)} readOnly={readOnly} className={inputCls} /></label>
    <label className="field">Poliçe No<input value={form.police_no} onChange={e => update('police_no', e.target.value)} readOnly={readOnly} className={inputCls} /></label>
    <label className="field">Belge Seri No<input value={form.belge_seri_no} onChange={e => update('belge_seri_no', e.target.value.toUpperCase().slice(0, 30))} placeholder="Örn: AB 123456" maxLength={30} readOnly={readOnly} className={inputCls} />{form.belge_seri_no && !/^[A-Z0-9 ]*$/.test(form.belge_seri_no) && <span className="text-xs text-red-500 mt-1 block">Sadece harf ve rakam girilebilir.</span>}</label>
    {dupError && <div className="md:col-span-2 xl:col-span-3 text-sm text-red-600 bg-red-50 rounded-lg p-3">{dupError}</div>}
    <label className="field">Plaka<input value={form.plaka} onChange={e => update('plaka', e.target.value.toUpperCase())} placeholder="34 ABC 123" readOnly={readOnly} className={inputCls} /></label>
    <label className="field">Branş Grubu<select value={form.branch_group} onChange={e => update('branch_group', e.target.value)} disabled={readOnly} className={inputCls}><option value="">Seçiniz</option><option value="OTO">OTO</option><option value="KONUT">KONUT</option><option value="HAYAT">HAYAT</option><option value="DIGER">DİĞER</option></select></label>
    <label className="field">Sigorta Türü<select value={form.sigorta_turu} onChange={e => update('sigorta_turu', e.target.value)} disabled={readOnly} className={inputCls}><option value="">Seçiniz</option>{filteredBranches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}</select></label>
    <label className="field">Net Prim<input required inputMode="decimal" type="text" value={form.net_prim} onChange={e => update('net_prim', e.target.value)} readOnly={readOnly} className={inputCls} /></label>
    <label className="field">Brüt Prim<input required inputMode="decimal" type="text" value={form.brut_prim} onChange={e => update('brut_prim', e.target.value)} readOnly={readOnly} className={inputCls} /></label>
    <label className="field">{form.uretim_tipi === 'dis' ? 'Dış Acente' : 'Acente'}<select required value={form.agency_id} onChange={e => update('agency_id', e.target.value)} disabled={readOnly} className={inputCls}><option value="">Acente seçin</option>{agencyOptions.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
    <label className="field">Üretim Tipi<select value={form.uretim_tipi} onChange={e => update('uretim_tipi', e.target.value)} disabled={readOnly} className={inputCls}><option value="ic">İç Üretim</option><option value="dis">Dış Üretim</option></select></label>
    {form.uretim_tipi === 'dis' && <label className="field">Kestiren Acente<select required value={form.issuing_agency_id} onChange={e => update('issuing_agency_id', e.target.value)} disabled={readOnly} className={inputCls}><option value="">Acente seçin</option>{agencyList.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
    {form.agency_id && form.uretim_tipi === 'ic' && (() => { const agency = agencyList.find(a => a.id === form.agency_id); const rate = agency ? commissionRateFor(agency) : 0; const commission = parseAmount(form.net_prim) * rate; return <div className="field md:col-span-2 xl:col-span-3"><div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-sm"><span className="text-teal-800 font-semibold">Acente Komisyonu: </span><span className="text-teal-700">{money(commission)}</span><span className="text-teal-600 text-xs ml-2">(Net Prim × %{(rate * 100).toString().replace('.', ',')})</span></div></div>; })()}
    <label className="field">Ödeme Durumu<select value={form.odeme_durumu} onChange={e => { update('odeme_durumu', e.target.value); update('payment_method', e.target.value === 'verecek' ? 'VERECEK' : 'Nakit'); }} disabled={readOnly} className={inputCls}><option value="verecek">Verecek</option><option value="verdi">Verdi</option></select></label>
    {form.odeme_durumu === 'verdi' && <label className="field">Ödeme Yöntemi<select value={form.payment_method} onChange={e => update('payment_method', e.target.value)} disabled={readOnly} className={inputCls}><option value="Nakit">Nakit</option><option value="Kredi Kartı">Kredi Kartı</option></select></label>}
    {form.odeme_durumu === 'verecek' && !readOnly && <><label className="field">Banka Adı<select value={form.bank_account_id ? bankAccounts.find(b => b.id === form.bank_account_id)?.bank_name || '' : ''} onChange={e => { const bankName = e.target.value; const firstAccount = bankAccounts.find(b => b.bank_name === bankName); update('bank_account_id', firstAccount?.id || ''); }}><option value="">Banka seçin</option>{uniqueBankNames.map(bn => <option key={bn} value={bn}>{bn}</option>)}</select></label><label className="field">Hesap Adı<select value={form.bank_account_id} onChange={e => update('bank_account_id', e.target.value)}><option value="">Hesap seçin</option>{(bankAccounts.filter(b => b.bank_name === bankAccounts.find(bb => bb.id === form.bank_account_id)?.bank_name)).map(b => <option key={b.id} value={b.id}>{b.account_name} (Limit: {money(Number(b.card_limit))})</option>)}</select></label></>}
    {form.odeme_durumu === 'verecek' && <label className="field md:col-span-2 xl:col-span-3">Verecek Açıklaması<textarea value={form.aciklama} onChange={e => update('aciklama', e.target.value)} placeholder="Ödeme bekleme açıklaması" rows={3} readOnly={readOnly} className={inputCls} /></label>}
    <label className="field">Bitiş Tarihi<input required type="date" value={form.bitis_tarihi} onChange={e => update('bitis_tarihi', e.target.value)} readOnly={readOnly} className={inputCls} /></label>
    <label className="field">Başlangıç Tarihi <span className="text-[11px] font-normal text-slate-400">Bitiş tarihinden otomatik hesaplanır</span><input readOnly value={dateBeforeOneYear(form.bitis_tarihi)} /></label>
    <label className="field">Tanzim Tarihi<input type="date" value={form.tanzim_tarihi} onChange={e => update('tanzim_tarihi', e.target.value)} readOnly={readOnly} className={inputCls} /></label>
    {existingFile && <div className="field md:col-span-2 xl:col-span-3"><span className="text-xs text-emerald-700">Mevcut dosya: {existingFile}</span></div>}
  </div>;
}
