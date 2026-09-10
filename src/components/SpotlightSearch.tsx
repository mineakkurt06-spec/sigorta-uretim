import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

type Policy = { id: string; musteri_adi: string; plaka: string; police_no: string; sigorta_sirketi: string; sigorta_turu: string; bitis_tarihi: string };

type Result = { id: string; title: string; subtitle: string; tag: string };

export function SpotlightSearch({ policies, onNavigate, onClose }: { policies: Policy[]; onNavigate: (id: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return policies
      .filter(p => `${p.musteri_adi} ${p.plaka} ${p.police_no} ${p.sigorta_sirketi}`.toLowerCase().includes(q))
      .slice(0, 8)
      .map(p => ({ id: p.id, title: p.musteri_adi || 'İsimsiz', subtitle: [p.sigorta_sirketi, p.plaka, p.police_no].filter(Boolean).join(' · '), tag: p.sigorta_turu || '' }));
  }, [query, policies]);

  useEffect(() => { setActiveIndex(0); }, [query]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && results[activeIndex]) { e.preventDefault(); onNavigate(results[activeIndex].id); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" style={{ width: 'min(100%, 560px)' }} onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
          <Search size={20} className="text-slate-400" />
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={onKeyDown}
            placeholder="Plaka, müşteri adı veya poliçe no ara..." className="flex-1 outline-none text-sm text-slate-800 bg-transparent" />
          {query && <button type="button" onClick={() => { setQuery(''); inputRef.current?.focus(); }} className="text-slate-400 hover:text-slate-700" title="Temizle"><X size={18} /></button>}
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="mt-3 max-h-80 overflow-y-auto">
          {!query ? (
            <div className="text-center text-slate-400 text-sm py-10">Aramak için yazmaya başlayın</div>
          ) : results.length ? results.map((r, i) => (
            <button key={r.id} onMouseEnter={() => setActiveIndex(i)} onClick={() => onNavigate(r.id)}
              className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition ${i === activeIndex ? 'bg-teal-50' : 'hover:bg-slate-50'}`}>
              <div className="size-9 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center flex-shrink-0"><Search size={15} /></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-800 truncate">{r.title}</div>
                <div className="text-xs text-slate-400 truncate">{r.subtitle}</div>
              </div>
              {r.tag && <span className="badge blue flex-shrink-0">{r.tag}</span>}
            </button>
          )) : <div className="text-center text-slate-400 text-sm py-10">Sonuç bulunamadı</div>}
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>↑ ↓ ile gezin · Enter ile aç · Esc ile kapat</span>
          <span>{results.length} sonuç</span>
        </div>
      </div>
    </div>
  );
}
