import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Plus, Trash2, FileSpreadsheet, X, Phone, Pencil, Search, StickyNote, Scan } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Quote, QuoteItem, InsuranceCompany, InsuranceBranch, Agency, Customer } from '@/lib/types';
import { GroupBadge } from './BranchesPage';
import { OcrQuoteModal, type OcrQuoteItem } from './OcrQuoteModal';

const money = (value: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value || 0);

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  bekliyor: { label: 'Bekliyor', color: '#b45309', bg: '#fef3c7' },
  arandi: { label: 'Arandı', color: '#1d4ed8', bg: '#dbeafe' },
  onaylandi: { label: 'Onaylandı', color: '#047857', bg: '#d1fae5' },
  reddedildi: { label: 'Reddedildi', color: '#b91c1c', bg: '#fee2e2' },
  acik: { label: 'Bekliyor', color: '#b45309', bg: '#fef3c7' },
  kapali: { label: 'Kapalı', color: '#475569', bg: '#f1f5f9' },
};

function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <div className="flex flex-wrap items-start justify-between gap-4 mb-6"><div><h2 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>{subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}</div>{action}</div>;
}

export function QuotesPage({ quotes, quoteItems, companies, branches, agencies, customers, refresh }: { quotes: Quote[]; quoteItems: QuoteItem[]; companies: InsuranceCompany[]; branches: InsuranceBranch[]; agencies: Agency[]; customers: Customer[]; refresh: () => void }) {
  const [formOpen, setFormOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [branchGroup, setBranchGroup] = useState('');
  const [insuranceType, setInsuranceType] = useState('');
  const [agencyId, setAgencyId] = useState('');
  const [bitisTarihi, setBitisTarihi] = useState('');
  const [items, setItems] = useState<{ company_name: string; premium_amount: string; agency_id: string }[]>([{ company_name: '', premium_amount: '', agency_id: '' }]);
  const [busy, setBusy] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [tcSearch, setTcSearch] = useState('');
  const [tcDropdown, setTcDropdown] = useState(false);
  const tcRef = useRef<HTMLDivElement>(null);
  const [notes, setNotes] = useState('');
  const [detailNotes, setDetailNotes] = useState('');
  const [notesBusy, setNotesBusy] = useState(false);
  const [notesSavedAt, setNotesSavedAt] = useState<number | null>(null);
  const [ocrOpen, setOcrOpen] = useState(false);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (tcRef.current && !tcRef.current.contains(e.target as Node)) setTcDropdown(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function openNew() { setEditingQuote(null); setCustomerName(''); setPhone(''); setBranchGroup(''); setInsuranceType(''); setAgencyId(''); setBitisTarihi(''); setTcSearch(''); setNotes(''); setItems([{ company_name: '', premium_amount: '', agency_id: '' }]); setFormOpen(true); }

  function openEdit(q: Quote) {
    const existingItems = itemsForQuote(q.id);
    setEditingQuote(q);
    setCustomerName(q.customer_name);
    setPhone(q.phone || '');
    setBranchGroup(q.branch_group || '');
    setInsuranceType(q.insurance_type || '');
    setAgencyId(q.agency_id || '');
    setBitisTarihi(q.bitis_tarihi || '');
    setTcSearch('');
    setNotes(q.notes || '');
    setItems(existingItems.length ? existingItems.map(it => ({ company_name: it.company_name, premium_amount: String(it.premium_amount || 0), agency_id: it.agency_id || '' })).sort((a, b) => Number(a.premium_amount) - Number(b.premium_amount)) : [{ company_name: '', premium_amount: '', agency_id: '' }]);
    setSelectedQuote(null);
    setFormOpen(true);
  }

  const filteredBranches = branchGroup ? branches.filter(b => b.branch_group === branchGroup) : branches;

  const matchedCustomers = tcSearch.trim().length >= 1 ? customers.filter(c => (c.tc_vergi_no || '').toLowerCase().startsWith(tcSearch.trim().toLowerCase())).slice(0, 10) : [];

  function selectCustomer(c: Customer) {
    setTcSearch(c.tc_vergi_no || '');
    setCustomerName(c.ad_soyad_unvan || '');
    setPhone(c.telefon || '');
    setTcDropdown(false);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!customerName.trim()) return;
    if (items.every(it => !it.company_name.trim() && !it.premium_amount.trim())) { alert('En az bir şirket teklifi girin.'); return; }
    setBusy(true);
    const payload = { customer_name: customerName.trim(), phone: phone.trim() || null, branch_group: branchGroup || null, insurance_type: insuranceType || null, agency_id: agencyId || null, bitis_tarihi: bitisTarihi || null, notes: notes.trim() || null };
    let quoteId: string;
    if (editingQuote) {
      const updateResult = await supabase.from('quotes').update(payload).eq('id', editingQuote.id).select('id').single();
      if (updateResult.error || !updateResult.data) { setBusy(false); alert('Teklif güncellenemedi.'); return; }
      quoteId = updateResult.data.id;
      await supabase.from('quote_items').delete().eq('quote_id', quoteId);
    } else {
      const quoteResult = await supabase.from('quotes').insert({ ...payload, status: 'bekliyor' }).select('id').single();
      if (quoteResult.error || !quoteResult.data) { setBusy(false); alert('Teklif kaydedilemedi.'); return; }
      quoteId = quoteResult.data.id;
    }
    const validItems = items.filter(it => it.company_name.trim());
    if (validItems.length) {
      const insertResult = await supabase.from('quote_items').insert(validItems.map(it => ({ quote_id: quoteId, company_name: it.company_name.trim(), premium_amount: Number(it.premium_amount) || 0, agency_id: it.agency_id || null })));
      if (insertResult.error) { setBusy(false); alert('Teklif kalemleri kaydedilemedi.'); return; }
    }
    setBusy(false); setFormOpen(false); setEditingQuote(null); refresh();
  }

  async function remove(id: string) {
    if (!window.confirm('Bu teklifi silmek istediğinize emin misiniz?')) return;
    const result = await supabase.from('quotes').delete().eq('id', id);
    if (result.error) alert('Teklif silinemedi.'); else { setSelectedQuote(null); refresh(); }
  }

  async function changeStatus(quote: Quote, status: string) {
    const result = await supabase.from('quotes').update({ status }).eq('id', quote.id);
    if (result.error) alert('Durum güncellenemedi.'); else refresh();
  }

  function updateItem(idx: number, field: 'company_name' | 'premium_amount' | 'agency_id', value: string) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  }
  function addItem() { setItems(prev => [...prev, { company_name: '', premium_amount: '', agency_id: '' }]); }
  function removeItem(idx: number) { setItems(prev => prev.filter((_, i) => i !== idx)); }

  const itemsForQuote = (quoteId: string) => quoteItems
    .filter(it => it.quote_id === quoteId)
    .sort((a, b) => Number(a.premium_amount) - Number(b.premium_amount));

  const sortedQuotes = [...quotes].sort((a, b) => {
    const ad = a.bitis_tarihi || '9999-12-31';
    const bd = b.bitis_tarihi || '9999-12-31';
    return ad.localeCompare(bd);
  });

  return <div>
    <PageTitle title="Teklifler" subtitle="Müşteriler için birden fazla sigorta şirketinden teklif girin ve karşılaştırın." action={<div className="flex gap-2"><button onClick={() => setOcrOpen(true)} className="btn-secondary"><Scan size={17} /> Ekran Görüntüsünden Oku</button><button onClick={openNew} className="btn-primary"><Plus size={17} /> Yeni Teklif</button></div>} />
    {formOpen && <form onSubmit={save} className="card overflow-hidden mb-5">
      <div className="teal-strip">{editingQuote ? 'Teklifi Düzenle' : 'Yeni Teklif Oluştur'}</div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        <div className="relative" ref={tcRef}>
          <label className="field">TC / Vergi No ile Müşteri Ara
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input value={tcSearch} onChange={e => { setTcSearch(e.target.value); setTcDropdown(true); }} onFocus={() => setTcDropdown(true)} placeholder="TC numarası girin..." className="pl-9" />
              {tcSearch && <button type="button" onClick={() => { setTcSearch(''); setTcDropdown(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700" title="Temizle"><X size={15} /></button>}
            </div>
          </label>
          {tcDropdown && matchedCustomers.length > 0 && <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {matchedCustomers.map(c => <button type="button" key={c.id} onClick={() => selectCustomer(c)} className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0"><div className="text-sm font-semibold text-slate-800">{c.ad_soyad_unvan}</div><div className="text-xs text-slate-500">TC: {c.tc_vergi_no}{c.telefon ? ` · ${c.telefon}` : ''}</div></button>)}
          </div>}
        </div>
        <label className="field">Müşteri Adı<input required value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Müşteri adı" /></label>
        <label className="field">Telefon<input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0 (5xx) xxx xx xx" /></label>
        <label className="field">Poliçe Bitiş Tarihi<input type="date" value={bitisTarihi} onChange={e => setBitisTarihi(e.target.value)} /></label>
        <label className="field">Branş Grubu
          <select value={branchGroup} onChange={e => { setBranchGroup(e.target.value); setInsuranceType(''); }}>
            <option value="">Seçiniz</option>
            <option value="OTO">OTO</option>
            <option value="KONUT">KONUT</option>
            <option value="HAYAT">HAYAT</option>
            <option value="DIGER">DİĞER</option>
          </select>
        </label>
        <label className="field">Sigorta Türü
          <select value={insuranceType} onChange={e => setInsuranceType(e.target.value)}>
            <option value="">Seçiniz</option>
            {filteredBranches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
          </select>
        </label>
        <label className="field">Acente
          <select value={agencyId} onChange={e => setAgencyId(e.target.value)}>
            <option value="">Acente seçin</option>
            {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
      </div>
      <div className="px-6 pb-2"><h3 className="font-bold text-sm mb-3">Şirket Teklifleri</h3></div>
      <div className="px-6 pb-4 space-y-3">
        {items.map((item, idx) => <div key={idx} className="flex flex-wrap items-end gap-3">
          <label className="field flex-1 min-w-[180px]">Şirket {idx + 1}
            <select value={item.company_name} onChange={e => updateItem(idx, 'company_name', e.target.value)}>
              <option value="">Şirket seçin</option>
              {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </label>
          <label className="field flex-1 min-w-[140px]">Acente
            <select value={item.agency_id} onChange={e => updateItem(idx, 'agency_id', e.target.value)}>
              <option value="">Acente seçin</option>
              {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
          <label className="field flex-1 min-w-[120px]">Teklif Tutarı (₺)<input type="number" step="0.01" min="0" value={item.premium_amount} onChange={e => updateItem(idx, 'premium_amount', e.target.value)} placeholder="0.00" /></label>
          {items.length > 1 && <button type="button" className="icon-btn danger mb-1" onClick={() => removeItem(idx)} title="Kaldır"><Trash2 size={15} /></button>}
        </div>)}
        <button type="button" onClick={addItem} className="btn-secondary"><Plus size={15} /> Yeni Şirket Teklifi Ekle</button>
      </div>
      <div className="px-6 pb-4"><label className="field"><span className="flex items-center gap-1.5"><StickyNote size={15} className="text-teal-600" /> Müşteri Notu</span><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Bu teklif/müşteri için notlarınızı buraya yazın..." className="min-h-24" /></label></div>
      <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-3"><button type="button" onClick={() => { setFormOpen(false); setEditingQuote(null); }} className="btn-secondary">Vazgeç</button><button disabled={busy} className="btn-primary">{busy ? 'Kaydediliyor...' : editingQuote ? 'Değişiklikleri Kaydet' : 'Teklifi Kaydet'}</button></div>
    </form>}
    <div className="card overflow-hidden">
      <div className="teal-strip"><span>Teklif Listesi <small>({quotes.length})</small></span></div>
      <div className="overflow-x-auto"><table>
        <thead><tr><th>Müşteri</th><th>Telefon</th><th>Acente</th><th>Branş Grubu</th><th>Sigorta Türü</th><th>Şirket Teklifleri</th><th>En Uygun</th><th>Poliçe Bitiş</th><th>Durum</th><th>İşlem</th></tr></thead>
        <tbody>
          {sortedQuotes.length ? sortedQuotes.map(q => {
            const qi = itemsForQuote(q.id);
            const minItem = qi.length ? qi.reduce((min, it) => Number(it.premium_amount) < Number(min.premium_amount) ? it : min, qi[0]) : null;
            return <tr key={q.id} className="cursor-pointer" onClick={() => setSelectedQuote(q)}>
              <td className="font-semibold text-slate-800">{q.customer_name}</td>
              <td>{q.phone ? <span className="inline-flex items-center gap-1 text-xs"><Phone size={12} className="text-slate-400" /> {q.phone}</span> : '--'}</td>
              <td>{agencies.find(a => a.id === q.agency_id)?.name || '--'}</td>
              <td>{q.branch_group ? <GroupBadge group={q.branch_group} /> : '--'}</td>
              <td>{q.insurance_type || '--'}</td>
              <td><div className="space-y-1">{qi.map(it => <div key={it.id} className="text-xs flex items-center gap-2"><span className="font-semibold">{it.company_name}</span>{it.agency_id && agencies.find(a => a.id === it.agency_id) ? <span className="text-teal-600">{agencies.find(a => a.id === it.agency_id)!.name}</span> : null}<span className="text-slate-500">{money(Number(it.premium_amount))}</span></div>)}</div></td>
              <td className="font-semibold text-emerald-700">{minItem ? money(Number(minItem.premium_amount)) : '--'}</td>
              <td>{q.bitis_tarihi || '--'}</td>
              <td onClick={e => e.stopPropagation()}><div className="flex items-center gap-2">{(() => { const s = STATUS_CONFIG[q.status] || STATUS_CONFIG.bekliyor; return <span className="badge inline-flex items-center" style={{ color: s.color, background: s.bg }}>{s.label}</span>; })()}<select value={q.status} onChange={e => changeStatus(q, e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white"><option value="bekliyor">Bekliyor</option><option value="arandi">Arandı</option><option value="onaylandi">Onaylandı</option><option value="reddedildi">Reddedildi</option></select></div></td>
              <td onClick={e => e.stopPropagation()}><div className="flex gap-1">{q.notes && <button className="icon-btn" onClick={() => { setSelectedQuote(q); setDetailNotes(q.notes || ''); setNotesSavedAt(null); }} title="Not"><StickyNote size={15} className="text-amber-600" /></button>}<button className="icon-btn" onClick={() => openEdit(q)} title="Düzenle"><Pencil size={15} /></button><button className="icon-btn danger" onClick={() => remove(q.id)} title="Sil"><Trash2 size={15} /></button></div></td>
            </tr>;
          }) : <tr><td colSpan={10} className="empty">Henüz teklif kaydı bulunmuyor.</td></tr>}
        </tbody>
      </table></div>
    </div>
    <OcrQuoteModal open={ocrOpen} onClose={() => setOcrOpen(false)} companies={companies} agencies={agencies} onApply={(items, agencyId) => {
      setItems(items.map(it => ({ company_name: it.company_name, premium_amount: it.premium_amount, agency_id: it.agency_id })));
      if (agencyId) setAgencyId(agencyId);
      setFormOpen(true);
      setOcrOpen(false);
    }} />
    {selectedQuote && <div className="modal-backdrop" onClick={() => setSelectedQuote(null)}>
      <div className="modal" style={{ width: 'min(100%, 600px)' }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5"><div><h3 className="font-bold text-lg">Teklif Detayı</h3><p className="text-xs text-slate-500 mt-1">{selectedQuote.customer_name}{selectedQuote.phone ? ` · ${selectedQuote.phone}` : ''}</p></div><div className="flex items-center gap-2"><button onClick={() => setSelectedQuote(null)}><X size={19} /></button></div></div>
        {selectedQuote.branch_group && <div className="mb-3"><GroupBadge group={selectedQuote.branch_group} /></div>}
        {selectedQuote.insurance_type && <p className="text-sm text-slate-600 mb-4">Sigorta Türü: <strong>{selectedQuote.insurance_type}</strong></p>}
        {selectedQuote.bitis_tarihi && <p className="text-sm text-slate-600 mb-4">Poliçe Bitiş Tarihi: <strong>{selectedQuote.bitis_tarihi}</strong></p>}
        <div className="space-y-2">{itemsForQuote(selectedQuote.id).map(it => <div key={it.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50"><div className="flex flex-col"><span className="font-semibold text-sm">{it.company_name}</span>{it.agency_id && agencies.find(a => a.id === it.agency_id) ? <span className="text-xs text-teal-600 mt-0.5">{agencies.find(a => a.id === it.agency_id)!.name}</span> : null}</div><span className="font-bold text-teal-700">{money(Number(it.premium_amount))}</span></div>)}</div>
        <div className="mt-5">
          <h4 className="font-bold text-sm mb-2 flex items-center gap-2"><StickyNote size={16} className="text-teal-600" /> Müşteri Notu</h4>
          <textarea className="w-full min-h-28 p-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Bu teklif/müşteri için notlarınızı buraya yazın..." value={detailNotes} onChange={e => { setDetailNotes(e.target.value); setNotesSavedAt(null); }} disabled={notesBusy} />
          <div className="flex items-center justify-between mt-2"><span className="text-xs text-emerald-600">{notesSavedAt ? 'Kaydedildi' : ''}</span><button className="btn-primary" onClick={async () => { if (!selectedQuote) return; setNotesBusy(true); const result = await supabase.from('quotes').update({ notes: detailNotes.trim() || null }).eq('id', selectedQuote.id); if (result.error) alert('Not kaydedilemedi.'); else { setNotesSavedAt(Date.now()); refresh(); } setNotesBusy(false); }} disabled={notesBusy}>{notesBusy ? 'Kaydediliyor...' : 'Notu Kaydet'}</button></div>
        </div>
        <button className="btn-secondary w-full mt-4" onClick={() => setSelectedQuote(null)}>Kapat</button>
      </div>
    </div>}
  </div>;
}
