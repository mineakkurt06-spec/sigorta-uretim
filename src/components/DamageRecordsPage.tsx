import { useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2, Truck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { DamageRecord } from '@/lib/types';

const money = (value: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value || 0);

function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <div className="flex flex-wrap items-start justify-between gap-4 mb-6"><div><h2 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>{subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}</div>{action}</div>;
}

const STATUS_OPTIONS: { value: string; label: string; className: string }[] = [
  { value: 'dosya_acildi', label: 'Dosya Açıldı', className: 'badge blue' },
  { value: 'evrak_bekleniyor', label: 'Evrak Bekleniyor', className: 'badge orange' },
  { value: 'beklemede', label: 'Beklemede', className: 'badge' },
  { value: 'sonuclandi', label: 'Sonuçlandı', className: 'badge green' },
];

const STATUS_STYLE: Record<string, { color: string; background: string }> = {
  dosya_acildi: { color: '#0369a1', background: '#e0f2fe' },
  evrak_bekleniyor: { color: '#b45309', background: '#fef3c7' },
  beklemede: { color: '#64748b', background: '#f1f5f9' },
  sonuclandi: { color: '#047857', background: '#d1fae5' },
};

export function DamageRecordsPage({ damageRecords, refresh }: { damageRecords: DamageRecord[]; refresh: () => void }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DamageRecord | null>(null);
  const [form, setForm] = useState({ musteri_adi: '', police_no: '', arac_plaka: '', hasar_tarihi: '', hasar_tutar: '', durum: 'dosya_acildi', aciklama: '' });
  const [busy, setBusy] = useState(false);

  function openNew() { setEditing(null); setForm({ musteri_adi: '', police_no: '', arac_plaka: '', hasar_tarihi: '', hasar_tutar: '', durum: 'dosya_acildi', aciklama: '' }); setFormOpen(true); }
  function openEdit(d: DamageRecord) { setEditing(d); setForm({ musteri_adi: d.musteri_adi, police_no: d.police_no || '', arac_plaka: d.arac_plaka || '', hasar_tarihi: d.hasar_tarihi || '', hasar_tutar: String(d.hasar_tutar || 0), durum: d.durum || 'dosya_acildi', aciklama: d.aciklama || '' }); setFormOpen(true); }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const payload = { musteri_adi: form.musteri_adi.trim(), police_no: form.police_no.trim(), arac_plaka: form.arac_plaka.trim(), hasar_tarihi: form.hasar_tarihi || null, hasar_tutar: Number(form.hasar_tutar) || 0, durum: form.durum, aciklama: form.aciklama.trim() };
    const result = editing ? await supabase.from('damage_records').update(payload).eq('id', editing.id) : await supabase.from('damage_records').insert(payload);
    setBusy(false);
    if (result.error) { alert('Hasar kaydı eklenemedi.'); return; }
    setFormOpen(false); refresh();
  }

  async function remove(id: string) {
    if (!window.confirm('Bu hasar kaydını silmek istediğinize emin misiniz?')) return;
    const result = await supabase.from('damage_records').delete().eq('id', id);
    if (result.error) alert('Hasar kaydı silinemedi.'); else refresh();
  }

  async function changeStatus(d: DamageRecord, status: string) {
    const result = await supabase.from('damage_records').update({ durum: status }).eq('id', d.id);
    if (result.error) alert('Durum güncellenemedi.'); else refresh();
  }

  const statusBadge = (durum: string) => {
    const opt = STATUS_OPTIONS.find(s => s.value === durum);
    const style = STATUS_STYLE[durum] || STATUS_STYLE.beklemede;
    return <span className="badge" style={style}>{opt?.label || durum}</span>;
  };

  const stats = STATUS_OPTIONS.map(s => ({ ...s, count: damageRecords.filter(d => d.durum === s.value).length }));

  return <div>
    <PageTitle title="Araç Hasar Kayıtları" subtitle="Hasar dosyalarını durum bazında takip edin ve yönetin." action={<button onClick={openNew} className="btn-primary"><Plus size={17} /> Yeni Hasar Kaydı</button>} />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
      {stats.map(s => <div key={s.value} className="card p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{s.label}</p><p className="text-2xl font-bold text-slate-900 mt-1">{s.count}</p></div><span className="badge" style={STATUS_STYLE[s.value]}><Truck size={14} /></span></div></div>)}
    </div>
    {formOpen && <form onSubmit={save} className="card p-5 mb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl">
      <h3 className="col-span-full font-bold">{editing ? 'Hasar Kaydı Düzenle' : 'Yeni Hasar Kaydı'}</h3>
      <label className="field">Müşteri Adı<input required value={form.musteri_adi} onChange={e => setForm(v => ({ ...v, musteri_adi: e.target.value }))} /></label>
      <label className="field">Poliçe No<input value={form.police_no} onChange={e => setForm(v => ({ ...v, police_no: e.target.value }))} /></label>
      <label className="field">Araç Plaka<input value={form.arac_plaka} onChange={e => setForm(v => ({ ...v, arac_plaka: e.target.value.toUpperCase() }))} placeholder="34 ABC 123" /></label>
      <label className="field">Hasar Tarihi<input type="date" value={form.hasar_tarihi} onChange={e => setForm(v => ({ ...v, hasar_tarihi: e.target.value }))} /></label>
      <label className="field">Hasar Tutarı (₺)<input type="number" step="0.01" min="0" value={form.hasar_tutar} onChange={e => setForm(v => ({ ...v, hasar_tutar: e.target.value }))} /></label>
      <label className="field">Durum<select value={form.durum} onChange={e => setForm(v => ({ ...v, durum: e.target.value }))}>{STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
      <label className="field sm:col-span-2 lg:col-span-3">Açıklama<textarea value={form.aciklama} onChange={e => setForm(v => ({ ...v, aciklama: e.target.value }))} rows={2} placeholder="Hasar açıklaması" /></label>
      <div className="col-span-full flex justify-end gap-3"><button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Vazgeç</button><button disabled={busy} className="btn-primary">{busy ? 'Kaydediliyor...' : 'Kaydet'}</button></div>
    </form>}
    <div className="card overflow-hidden">
      <div className="teal-strip"><span>Hasar Kayıtları <small>({damageRecords.length})</small></span></div>
      <div className="overflow-x-auto"><table>
        <thead><tr><th>Müşteri</th><th>Poliçe No</th><th>Plaka</th><th>Hasar Tarihi</th><th>Hasar Tutarı</th><th>Durum</th><th>Açıklama</th><th>İşlem</th></tr></thead>
        <tbody>
          {damageRecords.length ? damageRecords.map(d => <tr key={d.id}>
            <td className="font-semibold text-slate-800">{d.musteri_adi}</td>
            <td>{d.police_no || '--'}</td>
            <td>{d.arac_plaka || '--'}</td>
            <td>{d.hasar_tarihi || '--'}</td>
            <td className="font-semibold">{money(Number(d.hasar_tutar))}</td>
            <td><select value={d.durum} onChange={e => changeStatus(d, e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white">{STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></td>
            <td className="max-w-40 whitespace-normal text-xs">{d.aciklama || '--'}</td>
            <td><div className="flex gap-1"><button className="icon-btn" onClick={() => openEdit(d)} title="Düzenle"><Pencil size={15} /></button><button className="icon-btn danger" onClick={() => remove(d.id)} title="Sil"><Trash2 size={15} /></button></div></td>
          </tr>) : <tr><td colSpan={8} className="empty">Henüz hasar kaydı bulunmuyor.</td></tr>}
        </tbody>
      </table></div>
    </div>
  </div>;
}
