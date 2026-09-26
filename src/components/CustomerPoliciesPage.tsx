import { useMemo, useState } from 'react';
import { Banknote, Car, ChevronDown, ChevronRight, CreditCard, FileText, Home, List, Search, Users, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Policy, Customer, Agency, InsuranceCompany } from '@/lib/types';
import { CompanyLogo } from '@/components/CompaniesPage';

function normalizeTr(s: string) {
  return s.replace(/İ/g, 'I').replace(/ı/g, 'i').replace(/Ş/g, 'S').replace(/ş/g, 's').replace(/Ğ/g, 'G').replace(/ğ/g, 'g').replace(/Ç/g, 'C').replace(/ç/g, 'c').replace(/Ü/g, 'U').replace(/ü/g, 'u').replace(/Ö/g, 'O').replace(/ö/g, 'o').replace(/\s+/g, ' ').trim().toLowerCase();
}

function dateDiff(dateStr: string): number {
  if (!dateStr) return 9999;
  const target = new Date(dateStr + 'T00:00:00');
  if (isNaN(target.getTime())) return 9999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

const money = (value: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value || 0);

const VEHICLE_KEYWORDS = ['trafik', 'kasko', 'yesil', 'imm', 'ferdi', 'motor', 'oto'];

function isVehiclePolicy(p: Policy): boolean {
  if (p.branch_group === 'OTO') return true;
  const turu = normalizeTr(p.sigorta_turu || '');
  if (VEHICLE_KEYWORDS.some(k => turu.includes(k))) return true;
  if (p.plaka && p.plaka.trim()) return true;
  return false;
}

type ViewMode = 'customer' | 'policy';
type StatusFilter = 'all' | 'active' | 'cancelled' | 'expiring' | 'expired';
type CategoryFilter = 'all' | 'vehicle' | 'other';

type GroupedCustomer = {
  key: string;
  name: string;
  tcNo: string;
  vehiclePols: Policy[];
  otherPols: Policy[];
  total: number;
};

function normalizeCompanyName(s: string) { return normalizeTr(s); }
function companyLogoFor(companyName: string, companies: InsuranceCompany[]) {
  const norm = normalizeCompanyName(companyName);
  return companies.find(c => normalizeCompanyName(c.name) === norm)?.logo_url || null;
}
function agencyName(id: string | null, agencies: Agency[]) { return agencies.find(a => a.id === id)?.name || '--'; }

export function CustomerPoliciesPage({ policies, customers, agencies, companies }: { policies: Policy[]; customers: Customer[]; agencies: Agency[]; companies: InsuranceCompany[] }) {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('customer');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [openCustomers, setOpenCustomers] = useState<Record<string, boolean>>({});

  const allTypes = useMemo(() => {
    const set = new Set<string>();
    policies.forEach(p => { if (p.sigorta_turu) set.add(p.sigorta_turu); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [policies]);

  const filteredPolicies = useMemo(() => {
    let arr = policies.filter(p => {
      if (categoryFilter === 'vehicle' && !isVehiclePolicy(p)) return false;
      if (categoryFilter === 'other' && isVehiclePolicy(p)) return false;
      if (typeFilter && (p.sigorta_turu || '') !== typeFilter) return false;

      if (statusFilter === 'active' && p.iptal) return false;
      if (statusFilter === 'cancelled' && !p.iptal) return false;
      if (statusFilter === 'expiring') { if (p.iptal) return false; const d = dateDiff(p.bitis_tarihi); if (d < 0 || d > 30) return false; }
      if (statusFilter === 'expired') { if (p.iptal) return false; if (dateDiff(p.bitis_tarihi) >= 0) return false; }

      if (dateFrom && (p.bitis_tarihi || '') < dateFrom) return false;
      if (dateTo && (p.bitis_tarihi || '') > dateTo) return false;

      if (search) {
        const q = search.toLowerCase();
        const haystack = `${p.musteri_adi} ${p.police_no} ${p.belge_seri_no || ''} ${p.plaka} ${p.sigorta_sirketi} ${p.sigorta_turu}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
    return arr;
  }, [policies, search, categoryFilter, statusFilter, typeFilter, dateFrom, dateTo]);

  const groups: GroupedCustomer[] = useMemo(() => {
    const customerByName = new Map<string, Customer>();
    for (const c of customers) customerByName.set(normalizeTr(c.ad_soyad_unvan || ''), c);

    const map = new Map<string, GroupedCustomer>();
    for (const p of filteredPolicies) {
      const rawName = (p.musteri_adi || '').trim();
      if (!rawName) continue;
      const key = normalizeTr(rawName);
      let g = map.get(key);
      if (!g) {
        const matched = customerByName.get(key);
        g = { key, name: rawName, tcNo: matched?.tc_vergi_no || '', vehiclePols: [], otherPols: [], total: 0 };
        map.set(key, g);
      }
      if (isVehiclePolicy(p)) g.vehiclePols.push(p);
      else g.otherPols.push(p);
      g.total++;
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [filteredPolicies, customers]);

  const totalCustomers = groups.length;
  const totalVehicles = filteredPolicies.filter(p => isVehiclePolicy(p)).length;
  const totalOthers = filteredPolicies.filter(p => !isVehiclePolicy(p)).length;
  const expiringCount = filteredPolicies.filter(p => !p.iptal && dateDiff(p.bitis_tarihi) >= 0 && dateDiff(p.bitis_tarihi) <= 30).length;
  const expiredCount = filteredPolicies.filter(p => !p.iptal && dateDiff(p.bitis_tarihi) < 0).length;

  function sortPols(pols: Policy[]): Policy[] {
    return [...pols].sort((a, b) => (b.bitis_tarihi || '').localeCompare(a.bitis_tarihi || ''));
  }

  function expiryBadge(p: Policy) {
    if (p.iptal) return <span className="badge bg-red-100 text-red-700">İptal</span>;
    if (!p.bitis_tarihi) return <span className="text-slate-400 text-xs">--</span>;
    const days = dateDiff(p.bitis_tarihi);
    if (days < 0) return <span className="badge bg-red-100 text-red-700">Süresi Doldu ({Math.abs(days)}g)</span>;
    if (days <= 30) return <span className="badge bg-amber-100 text-amber-700">{days} Gün Kaldı</span>;
    return <span className="badge bg-emerald-100 text-emerald-700">{days} Gün</span>;
  }

  function paymentBadge(p: Policy) {
    return (p.payment_method || 'Nakit') === 'Kredi Kartı'
      ? <span className="badge blue inline-flex items-center gap-1"><CreditCard size={12} /> Kredi Kartı</span>
      : <span className="badge inline-flex items-center gap-1" style={{ color: '#65a30d', background: '#ecfccb' }}><Banknote size={12} /> Nakit</span>;
  }

  function fileLink(p: Policy) {
    if (!p.file_url) return <span className="text-slate-400 text-xs">--</span>;
    return <button className="text-teal-700 hover:underline text-xs inline-flex items-center gap-1" onClick={async () => { const result = await supabase.storage.from('policy-files').createSignedUrl(p.file_url as string, 3600); if (result.data?.signedUrl) window.open(result.data.signedUrl, '_blank', 'noopener,noreferrer'); }}><FileText size={14} /> Dosya</button>;
  }

  const flatSorted = useMemo(() => [...filteredPolicies].sort((a, b) => (b.bitis_tarihi || '').localeCompare(a.bitis_tarihi || '')), [filteredPolicies]);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Poliçeler</h2>
          <p className="text-sm text-slate-500 mt-1">Tüm poliçeler tek ekranda — müşteriye göre gruplu veya poliçe listesi olarak görüntüleyin.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <div className="card p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Müşteri</p><p className="text-2xl font-bold text-slate-900 mt-2">{totalCustomers}</p></div><div className="size-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center"><Users size={21} /></div></div></div>
        <div className="card p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Araç Poliçesi</p><p className="text-2xl font-bold text-slate-900 mt-2">{totalVehicles}</p></div><div className="size-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center"><Car size={21} /></div></div></div>
        <div className="card p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Diğer Poliçe</p><p className="text-2xl font-bold text-slate-900 mt-2">{totalOthers}</p></div><div className="size-11 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center"><Home size={21} /></div></div></div>
        <div className="card p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vade Yaklaşan/Geçen</p><p className="text-2xl font-bold text-slate-900 mt-2">{expiringCount + expiredCount}</p></div><div className="size-11 rounded-xl bg-red-50 text-red-700 flex items-center justify-center"><FileText size={21} /></div></div></div>
      </div>

      <div className="card overflow-hidden">
        <div className="teal-strip">
          <span>Poliçe Listesi <small>({filteredPolicies.length} poliçe · {totalCustomers} müşteri)</small></span>
          <div className="flex items-center gap-1 bg-white/10 rounded-lg p-0.5">
            <button onClick={() => setViewMode('customer')} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${viewMode === 'customer' ? 'bg-white text-teal-700' : 'text-white/80 hover:text-white'}`}>Müşteriye Göre</button>
            <button onClick={() => setViewMode('policy')} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${viewMode === 'policy' ? 'bg-white text-teal-700' : 'text-white/80 hover:text-white'}`}><List size={13} className="inline mr-1" />Poliçeye Göre</button>
          </div>
        </div>

        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <div className="search max-w-md flex-1">
            <Search size={16} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Müşteri adı, poliçe no, plaka veya şirket ara..." />
            {search && <button type="button" onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-700" title="Temizle"><X size={16} /></button>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600"><span>Kategori:</span>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as CategoryFilter)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white">
                <option value="all">Hepsi</option><option value="vehicle">Araç</option><option value="other">Diğer</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600"><span>Durum:</span>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white">
                <option value="all">Tümü</option><option value="active">Aktif</option><option value="cancelled">İptal</option><option value="expiring">Vade Yaklaşan</option><option value="expired">Vadesi Geçmiş</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600"><span>Tür:</span>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white">
                <option value="">Tümü</option>{allTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600"><span>Vade:</span>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white" />
              <span className="text-slate-400">–</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white" />
            </label>
          </div>
        </div>

        {viewMode === 'customer' ? (
          <div className="divide-y divide-slate-100">
            {groups.length ? groups.map(g => {
              const isOpen = openCustomers[g.key] ?? false;
              const sortedVehicles = sortPols(g.vehiclePols);
              const sortedOthers = sortPols(g.otherPols);
              return (
                <div key={g.key}>
                  <button onClick={() => setOpenCustomers(v => ({ ...v, [g.key]: !isOpen }))} className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition">
                    <div className="flex items-center gap-3">
                      {isOpen ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                      <span className="font-bold text-slate-800">{g.name}</span>
                      {g.tcNo && <span className="text-xs text-slate-400 font-mono">{g.tcNo}</span>}
                      <span className="text-xs text-slate-400">
                        {g.vehiclePols.length > 0 && `${g.vehiclePols.length} Araç`}
                        {g.vehiclePols.length > 0 && g.otherPols.length > 0 && ', '}
                        {g.otherPols.length > 0 && `${g.otherPols.length} Diğer`}
                        {' '}({g.total} Poliçe)
                      </span>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 bg-slate-50/50 space-y-4">
                      {sortedVehicles.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2 mt-3"><Car size={16} className="text-blue-600" /><h4 className="text-sm font-bold text-slate-700">Araç Poliçeleri ({sortedVehicles.length})</h4></div>
                          <div className="overflow-x-auto"><table><thead><tr><th>Plaka</th><th>Sigorta Türü</th><th>Marka / Model</th><th>Poliçe No</th><th>Şirket</th><th>Net Prim</th><th>Brüt Prim</th><th>Bitiş</th><th>Ödeme</th><th>Dosya</th><th>Durum</th></tr></thead><tbody>
                            {sortedVehicles.map((p, i) => {
                              const matchedCustomer = customers.find(c => normalizeTr(c.ad_soyad_unvan) === g.key && normalizeTr(c.plaka_no) === normalizeTr(p.plaka || ''));
                              return (
                                <tr key={p.id} className={i === 0 ? '' : 'opacity-60'}>
                                  <td className="font-mono text-xs font-semibold">{p.plaka || '--'}</td>
                                  <td>{p.sigorta_turu || '--'}</td>
                                  <td className="text-xs">{matchedCustomer ? `${matchedCustomer.arac_markasi || ''} ${matchedCustomer.arac_modeli || ''}`.trim() || '--' : '--'}</td>
                                  <td className="font-mono text-xs">{p.police_no || '--'}</td>
                                  <td className="text-xs"><div className="flex items-center gap-1.5"><CompanyLogo path={companyLogoFor(p.sigorta_sirketi, companies)} name={p.sigorta_sirketi} size={22} /><span>{p.sigorta_sirketi}</span></div></td>
                                  <td>{money(Number(p.net_prim))}</td>
                                  <td className="font-semibold">{money(Number(p.brut_prim))}</td>
                                  <td>{p.bitis_tarihi || '--'}</td>
                                  <td>{paymentBadge(p)}</td>
                                  <td>{fileLink(p)}</td>
                                  <td>{expiryBadge(p)}</td>
                                </tr>
                              );
                            })}
                          </tbody></table></div>
                        </div>
                      )}
                      {sortedOthers.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2 mt-3"><Home size={16} className="text-purple-600" /><h4 className="text-sm font-bold text-slate-700">Diğer Poliçeler ({sortedOthers.length})</h4></div>
                          <div className="overflow-x-auto"><table><thead><tr><th>Ürün / Tür</th><th>Poliçe No</th><th>Şirket</th><th>Net Prim</th><th>Brüt Prim</th><th>Bitiş</th><th>Ödeme</th><th>Dosya</th><th>Durum</th></tr></thead><tbody>
                            {sortedOthers.map((p, i) => (
                              <tr key={p.id} className={i === 0 ? '' : 'opacity-60'}>
                                <td className="font-semibold">{p.sigorta_turu || '--'}</td>
                                <td className="font-mono text-xs">{p.police_no || '--'}</td>
                                <td className="text-xs"><div className="flex items-center gap-1.5"><CompanyLogo path={companyLogoFor(p.sigorta_sirketi, companies)} name={p.sigorta_sirketi} size={22} /><span>{p.sigorta_sirketi}</span></div></td>
                                <td>{money(Number(p.net_prim))}</td>
                                <td className="font-semibold">{money(Number(p.brut_prim))}</td>
                                <td>{p.bitis_tarihi || '--'}</td>
                                <td>{paymentBadge(p)}</td>
                                <td>{fileLink(p)}</td>
                                <td>{expiryBadge(p)}</td>
                              </tr>
                            ))}
                          </tbody></table></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }) : <div className="px-5 py-12 text-center text-slate-400 text-sm">Bu kriterlere uygun poliçe bulunmuyor.</div>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead><tr>
                <th>Müşteri</th><th>Sigorta Şirketi</th><th>Poliçe No</th><th>Plaka</th><th>Sigorta Türü</th>
                <th>Acente</th><th>Net Prim</th><th>Brüt Prim</th><th>Bitiş</th><th>Kalan Gün</th>
                <th>Ödeme</th><th>Dosya</th><th>Durum</th>
              </tr></thead>
              <tbody>
                {flatSorted.length ? flatSorted.map(p => (
                  <tr key={p.id} className={p.iptal ? 'bg-red-50 text-red-700' : ''}>
                    <td className="font-semibold text-slate-800">{p.musteri_adi}</td>
                    <td><div className="flex items-center gap-2"><CompanyLogo path={companyLogoFor(p.sigorta_sirketi, companies)} name={p.sigorta_sirketi} size={26} /><span>{p.sigorta_sirketi}</span></div></td>
                    <td className="font-mono text-xs">{p.police_no || '--'}</td>
                    <td>{p.plaka || '--'}</td>
                    <td>{p.sigorta_turu || '--'}</td>
                    <td>{agencyName(p.agency_id, agencies)}</td>
                    <td>{money(Number(p.net_prim))}</td>
                    <td className="font-semibold">{money(Number(p.brut_prim))}</td>
                    <td>{p.bitis_tarihi || '--'}</td>
                    <td>{expiryBadge(p)}</td>
                    <td>{paymentBadge(p)}</td>
                    <td>{fileLink(p)}</td>
                    <td><span className={`badge ${p.iptal ? 'bg-red-100 text-red-700' : p.odeme_durumu === 'verdi' ? 'green' : 'orange'}`}>{p.iptal ? 'İptal' : p.odeme_durumu === 'verdi' ? 'Verdi' : 'Verecek'}</span></td>
                  </tr>
                )) : <tr><td colSpan={13} className="empty">Bu kriterlere uygun poliçe bulunmuyor.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
