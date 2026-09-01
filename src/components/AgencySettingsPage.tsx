import { useEffect, useState, type FormEvent } from 'react';
import { Upload, Trash2, Building2, Save, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { AgencyProfile } from '@/lib/types';

function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return <div className="mb-6"><h2 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>{subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}</div>;
}

export function AgencySettingsPage({ profile, refresh }: { profile: AgencyProfile | null; refresh: () => void }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [logoMessage, setLogoMessage] = useState('');

  useEffect(() => {
    if (profile) {
      setForm({ name: profile.name || '', phone: profile.phone || '', email: profile.email || '', address: profile.address || '' });
      if (profile.logo_path) loadLogoPreview(profile.logo_path);
    }
  }, [profile]);

  async function loadLogoPreview(path: string) {
    const result = await supabase.storage.from('agency-logos').getPublicUrl(path);
    if (result.data?.publicUrl) setLogoPreview(result.data.publicUrl);
  }

  function update(key: string, value: string) { setForm(v => ({ ...v, [key]: value })); }

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setLogoFile(file);
    setLogoMessage('');
    if (file) { const reader = new FileReader(); reader.onload = ev => setLogoPreview(ev.target?.result as string); reader.readAsDataURL(file); }
  }

  async function removeLogo() {
    if (!profile?.logo_path) return;
    if (!window.confirm('Logoyu silmek istediğinize emin misiniz?')) return;
    setLogoBusy(true);
    await supabase.storage.from('agency-logos').remove([profile.logo_path]);
    await supabase.from('agency_profiles').update({ logo_path: null, updated_at: new Date().toISOString() }).eq('id', profile.id);
    setLogoPreview(null);
    setLogoFile(null);
    setLogoBusy(false);
    setLogoMessage('Logo silindi.');
    refresh();
  }

  async function saveLogo(e: FormEvent) {
    e.preventDefault();
    if (!logoFile) { setLogoMessage('Lütfen önce bir logo dosyası seçin.'); return; }
    setLogoBusy(true); setLogoMessage('');
    let logoPath = profile?.logo_path || null;
    const ext = logoFile.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'png';
    const path = `logos/${Date.now()}.${ext}`;
    const upload = await supabase.storage.from('agency-logos').upload(path, logoFile, { upsert: true });
    if (upload.error) { setLogoBusy(false); setLogoMessage('Logo yüklenemedi: ' + upload.error.message); return; }
    logoPath = path;
    const payload = { logo_path: logoPath, updated_at: new Date().toISOString() };
    if (profile) {
      const result = await supabase.from('agency_profiles').update(payload).eq('id', profile.id);
      if (result.error) { setLogoBusy(false); setLogoMessage('Logo kaydedilemedi: ' + result.error.message); return; }
    } else {
      const result = await supabase.from('agency_profiles').insert({ ...payload, name: form.name || 'Acente' }).select('id').single();
      if (result.error) { setLogoBusy(false); setLogoMessage('Logo kaydedilemedi: ' + result.error.message); return; }
    }
    setLogoBusy(false); setLogoFile(null);
    setLogoMessage('Logo başarıyla kaydedildi.');
    refresh();
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setMessage('');
    const payload = { name: form.name, phone: form.phone || null, email: form.email || null, address: form.address || null, updated_at: new Date().toISOString() };
    if (profile) {
      const result = await supabase.from('agency_profiles').update(payload).eq('id', profile.id);
      if (result.error) { setBusy(false); setMessage('Kayıt başarısız.'); return; }
    } else {
      const result = await supabase.from('agency_profiles').insert(payload).select('id').single();
      if (result.error) { setBusy(false); setMessage('Kayıt başarısız.'); return; }
    }
    setBusy(false);
    setMessage('Acente bilgileri kaydedildi.');
    refresh();
  }

  return <div>
    <PageTitle title="Acente Ayarları" subtitle="Acente/şube bilgilerinizi ve logonuzu yönetin. Bu bilgiler üst menüde görünür." />
    <form onSubmit={saveLogo} className="card overflow-hidden max-w-2xl mb-5">
      <div className="teal-strip">Acente Logosu</div>
      <div className="p-6 space-y-5">
        <div className="flex items-center gap-6">
          <div className="size-24 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden flex-shrink-0">
            {logoPreview ? <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" /> : <Building2 size={32} className="text-slate-400" />}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <label className="btn-secondary cursor-pointer inline-flex items-center gap-2"><Upload size={15} /> Logo Seç<input type="file" accept=".png,.jpg,.jpeg,.webp,.svg" className="hidden" onChange={onLogoChange} /></label>
              {logoPreview && <button type="button" onClick={removeLogo} className="btn-secondary inline-flex items-center gap-2" style={{ color: '#dc2626' }} disabled={logoBusy}><Trash2 size={15} /> Logoyu Sil</button>}
            </div>
            <p className="text-xs text-slate-400 mt-2">PNG, JPG veya SVG. Üst menünün sağ tarafında acente adının yanında görünür.</p>
          </div>
        </div>
        {logoMessage && <div className={`text-sm p-3 rounded-lg ${logoMessage.includes('başarı') || logoMessage.includes('silindi') ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>{logoMessage}</div>}
        <div className="flex justify-end"><button disabled={logoBusy || !logoFile} className="btn-primary inline-flex items-center gap-2"><Save size={16} /> {logoBusy ? 'Kaydediliyor...' : 'Logoyu Kaydet'}</button></div>
      </div>
    </form>
    <form onSubmit={save} className="card overflow-hidden max-w-2xl">
      <div className="teal-strip">Acente / Şube Bilgileri</div>
      <div className="p-6 space-y-5">
        <label className="field">Acente / Şube Adı<input required value={form.name} onChange={e => update('name', e.target.value)} placeholder="Acente / Şube adını yazın" /></label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="field">Telefon<input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="0XXX XXX XX XX" /></label>
          <label className="field">E-Posta<input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="info@acente.com" /></label>
        </div>
        <label className="field">Adres<textarea value={form.address} onChange={e => update('address', e.target.value)} placeholder="Acente adresi" rows={3} /></label>
        {message && <div className="text-sm p-3 rounded-lg bg-blue-50 text-blue-700">{message}</div>}
        <div className="flex justify-end"><button disabled={busy} className="btn-primary inline-flex items-center gap-2"><Check size={16} /> {busy ? 'Kaydediliyor...' : 'Bilgileri Kaydet'}</button></div>
      </div>
    </form>
  </div>;
}
