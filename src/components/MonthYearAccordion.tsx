import { useState } from 'react';
import { ChevronDown, Filter } from 'lucide-react';

type Props = { onChange: (month: string, year: string) => void };

export function MonthYearAccordion({ onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const update = (nextMonth: string, nextYear: string) => { setMonth(nextMonth); setYear(nextYear); onChange(nextMonth, nextYear); };
  return <div className="filter-accordion">
    <button type="button" onClick={() => setOpen(value => !value)} className="w-full flex items-center gap-2 text-slate-600 hover:bg-slate-50"><Filter size={14} /> Ay / Yıl Filtreleme <ChevronDown size={15} className={`ml-auto transition-transform ${open ? 'rotate-180' : ''}`} /></button>
    {open && <div className="filter-fields grid grid-cols-1 sm:grid-cols-2"><label className="field">Ay<select value={month} onChange={event => update(event.target.value, year)} className="dark-select"><option value="">Tüm aylar</option>{Array.from({ length: 12 }, (_, index) => <option key={index} value={String(index)}>{new Intl.DateTimeFormat('tr-TR', { month: 'long' }).format(new Date(2020, index, 1))}</option>)}</select></label><label className="field">Yıl<select value={year} onChange={event => update(month, event.target.value)} className="dark-select"><option value="">Tüm yıllar</option>{Array.from({ length: 2040 - new Date().getFullYear() + 1 }, (_, index) => { const value = String(new Date().getFullYear() - 2 + index); return <option key={value} value={value}>{value}</option>; })}</select></label></div>}
  </div>;
}
