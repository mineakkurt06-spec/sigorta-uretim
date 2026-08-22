import { useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2, UserX, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { LostCustomer, InsuranceBranch } from '@/lib/types';
import { GroupBadge } from './BranchesPage';

const money = (value: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value || 0);

function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <div className="flex flex-wrap items-start justify-between gap-4 mb-6"><div><h2 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>{subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}</div>{action}</div>;
}

export function LostCustomersPage({ lostCustomers, branches, refresh }: { lostCustomers: LostCustomer[]; branches: InsuranceBranch[]; refresh: () => void }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LostCustomer | null>(null);
  const [form, setForm] = useState({ customer_name: '', phone: '', insurance_type: '', reason: '', lost_company: '', premium_amount: '' });
  const [busy, setBusy] = useState(false);

  function openNew() { setEditing(null); setForm({ customer_name: '', phone: '', insurance_type: '', reason: '', lost_company: '', premium_amount: '' }); setFormOpen(true); }
  function openEdit(c: LostCustomer) { setEditing(c); setForm({ customer_name: c.customer_name, phone: c.phone || '', insurance_type: c.insurance_type || '', reason: c.reason || '', lost_company: c.lost_company || '', premium_amount: String(c.premium_amount || 0) }); setFormOpen(true); }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const payload = { customer_name: form.customer_name.trim(), phone: form.phone.trim(), insurance_type: form.insurance_type, reason: form.reason.trim(), lost_company: form.lost_company.trim(), premium_amount: Number(form.premium_amount) || 0 };
    const result = editing ? await supabase.from('lost_customers').update(payload).eq('id', editing.id) : await supabase.from('lost_customers').insert(payload);
    setBusy(false);
    if (result.error) { alert('Kaçan müşteri kaydedilemedi.'); return; }
    setFormOpen(false); refresh();
  }

  async function remove(id: string) {
    if (!window.confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
    const result = await supabase.from('lost_customers').delete().eq('id', id);
    if (result.error) alert('Kayıt silinemedi.'); else refresh();
  }

  const totalLost = lostCustomers.reduce((a, c) => a + Number(c.premium_amount || 0), 0);

  return <div>
    <PageTitle title="Kaçan Müşteriler" subtitle="Başka şirkete kaçan müşterileri kaydedin ve kayıp primleri takip edin." action={<button onClick={openNew} className="btn-primary"><Plus size={17} /> Yeni Kaçan Müşteri</button>} />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
      <div className="card p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kaçan Müşteri</p><p className="text-2xl font-bold text-slate-900 mt-2">{lostCustomers.length}</p></div><div className="size-11 rounded-xl bg-red-50 text-red-700 flex items-center justify-center"><UserX size={21} /></div></div></div>
      <div className="card p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kayıp Prim</p><p className="text-2xl font-bold text-slate-900 mt-2">{money(totalLost)}</p></div><div className="size-11 rounded-xl bg-orange-50 text-orange-700 flex items-center justify-center"><UserX size={21} /></div></div></div>
    </div>
    {formOpen && <form onSubmit={save} className="card p-5 mb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl">
      <h3 className="col-span-full font-bold">{editing ? 'Kaçan Müşteri Düzenle' : 'Yeni Kaçan Müşteri'}</h3>
      <label className="field">Müşteri Adı<input required value={form.customer_name} onChange={e => setForm(v => ({ ...v, customer_name: e.target.value }))} /></label>
      <label className="field">Telefon<input value={form.phone} onChange={e => setForm(v => ({ ...v, phone: e.target.value }))} /></label>
      <label className="field">Sigorta Türü
        <select value={form.insurance_type} onChange={e => setForm(v => ({ ...v, insurance_type: e.target.value }))}>
          <option value="">Seçiniz</option>
          {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
        </select>
      </label>
      <label className="field">Hangi Şirkete Kaçtı<input value={form.lost_company} onChange={e => setForm(v => ({ ...v, lost_company: e.target.value }))} placeholder="Şirket adı" /></label>
      <label className="field">Prim Tutarı (₺)<input type="number" step="0.01" min="0" value={form.premium_amount} onChange={e => setForm(v => ({ ...v, premium_amount: e.target.value }))} /></label>
      <label className="field">Kaçma Nedeni<input value={form.reason} onChange={e => setForm(v => ({ ...v, reason: e.target.value }))} placeholder="Neden" /></label>
      <div className="col-span-full flex justify-end gap-3"><button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Vazgeç</button><button disabled={busy} className="btn-primary">{busy ? 'Kaydediliyor...' : 'Kaydet'}</button></div>
    </form>}
    <div className="card overflow-hidden">
      <div className="teal-strip"><span>Kaçan Müşteri Listesi <small>({lostCustomers.length})</small></span></div>
      <div className="overflow-x-auto"><table>
        <thead><tr><th>Müşteri</th><th>Telefon</th><th>Sigorta Türü</th><th>Kaçtığı Şirket</th><th>Prim Tutarı</th><th>Neden</th><th>Tarih</th><th>İşlem</th></tr></thead>
        <tbody>
          {lostCustomers.length ? lostCustomers.map(c => <tr key={c.id}>
            <td className="font-semibold text-slate-800">{c.customer_name}</td>
            <td>{c.phone || '--'}</td>
            <td>{c.insurance_type || '--'}</td>
            <td>{c.lost_company || '--'}</td>
            <td className="font-semibold text-red-600">{money(Number(c.premium_amount))}</td>
            <td className="max-w-40 whitespace-normal">{c.reason || '--'}</td>
            <td>{c.created_at ? new Date(c.created_at).toLocaleDateString('tr-TR') : '--'}</td>
            <td><div className="flex gap-1"><button className="icon-btn" onClick={() => openEdit(c)} title="Düzenle"><Pencil size={15} /></button><button className="icon-btn danger" onClick={() => remove(c.id)} title="Sil"><Trash2 size={15} /></button></div></td>
          </tr>) : <tr><td colSpan={8} className="empty">Henüz kaçan müşteri kaydı bulunmuyor.</td></tr>}
        </tbody>
      </table></div>
    </div>
  </div>;
}
