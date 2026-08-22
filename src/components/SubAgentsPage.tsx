import { useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2, Users2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { SubAgent } from '@/lib/types';

function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <div className="flex flex-wrap items-start justify-between gap-4 mb-6"><div><h2 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>{subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}</div>{action}</div>;
}

export function SubAgentsPage({ subAgents, refresh }: { subAgents: SubAgent[]; refresh: () => void }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SubAgent | null>(null);
  const [name, setName] = useState('');
  const [rate, setRate] = useState('');
  const [busy, setBusy] = useState(false);

  function openNew() { setEditing(null); setName(''); setRate(''); setFormOpen(true); }
  function openEdit(s: SubAgent) { setEditing(s); setName(s.name); setRate(String(s.commission_rate || 0)); setFormOpen(true); }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const payload = { name: name.trim(), commission_rate: Number(rate) || 0 };
    const result = editing ? await supabase.from('sub_agents').update(payload).eq('id', editing.id) : await supabase.from('sub_agents').insert(payload);
    setBusy(false);
    if (result.error) { alert('Tali acente kaydedilemedi.'); return; }
    setFormOpen(false); refresh();
  }

  async function remove(id: string) {
    if (!window.confirm('Bu tali acenteyi silmek istediğinize emin misiniz?')) return;
    const result = await supabase.from('sub_agents').delete().eq('id', id);
    if (result.error) alert('Tali acente silinemedi.'); else refresh();
  }

  return <div>
    <PageTitle title="Tali Acenteler" subtitle="Tali acenteleri ekleyin, komisyon oranlarını yönetin." action={<button onClick={openNew} className="btn-primary"><Plus size={17} /> Yeni Tali Acente</button>} />
    {formOpen && <form onSubmit={save} className="card p-5 mb-5 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
      <h3 className="col-span-full font-bold">{editing ? 'Tali Acente Düzenle' : 'Yeni Tali Acente'}</h3>
      <label className="field">Ad Soyad / Ünvan<input required value={name} onChange={e => setName(e.target.value)} placeholder="Ad soyad veya ünvan" /></label>
      <label className="field">Standart Komisyon Oranı (%)<input required type="number" step="0.01" min="0" max="100" value={rate} onChange={e => setRate(e.target.value)} placeholder="örn. 7.50" /></label>
      <div className="col-span-full flex justify-end gap-3"><button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Vazgeç</button><button disabled={busy} className="btn-primary">{busy ? 'Kaydediliyor...' : 'Kaydet'}</button></div>
    </form>}
    <div className="card overflow-hidden">
      <div className="teal-strip"><span>Tali Acente Listesi <small>({subAgents.length})</small></span></div>
      <div className="overflow-x-auto"><table>
        <thead><tr><th>Ad Soyad / Ünvan</th><th>Komisyon Oranı (%)</th><th>Eklenme Tarihi</th><th>İşlem</th></tr></thead>
        <tbody>
          {subAgents.length ? subAgents.map(s => <tr key={s.id}>
            <td className="font-semibold text-slate-800">{s.name}</td>
            <td>%{Number(s.commission_rate || 0).toLocaleString('tr-TR')}</td>
            <td>{s.created_at ? new Date(s.created_at).toLocaleDateString('tr-TR') : '--'}</td>
            <td><div className="flex gap-1"><button className="icon-btn" onClick={() => openEdit(s)} title="Düzenle"><Pencil size={15} /></button><button className="icon-btn danger" onClick={() => remove(s.id)} title="Sil"><Trash2 size={15} /></button></div></td>
          </tr>) : <tr><td colSpan={4} className="empty">Henüz tali acente kaydı bulunmuyor.</td></tr>}
        </tbody>
      </table></div>
    </div>
  </div>;
}
