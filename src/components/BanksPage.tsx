import { useState, type FormEvent } from 'react';
import { Landmark, Plus, Pencil, Trash2, CreditCard } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { BankAccount } from '@/lib/types';

const money = (value: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value || 0);

function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <div className="flex flex-wrap items-start justify-between gap-4 mb-6"><div><h2 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>{subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}</div>{action}</div>;
}

export function BanksPage({ banks, refresh }: { banks: BankAccount[]; refresh: () => void }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [iban, setIban] = useState('');
  const [cardLimit, setCardLimit] = useState('');
  const [busy, setBusy] = useState(false);

  function openNew() { setEditing(null); setBankName(''); setAccountName(''); setIban(''); setCardLimit(''); setFormOpen(true); }
  function openEdit(b: BankAccount) { setEditing(b); setBankName(b.bank_name); setAccountName(b.account_name); setIban(b.iban || ''); setCardLimit(String(b.card_limit || 0)); setFormOpen(true); }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const payload = { bank_name: bankName.trim(), account_name: accountName.trim(), iban: iban.trim(), card_limit: Number(cardLimit) || 0 };
    const result = editing ? await supabase.from('bank_accounts').update(payload).eq('id', editing.id) : await supabase.from('bank_accounts').insert(payload);
    setBusy(false);
    if (result.error) { alert('Banka hesabı kaydedilemedi.'); return; }
    setFormOpen(false); refresh();
  }

  async function remove(id: string) {
    if (!window.confirm('Bu banka hesabını silmek istediğinize emin misiniz?')) return;
    const result = await supabase.from('bank_accounts').delete().eq('id', id);
    if (result.error) alert('Banka hesabı silinemedi.'); else refresh();
  }

  const uniqueBankNames = [...new Set(banks.map(b => b.bank_name))];

  return <div>
    <PageTitle title="Banka Hesapları" subtitle="Banka hesaplarınızı ekleyin ve kart limitlerini yönetin. Verecek poliçelerde otomatik düşülür." action={<button onClick={openNew} className="btn-primary"><Plus size={17} /> Yeni Banka Hesabı</button>} />
    {formOpen && <form onSubmit={save} className="card p-5 mb-5 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
      <h3 className="col-span-full font-bold">{editing ? 'Banka Hesabı Düzenle' : 'Yeni Banka Hesabı'}</h3>
      <label className="field">Banka Adı<input required value={bankName} onChange={e => setBankName(e.target.value)} placeholder="örn. İş Bankası" /></label>
      <label className="field">Hesap Adı<input required value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="örn. Şirket Kredi Kartı" /></label>
      <label className="field">IBAN<input value={iban} onChange={e => setIban(e.target.value)} placeholder="TR..." /></label>
      <label className="field">Kart Limiti (₺)<input required type="number" step="0.01" min="0" value={cardLimit} onChange={e => setCardLimit(e.target.value)} placeholder="0.00" /></label>
      <div className="col-span-full flex justify-end gap-3"><button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Vazgeç</button><button disabled={busy} className="btn-primary">{busy ? 'Kaydediliyor...' : 'Kaydet'}</button></div>
    </form>}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
      <div className="card p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Toplam Banka</p><p className="text-2xl font-bold text-slate-900 mt-2">{uniqueBankNames.length}</p></div><div className="size-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center"><Landmark size={21} /></div></div></div>
      <div className="card p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hesap Sayısı</p><p className="text-2xl font-bold text-slate-900 mt-2">{banks.length}</p></div><div className="size-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center"><CreditCard size={21} /></div></div></div>
      <div className="card p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Toplam Limit</p><p className="text-2xl font-bold text-slate-900 mt-2">{money(banks.reduce((a, b) => a + Number(b.card_limit || 0), 0))}</p></div><div className="size-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center"><CreditCard size={21} /></div></div></div>
    </div>
    <div className="card overflow-hidden">
      <div className="teal-strip"><span>Banka Hesapları <small>({banks.length})</small></span></div>
      <div className="overflow-x-auto"><table>
        <thead><tr><th>Banka Adı</th><th>Hesap Adı</th><th>IBAN</th><th>Kart Limiti</th><th>Eklenme Tarihi</th><th>İşlem</th></tr></thead>
        <tbody>
          {banks.length ? banks.map(b => <tr key={b.id}>
            <td className="font-semibold text-slate-800">{b.bank_name}</td>
            <td>{b.account_name}</td>
            <td className="font-mono text-xs">{b.iban || '--'}</td>
            <td className="font-semibold">{money(Number(b.card_limit))}</td>
            <td>{b.created_at ? new Date(b.created_at).toLocaleDateString('tr-TR') : '--'}</td>
            <td><div className="flex gap-1"><button className="icon-btn" onClick={() => openEdit(b)} title="Düzenle"><Pencil size={15} /></button><button className="icon-btn danger" onClick={() => remove(b.id)} title="Sil"><Trash2 size={15} /></button></div></td>
          </tr>) : <tr><td colSpan={6} className="empty">Henüz banka hesabı kaydı bulunmuyor.</td></tr>}
        </tbody>
      </table></div>
    </div>
  </div>;
}
