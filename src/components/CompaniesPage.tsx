import { useState, type FormEvent } from 'react';
import { Building2, Plus, Pencil, Trash2, Upload, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { InsuranceCompany } from '@/lib/types';

const LOGO_BUCKET = 'company-logos';

export function publicLogoUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <div className="flex flex-wrap items-start justify-between gap-4 mb-6"><div><h2 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>{subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}</div>{action}</div>;
}

export function CompanyLogo({ path, name, size = 32 }: { path: string | null; name: string; size?: number }) {
  const url = publicLogoUrl(path);
  if (url) {
    return <img
      src={url}
      alt={name}
      width={size}
      height={size}
      className="rounded-lg object-contain border border-slate-200 bg-white"
      style={{ width: size, height: size }}
      onError={(e) => { e.currentTarget.style.display = 'none'; }}
    />;
  }
  return <div className="rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200" style={{ width: size, height: size }}><Building2 size={Math.round(size * 0.5)} className="text-slate-400" /></div>;
}

export function CompaniesPage({ companies, refresh }: { companies: InsuranceCompany[]; refresh: () => void }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InsuranceCompany | null>(null);
  const [name, setName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function openNew() { setEditing(null); setName(''); setLogoFile(null); setLogoPreview(null); setFormOpen(true); }
  function openEdit(c: InsuranceCompany) { setEditing(c); setName(c.name); setLogoFile(null); setLogoPreview(publicLogoUrl(c.logo_url)); setFormOpen(true); }

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setLogoFile(f);
    if (f) setLogoPreview(URL.createObjectURL(f));
    else setLogoPreview(editing ? publicLogoUrl(editing.logo_url) : null);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    let logoUrl = editing?.logo_url || null;
    if (logoFile) {
      const path = `${Date.now()}-${logoFile.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
      const upload = await supabase.storage.from(LOGO_BUCKET).upload(path, logoFile, { upsert: true });
      if (upload.error) {
        setBusy(false);
        alert('Logo yüklenemedi: ' + upload.error.message);
        return;
      }
      logoUrl = path;
    }
    const payload = { name: name.trim(), logo_url: logoUrl };
    const result = editing ? await supabase.from('insurance_companies').update(payload).eq('id', editing.id) : await supabase.from('insurance_companies').insert(payload);
    setBusy(false);
    if (result.error) { alert('Şirket kaydedilemedi.'); return; }
    setFormOpen(false); refresh();
  }

  async function remove(id: string, logoUrl: string | null) {
    if (!window.confirm('Bu sigorta şirketini silmek istediğinize emin misiniz?')) return;
    if (logoUrl) {
      await supabase.storage.from(LOGO_BUCKET).remove([logoUrl.replace(/^company-logos\//, '')]);
    }
    const result = await supabase.from('insurance_companies').delete().eq('id', id);
    if (result.error) alert('Şirket silinemedi.'); else refresh();
  }

  return <div>
    <PageTitle title="Sigorta Şirketleri" subtitle="Sigorta şirketlerini ekleyin ve yönetin. Poliçe formunda dinamik olarak görünür." action={<button onClick={openNew} className="btn-primary"><Plus size={17} /> Yeni Şirket</button>} />
    {formOpen && <form onSubmit={save} className="card p-5 mb-5 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
      <h3 className="col-span-full font-bold">{editing ? 'Şirket Düzenle' : 'Yeni Sigorta Şirketi'}</h3>
      <label className="field">Şirket Adı<input required value={name} onChange={e => setName(e.target.value)} placeholder="Şirket adını yazın" /></label>
      <div className="field">
        <span>Şirket Logosu <span className="text-[10px] font-normal text-slate-400">(Opsiyonel)</span></span>
        <div className="flex items-center gap-3">
          <label className="btn-secondary cursor-pointer"><Upload size={16} /> Logo Seç<input type="file" accept="image/*" className="hidden" onChange={onLogoChange} /></label>
          {logoPreview && <img src={logoPreview} alt="logo" className="size-12 rounded-lg object-contain border border-slate-200 bg-white" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
        </div>
        <span className="text-xs text-slate-400">PNG veya JPG logo yükleyebilirsiniz.</span>
      </div>
      <div className="col-span-full flex justify-end gap-3"><button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Vazgeç</button><button disabled={busy} className="btn-primary">{busy ? 'Kaydediliyor...' : 'Kaydet'}</button></div>
    </form>}
    <div className="card overflow-hidden">
      <div className="teal-strip"><span>Sigorta Şirketleri <small>({companies.length})</small></span></div>
      <div className="overflow-x-auto"><table>
        <thead><tr><th>Logo</th><th>Şirket Adı</th><th>Eklenme Tarihi</th><th>İşlem</th></tr></thead>
        <tbody>
          {companies.length ? companies.map(c => <tr key={c.id}>
            <td><CompanyLogo path={c.logo_url} name={c.name} size={36} /></td>
            <td className="font-semibold text-slate-800">{c.name}</td>
            <td>{c.created_at ? new Date(c.created_at).toLocaleDateString('tr-TR') : '--'}</td>
            <td><div className="flex gap-1"><button className="icon-btn" onClick={() => openEdit(c)} title="Düzenle"><Pencil size={15} /></button><button className="icon-btn danger" onClick={() => remove(c.id, c.logo_url)} title="Sil"><Trash2 size={15} /></button></div></td>
          </tr>) : <tr><td colSpan={4} className="empty">Henüz sigorta şirketi kaydı bulunmuyor.</td></tr>}
        </tbody>
      </table></div>
    </div>
  </div>;
}
