import { useMemo, useState } from 'react';
import { FileX, Plus, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Policy, Agency } from '@/lib/types';

const money = (value: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value || 0);

type UnrenewedRow = {
  musteri_adi: string;
  sigorta_sirketi: string;
  police_no: string;
  bitis_tarihi: string;
  daysAgo: number;
  agency_name: string;
  net_prim: number;
  brut_prim: number;
  sigorta_turu: string;
};

export function UnrenewedPoliciesPage({ policies, agencies, onAddToLost }: { policies: Policy[]; agencies: Agency[]; onAddToLost: (name: string, company: string, insuranceType: string, premium: number) => void }) {
  const [search, setSearch] = useState('');

  const rows = useMemo<UnrenewedRow[]>(() => {
    const active = policies.filter(p => !p.iptal);
    const byCustomer = new Map<string, Policy[]>();
    for (const p of active) {
      const key = (p.musteri_adi || '').trim().toLowerCase();
      if (!key) continue;
      const arr = byCustomer.get(key) || [];
      arr.push(p);
      byCustomer.set(key, arr);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result: UnrenewedRow[] = [];
    for (const [key, pols] of byCustomer) {
      const sorted = [...pols].sort((a, b) => (b.bitis_tarihi || '').localeCompare(a.bitis_tarihi || ''));
      const latest = sorted[0];
      if (!latest.bitis_tarihi) continue;
      const endDate = new Date(latest.bitis_tarihi + 'T00:00:00');
      if (endDate >= today) continue;
      const hasNewer = sorted.some(p => {
        const startStr = p.baslangic_tarihi || p.tanzim_tarihi || '';
        if (!startStr) return false;
        return new Date(startStr + 'T00:00:00') > endDate;
      });
      if (hasNewer) continue;
      const daysAgo = Math.ceil((today.getTime() - endDate.getTime()) / 86400000);
      result.push({
        musteri_adi: latest.musteri_adi,
        sigorta_sirketi: latest.sigorta_sirketi,
        police_no: latest.police_no || '',
        bitis_tarihi: latest.bitis_tarihi,
        daysAgo,
        agency_name: agencies.find(a => a.id === latest.agency_id)?.name || '--',
        net_prim: Number(latest.net_prim || 0),
        brut_prim: Number(latest.brut_prim || 0),
        sigorta_turu: latest.sigorta_turu || '',
      });
      void key;
    }
    return result.sort((a, b) => b.daysAgo - a.daysAgo);
  }, [policies, agencies]);

  const filtered = rows.filter(r => !search || `${r.musteri_adi} ${r.sigorta_sirketi} ${r.police_no} ${r.agency_name}`.toLowerCase().includes(search.toLowerCase()));

  return <div>
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Yenilenmeyen Poliçeler</h2>
        <p className="text-sm text-slate-500 mt-1">Süresi dolmuş ve yenilenmemiş poliçeler otomatik hesaplanır.</p>
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
      <div className="card p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Yenilenmeyen</p><p className="text-2xl font-bold text-slate-900 mt-2">{rows.length}</p></div><div className="size-11 rounded-xl bg-red-50 text-red-700 flex items-center justify-center"><FileX size={21} /></div></div></div>
      <div className="card p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kayıp Prim (Net)</p><p className="text-2xl font-bold text-slate-900 mt-2">{money(rows.reduce((a, r) => a + r.net_prim, 0))}</p></div><div className="size-11 rounded-xl bg-orange-50 text-orange-700 flex items-center justify-center"><FileX size={21} /></div></div></div>
      <div className="card p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kayıp Prim (Brüt)</p><p className="text-2xl font-bold text-slate-900 mt-2">{money(rows.reduce((a, r) => a + r.brut_prim, 0))}</p></div><div className="size-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center"><FileX size={21} /></div></div></div>
    </div>
    <div className="card overflow-hidden">
      <div className="teal-strip"><span>Yenilenmeyen Poliçe Listesi <small>({filtered.length})</small></span></div>
      <div className="p-4 border-b border-slate-100">
        <div className="search max-w-md"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Müşteri, şirket, poliçe no ara..." />{search && <button type="button" onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-700" title="Temizle"><X size={16} /></button>}</div>
      </div>
      <div className="overflow-x-auto"><table>
        <thead><tr><th>Müşteri Adı</th><th>Sigorta Şirketi</th><th>Son Poliçe No</th><th>Sigorta Türü</th><th>Bitiş Tarihi</th><th>Kaç Gün Önce Bitti</th><th>Acente</th><th>Net Prim</th><th>İşlem</th></tr></thead>
        <tbody>
          {filtered.length ? filtered.map((r, i) => <tr key={i}>
            <td className="font-semibold text-slate-800">{r.musteri_adi}</td>
            <td>{r.sigorta_sirketi}</td>
            <td className="font-mono text-xs">{r.police_no || '--'}</td>
            <td>{r.sigorta_turu || '--'}</td>
            <td>{r.bitis_tarihi}</td>
            <td><span className="badge bg-red-100 text-red-700">{r.daysAgo} gün</span></td>
            <td>{r.agency_name}</td>
            <td>{money(r.net_prim)}</td>
            <td><button className="btn-secondary py-2 px-3" onClick={() => onAddToLost(r.musteri_adi, r.sigorta_sirketi, r.sigorta_turu, r.net_prim)}><Plus size={14} /> Kaçanlara Ekle</button></td>
          </tr>) : <tr><td colSpan={9} className="empty">Yenilenmeyen poliçe bulunmuyor.</td></tr>}
        </tbody>
      </table></div>
    </div>
  </div>;
}
