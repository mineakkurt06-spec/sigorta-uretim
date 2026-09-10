import { useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { InsuranceBranch } from '@/lib/types';

function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <div className="flex flex-wrap items-start justify-between gap-4 mb-6"><div><h2 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>{subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}</div>{action}</div>;
}

const GROUP_COLORS: Record<string, string> = {
  OTO: 'badge blue',
  KONUT: 'badge',
  HAYAT: 'badge yellow',
  DIGER: 'badge green',
};

const GROUP_STYLES: Record<string, { color: string; background: string }> = {
  OTO: { color: '#0369a1', background: '#e0f2fe' },
  KONUT: { color: '#dc2626', background: '#fee2e2' },
  HAYAT: { color: '#a16207', background: '#fef9c3' },
  DIGER: { color: '#047857', background: '#d1fae5' },
};

export function groupBadgeStyle(group: string): { color: string; background: string } {
  return GROUP_STYLES[group] || GROUP_STYLES.DIGER;
}

export function GroupBadge({ group }: { group: string }) {
  const style = groupBadgeStyle(group);
  return <span className="badge" style={style}>{group}</span>;
}

export function BranchesPage({ branches, refresh }: { branches: InsuranceBranch[]; refresh: () => void }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InsuranceBranch | null>(null);
  const [name, setName] = useState('');
  const [group, setGroup] = useState<'OTO' | 'KONUT' | 'HAYAT' | 'DIGER'>('OTO');
  const [busy, setBusy] = useState(false);

  function openNew() { setEditing(null); setName(''); setGroup('OTO'); setFormOpen(true); }
  function openEdit(b: InsuranceBranch) { setEditing(b); setName(b.name); setGroup(b.branch_group); setFormOpen(true); }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const payload = { name: name.trim(), branch_group: group };
    const result = editing ? await supabase.from('insurance_branches').update(payload).eq('id', editing.id) : await supabase.from('insurance_branches').insert(payload);
    setBusy(false);
    if (result.error) { alert('Branş kaydedilemedi.'); return; }
    setFormOpen(false); refresh();
  }

  async function remove(id: string) {
    if (!window.confirm('Bu branşı silmek istediğinize emin misiniz?')) return;
    const result = await supabase.from('insurance_branches').delete().eq('id', id);
    if (result.error) alert('Branş silinemedi.'); else refresh();
  }

  const groups = ['OTO', 'KONUT', 'HAYAT', 'DIGER'] as const;

  return <div>
    <PageTitle title="Branşlar" subtitle="Sigorta türlerini branş gruplarına göre ekleyin ve yönetin." action={<button onClick={openNew} className="btn-primary"><Plus size={17} /> Yeni Branş</button>} />
    {formOpen && <form onSubmit={save} className="card p-5 mb-5 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
      <h3 className="col-span-full font-bold">{editing ? 'Branş Düzenle' : 'Yeni Branş Ekle'}</h3>
      <label className="field">Sigorta Türü Adı<input required value={name} onChange={e => setName(e.target.value)} placeholder="örn. Ferdi Kaza, Trafik, Kasko" /></label>
      <label className="field">Branş Grubu
        <select required value={group} onChange={e => setGroup(e.target.value as typeof group)}>
          {groups.map(g => <option key={g} value={g}>{g === 'DIGER' ? 'DİĞER' : g}</option>)}
        </select>
      </label>
      <div className="col-span-full"><GroupBadge group={group} /></div>
      <div className="col-span-full flex justify-end gap-3"><button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Vazgeç</button><button disabled={busy} className="btn-primary">{busy ? 'Kaydediliyor...' : 'Kaydet'}</button></div>
    </form>}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
      {groups.map(g => {
        const count = branches.filter(b => b.branch_group === g).length;
        const style = groupBadgeStyle(g);
        return <div key={g} className="card p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{g === 'DIGER' ? 'DİĞER' : g}</p><p className="text-2xl font-bold text-slate-900 mt-2">{count}</p></div><span className="badge" style={style}><Tag size={12} /> {g === 'DIGER' ? 'DİĞER' : g}</span></div></div>;
      })}
    </div>
    <div className="card overflow-hidden">
      <div className="teal-strip"><span>Branş Listesi <small>({branches.length})</small></span></div>
      <div className="overflow-x-auto"><table>
        <thead><tr><th>Sigorta Türü</th><th>Branş Grubu</th><th>Eklenme Tarihi</th><th>İşlem</th></tr></thead>
        <tbody>
          {branches.length ? branches.map(b => <tr key={b.id}>
            <td className="font-semibold text-slate-800">{b.name}</td>
            <td><GroupBadge group={b.branch_group} /></td>
            <td>{b.created_at ? new Date(b.created_at).toLocaleDateString('tr-TR') : '--'}</td>
            <td><div className="flex gap-1"><button className="icon-btn" onClick={() => openEdit(b)} title="Düzenle"><Pencil size={15} /></button><button className="icon-btn danger" onClick={() => remove(b.id)} title="Sil"><Trash2 size={15} /></button></div></td>
          </tr>) : <tr><td colSpan={4} className="empty">Henüz branş kaydı bulunmuyor.</td></tr>}
        </tbody>
      </table></div>
    </div>
  </div>;
}
