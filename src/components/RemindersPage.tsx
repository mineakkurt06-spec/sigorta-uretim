import { useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2, Bell, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Reminder } from '@/lib/types';

function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <div className="flex flex-wrap items-start justify-between gap-4 mb-6"><div><h2 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>{subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}</div>{action}</div>;
}

const dateDiff = (date: string) => Math.ceil((new Date(`${date}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);

export function RemindersPage({ reminders, refresh }: { reminders: Reminder[]; refresh: () => void }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [form, setForm] = useState({ baslik: '', aciklama: '', tarih: '', durum: 'beklemede' });
  const [busy, setBusy] = useState(false);

  function openNew() { setEditing(null); setForm({ baslik: '', aciklama: '', tarih: new Date().toISOString().slice(0, 10), durum: 'beklemede' }); setFormOpen(true); }
  function openEdit(r: Reminder) { setEditing(r); setForm({ baslik: r.baslik, aciklama: r.aciklama || '', tarih: r.tarih || '', durum: r.durum || 'beklemede' }); setFormOpen(true); }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const payload = { baslik: form.baslik.trim(), aciklama: form.aciklama.trim(), tarih: form.tarih, durum: form.durum };
    const result = editing ? await supabase.from('reminders').update(payload).eq('id', editing.id) : await supabase.from('reminders').insert(payload);
    setBusy(false);
    if (result.error) { alert('Hatırlatma kaydedilemedi.'); return; }
    setFormOpen(false); refresh();
  }

  async function remove(id: string) {
    if (!window.confirm('Bu hatırlatmayı silmek istediğinize emin misiniz?')) return;
    const result = await supabase.from('reminders').delete().eq('id', id);
    if (result.error) alert('Hatırlatma silinemedi.'); else refresh();
  }

  async function toggleDone(r: Reminder) {
    const newStatus = r.durum === 'tamamlandi' ? 'beklemede' : 'tamamlandi';
    const result = await supabase.from('reminders').update({ durum: newStatus }).eq('id', r.id);
    if (result.error) alert('Durum güncellenemedi.'); else refresh();
  }

  const sorted = [...reminders].sort((a, b) => (a.tarih || '').localeCompare(b.tarih || ''));
  const upcoming = sorted.filter(r => r.durum !== 'tamamlandi');
  const completed = sorted.filter(r => r.durum === 'tamamlandi');

  const daysBadge = (date: string, durum: string) => {
    if (durum === 'tamamlandi') return <span className="badge green">Tamamlandı</span>;
    const days = dateDiff(date);
    if (days < 0) return <span className="badge" style={{ color: '#dc2626', background: '#fee2e2' }}>{Math.abs(days)} gün geçti</span>;
    if (days === 0) return <span className="badge" style={{ color: '#b45309', background: '#fef3c7' }}>Bugün</span>;
    if (days <= 7) return <span className="badge orange">{days} gün kaldı</span>;
    return <span className="badge blue">{days} gün kaldı</span>;
  };

  return <div>
    <PageTitle title="Hatırlatmalar" subtitle="Önemli tarihleri ve görevleri takip edin." action={<button onClick={openNew} className="btn-primary"><Plus size={17} /> Yeni Hatırlatma</button>} />
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
      <div className="card p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bekleyen</p><p className="text-2xl font-bold text-slate-900 mt-2">{upcoming.length}</p></div><div className="size-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center"><Bell size={21} /></div></div></div>
      <div className="card p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tamamlanan</p><p className="text-2xl font-bold text-slate-900 mt-2">{completed.length}</p></div><div className="size-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center"><CheckCircle2 size={21} /></div></div></div>
      <div className="card p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Toplam</p><p className="text-2xl font-bold text-slate-900 mt-2">{reminders.length}</p></div><div className="size-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center"><Bell size={21} /></div></div></div>
    </div>
    {formOpen && <form onSubmit={save} className="card p-5 mb-5 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
      <h3 className="col-span-full font-bold">{editing ? 'Hatırlatma Düzenle' : 'Yeni Hatırlatma'}</h3>
      <label className="field">Başlık<input required value={form.baslik} onChange={e => setForm(v => ({ ...v, baslik: e.target.value }))} /></label>
      <label className="field">Tarih<input required type="date" value={form.tarih} onChange={e => setForm(v => ({ ...v, tarih: e.target.value }))} /></label>
      <label className="field sm:col-span-2">Açıklama<textarea value={form.aciklama} onChange={e => setForm(v => ({ ...v, aciklama: e.target.value }))} rows={3} placeholder="Hatırlatma detayı" /></label>
      <div className="col-span-full flex justify-end gap-3"><button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Vazgeç</button><button disabled={busy} className="btn-primary">{busy ? 'Kaydediliyor...' : 'Kaydet'}</button></div>
    </form>}
    <div className="card overflow-hidden">
      <div className="teal-strip"><span>Hatırlatma Listesi <small>({sorted.length})</small></span></div>
      <div className="overflow-x-auto"><table>
        <thead><tr><th>Başlık</th><th>Açıklama</th><th>Tarih</th><th>Durum</th><th>İşlem</th></tr></thead>
        <tbody>
          {sorted.length ? sorted.map(r => <tr key={r.id} className={r.durum === 'tamamlandi' ? 'opacity-60' : ''}>
            <td className="font-semibold text-slate-800">{r.baslik}</td>
            <td className="max-w-52 whitespace-normal text-xs">{r.aciklama || '--'}</td>
            <td>{r.tarih || '--'}</td>
            <td>{daysBadge(r.tarih, r.durum)}</td>
            <td><div className="flex gap-1">
              <button className="icon-btn" onClick={() => toggleDone(r)} title={r.durum === 'tamamlandi' ? 'Bekleyene çevir' : 'Tamamla'}><CheckCircle2 size={15} /></button>
              <button className="icon-btn" onClick={() => openEdit(r)} title="Düzenle"><Pencil size={15} /></button>
              <button className="icon-btn danger" onClick={() => remove(r.id)} title="Sil"><Trash2 size={15} /></button>
            </div></td>
          </tr>) : <tr><td colSpan={5} className="empty">Henüz hatırlatma bulunmuyor.</td></tr>}
        </tbody>
      </table></div>
    </div>
  </div>;
}
