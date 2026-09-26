import { useState, type FormEvent } from 'react';
import { Ban, Search, Undo2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { stripMissingColumns } from '@/lib/policyColumns';
import { PolicyFormFields, policyToFormState, type Agency, type PolicyFormState } from '@/components/PolicyFormFields';
import type { Policy, InsuranceCompany, InsuranceBranch, BankAccount } from '@/lib/types';

const CANCEL_REASONS = ['Müşteri talebi', 'Satış/araç devri', 'Başka şirkete geçiş', 'Ödeme yapılmadı', 'Diğer'] as const;

export function PolicyCancellationPage({
  policies,
  agencies,
  companies,
  branches,
  bankAccounts,
  refresh,
}: {
  policies: Policy[];
  agencies: Agency[];
  companies: InsuranceCompany[];
  branches: InsuranceBranch[];
  bankAccounts: BankAccount[];
  refresh: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [form, setForm] = useState<PolicyFormState>(policyToFormState());
  const [readOnly, setReadOnly] = useState(true);
  const [cancelDate, setCancelDate] = useState(new Date().toISOString().slice(0, 10));
  const [cancelReason, setCancelReason] = useState<string>('');
  const [otherReason, setOtherReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [cancelNetPrim, setCancelNetPrim] = useState('');
  const [cancelNote, setCancelNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const activePolicies = policies.filter(p => !p.iptal);
  const cancelledPolicies = policies.filter(p => p.iptal);

  const searchResults = search
    ? activePolicies.filter(p =>
        `${p.musteri_adi} ${p.police_no} ${p.belge_seri_no || ''} ${p.plaka}`.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  function selectPolicy(p: Policy) {
    setSelectedPolicy(p);
    setForm(policyToFormState(p));
    setReadOnly(true);
    setSearch('');
    setCancelDate(new Date().toISOString().slice(0, 10));
    setCancelReason('');
    setOtherReason('');
    setRefundAmount('');
    setCancelNetPrim('');
    setCancelNote('');
  }

  function update(key: string, value: string) {
    setForm(v => {
      const next = { ...v, [key]: value };
      if (key === 'branch_group') next.sigorta_turu = '';
      if (key === 'uretim_tipi') next.agency_id = '';
      return next;
    });
  }

  async function doCancel() {
    if (!selectedPolicy) return;
    setConfirmOpen(false);
    setSaving(true);
    const reason = cancelReason === 'Diğer' ? otherReason : cancelReason;
    const payload = {
      ...form,
      belge_seri_no: form.belge_seri_no.trim(),
      baslangic_tarihi: (() => { if (!form.bitis_tarihi) return ''; const d = new Date(`${form.bitis_tarihi}T00:00:00`); d.setDate(d.getDate() - 365); return d.toISOString().slice(0, 10); })(),
      net_prim: Number(String(form.net_prim).replace(',', '.')) || 0,
      brut_prim: Number(String(form.brut_prim).replace(',', '.')) || 0,
      iptal: true,
      durum: 'iptal',
      iptal_tarihi: cancelDate,
      iptal_nedeni: reason,
      iade_tutari: refundAmount ? Number(refundAmount) : null,
      iptal_net_prim: cancelNetPrim ? Number(String(cancelNetPrim).replace(',', '.')) : null,
      iptal_notu: cancelNote || null,
    };
    const cleanPayload = stripMissingColumns(payload);
    const result = await supabase.from('policies').update(cleanPayload).eq('id', selectedPolicy.id);
    setSaving(false);
    if (result.error) {
      console.error('Poliçe iptal hatası:', result.error);
      alert('Poliçe iptal edilemedi: ' + result.error.message + '\n\nLütfen tekrar deneyin.');
      return;
    }
    setSelectedPolicy(null);
    refresh();
  }

  async function undoCancel(p: Policy) {
    if (!window.confirm('Bu poliçenin iptalini geri almak istediğinize emin misiniz?')) return;
    const undoPayload = stripMissingColumns({
      iptal: false,
      durum: 'aktif',
      iptal_tarihi: null,
      iptal_nedeni: null,
      iade_tutari: null,
      iptal_net_prim: null,
      iptal_notu: null,
    });
    const result = await supabase.from('policies').update(undoPayload).eq('id', p.id);
    if (result.error) { console.error('İptal geri alma hatası:', result.error); alert('İptal geri alınamadı: ' + result.error.message); }
    else refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Poliçe İptali</h2>
          <p className="text-sm text-slate-500 mt-1">Poliçeyi iptal edin, iptal bilgilerini kaydedin ve geçmişi görüntüleyin.</p>
        </div>
      </div>

      <div className="card mb-5 overflow-hidden">
        <div className="teal-strip"><span>İptal Edilecek Poliçeyi Seç</span></div>
        <div className="p-5">
          <div className="search max-w-xl"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Poliçe no, müşteri adı, plaka veya belge seri no ile ara..." />{search && <button type="button" onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-700" title="Temizle"><X size={16} /></button>}</div>
          {search && searchResults.length > 0 && (
            <div className="mt-3 border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {searchResults.map(p => (
                <button key={p.id} onClick={() => selectPolicy(p)} className="w-full text-left px-4 py-3 hover:bg-teal-50 transition flex items-center justify-between gap-3">
                  <div>
                    <span className="font-semibold text-slate-800">{p.musteri_adi}</span>
                    <span className="text-xs text-slate-500 ml-2">· {p.sigorta_sirketi}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {p.police_no && <span className="font-mono">{p.police_no}</span>}
                    {p.plaka && <span className="ml-2">{p.plaka}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
          {search && searchResults.length === 0 && (
            <div className="mt-3 text-sm text-slate-400 text-center py-4">Sonuç bulunamadı.</div>
          )}
        </div>
      </div>

      {selectedPolicy && (
        <div className="card mb-5 overflow-hidden">
          <div className="teal-strip">
            <span>Poliçe Bilgileri</span>
            <button onClick={() => setReadOnly(v => !v)} className="text-xs font-semibold text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition">
              {readOnly ? 'Bilgileri Düzenle' : 'Düzenlemeyi Kapat'}
            </button>
          </div>
          <PolicyFormFields
            form={form}
            update={update}
            companies={companies}
            branches={branches}
            bankAccounts={bankAccounts}
            agencyList={agencies}
            readOnly={readOnly}
            showRecordType={false}
            showOcr={false}
            existingFile={selectedPolicy.file_name}
          />
          <div className="px-6 pb-6">
            <div className="border-t border-slate-200 pt-6">
              <h3 className="font-bold text-slate-800 mb-4">İptal Bilgileri</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                <label className="field">İptal Tarihi <span className="text-red-500">*</span><input required type="date" value={cancelDate} onChange={e => setCancelDate(e.target.value)} /></label>
                <label className="field">İptal Nedeni <span className="text-red-500">*</span>
                  <select required value={cancelReason} onChange={e => setCancelReason(e.target.value)}>
                    <option value="">Seçiniz</option>
                    {CANCEL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
                <label className="field">İade Tutarı (Opsiyonel)<input type="number" step="0.01" min="0" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} placeholder="0" /></label>
                <label className="field">İptal Net Prim (Opsiyonel)<input type="number" step="0.01" min="0" inputMode="decimal" value={cancelNetPrim} onChange={e => setCancelNetPrim(e.target.value)} placeholder="0" /></label>
                {cancelReason === 'Diğer' && <label className="field md:col-span-2 xl:col-span-3">Diğer Neden Açıklaması<input value={otherReason} onChange={e => setOtherReason(e.target.value)} placeholder="İptal nedenini açıklayın" /></label>}
                <label className="field md:col-span-2 xl:col-span-3">Açıklama / Not (Opsiyonel)<textarea value={cancelNote} onChange={e => setCancelNote(e.target.value)} placeholder="Ek açıklama" rows={2} /></label>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-3">
            <button type="button" onClick={() => setSelectedPolicy(null)} className="btn-secondary">Vazgeç</button>
            <button type="button" disabled={saving || !cancelReason} onClick={() => setConfirmOpen(true)} className="btn-primary" style={{ background: '#dc2626' }}>
              {saving ? 'İptal ediliyor...' : <><Ban size={16} className="inline mr-1" /> Poliçeyi İptal Et</>}
            </button>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="modal-backdrop">
          <div className="modal" style={{ width: 'min(100%, 440px)' }}>
            <div className="text-center">
              <div className="mx-auto size-14 rounded-full bg-red-100 flex items-center justify-center mb-4"><Ban size={28} className="text-red-600" /></div>
              <h3 className="font-bold text-lg text-slate-900">Poliçeyi İptal Et</h3>
              <p className="text-sm text-slate-600 mt-3">Bu poliçeyi iptal etmek istediğinize emin misiniz? Poliçe silinmeyecek, durumu "İptal" olarak güncellenecek.</p>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="btn-secondary flex-1" onClick={() => setConfirmOpen(false)}>Hayır, Vazgeç</button>
              <button className="btn-primary flex-1" style={{ background: '#dc2626' }} onClick={doCancel}>Evet, İptal Et</button>
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="teal-strip"><span>İptal Edilen Poliçeler <small>({cancelledPolicies.length})</small></span></div>
        <div className="overflow-x-auto">
          <table>
            <thead><tr><th>Müşteri</th><th>Poliçe No</th><th>Sigorta Şirketi</th><th>İptal Tarihi</th><th>İptal Nedeni</th><th>İade Tutarı</th><th>İptal Net Prim</th><th>İşlem</th></tr></thead>
            <tbody>
              {cancelledPolicies.length ? cancelledPolicies.map(p => (
                <tr key={p.id} className="bg-red-50/50">
                  <td className="font-semibold text-slate-800">{p.musteri_adi}</td>
                  <td className="font-mono text-xs">{p.police_no || '--'}</td>
                  <td>{p.sigorta_sirketi}</td>
                  <td>{p.iptal_tarihi || '--'}</td>
                  <td>{p.iptal_nedeni || '--'}</td>
                  <td>{p.iade_tutari != null ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(Number(p.iade_tutari)) : '--'}</td>
                  <td>{p.iptal_net_prim != null ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(Number(p.iptal_net_prim)) : '--'}</td>
                  <td><button className="btn-secondary py-2 px-3" onClick={() => undoCancel(p)} title="İptali Geri Al"><Undo2 size={14} /> Geri Al</button></td>
                </tr>
              )) : <tr><td colSpan={8} className="empty">İptal edilmiş poliçe bulunmuyor.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
