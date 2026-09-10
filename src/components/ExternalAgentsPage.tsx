import { useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Agency } from '@/lib/types';

function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <div className="flex flex-wrap items-start justify-between gap-4 mb-6"><div><h2 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>{subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}</div>{action}</div>;
}

export function ExternalAgentsPage({ agencies, refresh }: { agencies: Agency[]; refresh: () => void }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Agency | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const externalAgencies = agencies.filter(a => a.is_external);

  function openNew() { setEditing(null); setName(''); setFormOpen(true); }
  function openEdit(a: Agency) { setEditing(a); setName(a.name); setFormOpen(true); }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const payload = { name: name.trim(), is_external: true };
    const result = editing ? await supabase.from('agencies').update(payload).eq('id', editing.id) : await supabase.from('agencies').insert(payload);
    setBusy(false);
    if (result.error) { alert('Dış acente kaydedilemedi.'); return; }
    setFormOpen(false); refresh();
  }

  async function remove(id: string) {
    if (!window.confirm('Bu dış acenteyi silmek istediğinize emin misiniz?')) return;
    const result = await supabase.from('agencies').delete().eq('id', id);
    if (result.error) alert('Dış acente silinemedi.'); else refresh();
  }

  return <div>
    <PageTitle title="Dış Acente Yönetimi" subtitle="Dış acenteleri ekleyin ve yönetin. Dış acente üretimleri iç acentelerle karışmaz." action={<button onClick={openNew} className="btn-primary"><Plus size={17} /> Yeni Dış Acente</button>} />
    {formOpen && <form onSubmit={save} className="card p-5 mb-5 grid grid-cols-1 gap-4 max-w-xl">
      <h3 className="col-span-full font-bold">{editing ? 'Dış Acente Düzenle' : 'Yeni Dış Acente'}</h3>
      <label className="field">Acente Adı / Ünvan<input required value={name} onChange={e => setName(e.target.value)} placeholder="Dış acente adı veya ünvanı" /></label>
      <div className="col-span-full flex justify-end gap-3"><button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Vazgeç</button><button disabled={busy} className="btn-primary">{busy ? 'Kaydediliyor...' : 'Kaydet'}</button></div>
    </form>}
    <div className="card overflow-hidden">
      <div className="teal-strip"><span>Dış Acente Listesi <small>({externalAgencies.length})</small></span></div>
      <div className="overflow-x-auto"><table>
        <thead><tr><th>Acente Adı / Ünvan</th><th>Eklenme Tarihi</th><th>İşlem</th></tr></thead>
        <tbody>
          {externalAgencies.length ? externalAgencies.map(a => <tr key={a.id}>
            <td className="font-semibold text-slate-800">{a.name}</td>
            <td>{a.created_at ? new Date(a.created_at).toLocaleDateString('tr-TR') : '--'}</td>
            <td><div className="flex gap-1"><button className="icon-btn" onClick={() => openEdit(a)} title="Düzenle"><Pencil size={15} /></button><button className="icon-btn danger" onClick={() => remove(a.id)} title="Sil"><Trash2 size={15} /></button></div></td>
          </tr>) : <tr><td colSpan={3} className="empty">Henüz dış acente kaydı bulunmuyor.</td></tr>}
        </tbody>
      </table></div>
    </div>
  </div>;
}
