import { useState } from 'react';
import { FileText, Download, Printer, X } from 'lucide-react';
import jsPDF from 'jspdf';
import type { Policy, Payment, Agency } from '@/lib/types';

const money = (value: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value || 0);

function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <div className="flex flex-wrap items-start justify-between gap-4 mb-6"><div><h2 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>{subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}</div>{action}</div>;
}

export function AccountStatementPage({ policies, payments, agencies }: { policies: Policy[]; payments: Payment[]; agencies: Agency[] }) {
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  const paid = (id: string) => payments.filter(x => x.policy_id === id).reduce((a, x) => a + Number(x.amount), 0);

  const entries = policies
    .filter(p => {
      const matchesSearch = !search || `${p.musteri_adi} ${p.sigorta_sirketi} ${p.police_no}`.toLowerCase().includes(search.toLowerCase());
      const dateStr = p.baslangic_tarihi || p.tanzim_tarihi || p.bitis_tarihi || p.created_at;
      if (!dateStr) return matchesSearch;
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return matchesSearch;
      const matchesMonth = !month || String(date.getMonth()) === month;
      const matchesYear = !year || String(date.getFullYear()) === year;
      return matchesSearch && matchesMonth && matchesYear;
    })
    .map(p => {
      const amountPaid = paid(p.id);
      const remaining = Math.max(Number(p.brut_prim || 0) - amountPaid, 0);
      return { ...p, amountPaid, remaining, agencyName: agencies.find(a => a.id === p.agency_id)?.name || '--' };
    })
    .sort((a, b) => (a.tanzim_tarihi || '').localeCompare(b.tanzim_tarihi || ''));

  const totalGross = entries.reduce((a, e) => a + Number(e.brut_prim || 0), 0);
  const totalPaid = entries.reduce((a, e) => a + e.amountPaid, 0);
  const totalRemaining = entries.reduce((a, e) => a + e.remaining, 0);

  function exportPDF() {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFillColor(17, 94, 89);
    doc.rect(0, 0, pageWidth, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('HESAP EKSTRESİ', pageWidth / 2, 8, { align: 'center' });

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, y);
    y += 6;
    doc.text(`Toplam Kayıt: ${entries.length}`, 14, y);
    y += 10;

    doc.setFillColor(17, 94, 89);
    doc.rect(14, y - 4, pageWidth - 28, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const colX = [16, 55, 85, 115, 140, 170, 200, 230, 260];
    doc.text('Müşteri', colX[0], y); doc.text('Şirket', colX[1], y); doc.text('Poliçe No', colX[2], y);
    doc.text('Acente', colX[3], y); doc.text('Tanzim', colX[4], y); doc.text('Brüt Prim', colX[5], y);
    doc.text('Ödenen', colX[6], y); doc.text('Kalan', colX[7], y); doc.text('Durum', colX[8], y);
    y += 6;

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    for (const e of entries) {
      if (y > 195) { doc.addPage(); y = 20; }
      const status = e.iptal ? 'İptal' : e.odeme_durumu === 'verdi' ? 'Verdi' : 'Verecek';
      doc.text(String(e.musteri_adi || '--').substring(0, 20), colX[0], y);
      doc.text(String(e.sigorta_sirketi || '--').substring(0, 18), colX[1], y);
      doc.text(String(e.police_no || '--').substring(0, 15), colX[2], y);
      doc.text(String(e.agencyName).substring(0, 15), colX[3], y);
      doc.text(e.tanzim_tarihi || '--', colX[4], y);
      doc.text(money(Number(e.brut_prim)), colX[5], y);
      doc.text(money(e.amountPaid), colX[6], y);
      doc.text(money(e.remaining), colX[7], y);
      doc.text(status, colX[8], y);
      y += 5;
    }

    y += 5;
    doc.setDrawColor(17, 94, 89);
    doc.line(14, y, pageWidth - 14, y);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Toplam Brüt Prim: ${money(totalGross)}`, 14, y);
    doc.text(`Toplam Ödenen: ${money(totalPaid)}`, 100, y);
    doc.text(`Toplam Kalan: ${money(totalRemaining)}`, 180, y);

    doc.save(`hesap-ekstresi-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function printPDF() {
    exportPDF();
    window.setTimeout(() => window.print(), 500);
  }

  return <div>
    <PageTitle title="Hesap Ekstresi" subtitle="Tüm poliçe hareketlerini ve tahsilat durumlarını görüntüleyin, PDF olarak indirin." action={<div className="flex gap-2"><button onClick={printPDF} className="btn-secondary"><Printer size={16} /> Yazdır</button><button onClick={exportPDF} className="btn-primary"><Download size={16} /> PDF İndir</button></div>} />
    <div className="card mb-5">
      <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
        <div className="search flex-1 min-w-[200px]"><FileText size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ekstrede ara..." />{search && <button type="button" onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-700" title="Temizle"><X size={16} /></button>}</div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600"><span>Ay:</span><select value={month} onChange={e => setMonth(e.target.value)} className="dark-select border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white"><option value="">Tümü</option>{Array.from({ length: 12 }, (_, i) => <option key={i} value={String(i)}>{new Intl.DateTimeFormat('tr-TR', { month: 'long' }).format(new Date(2020, i, 1))}</option>)}</select></label>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600"><span>Yıl:</span><select value={year} onChange={e => setYear(e.target.value)} className="dark-select border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white"><option value="">Tümü</option>{Array.from({ length: 2040 - new Date().getFullYear() + 1 }, (_, i) => { const v = String(new Date().getFullYear() - 2 + i); return <option key={v} value={v}>{v}</option>; })}</select></label>
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
      <div className="card p-5"><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Toplam Brüt Prim</p><p className="text-2xl font-bold text-slate-900 mt-2">{money(totalGross)}</p></div>
      <div className="card p-5"><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Toplam Ödenen</p><p className="text-2xl font-bold text-emerald-700 mt-2">{money(totalPaid)}</p></div>
      <div className="card p-5"><p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Toplam Kalan</p><p className="text-2xl font-bold text-red-600 mt-2">{money(totalRemaining)}</p></div>
    </div>
    <div className="card overflow-hidden">
      <div className="teal-strip"><span>Hesap Ekstresi <small>({entries.length} kayıt)</small></span></div>
      <div className="overflow-x-auto"><table>
        <thead><tr><th>Müşteri</th><th>Sigorta Şirketi</th><th>Poliçe No</th><th>Acente</th><th>Tanzim Tarihi</th><th>Brüt Prim</th><th>Ödenen</th><th>Kalan</th><th>Durum</th></tr></thead>
        <tbody>
          {entries.length ? entries.map(e => <tr key={e.id} className={e.iptal ? 'bg-red-50 text-red-700' : ''}>
            <td className="font-semibold text-slate-800">{e.musteri_adi}</td>
            <td>{e.sigorta_sirketi}</td>
            <td className="font-mono text-xs">{e.police_no || '--'}</td>
            <td>{e.agencyName}</td>
            <td>{e.tanzim_tarihi || '--'}</td>
            <td className="font-semibold">{money(Number(e.brut_prim))}</td>
            <td className="text-emerald-700">{money(e.amountPaid)}</td>
            <td className="font-bold text-red-600">{money(e.remaining)}</td>
            <td><span className={`badge ${e.iptal ? '' : e.odeme_durumu === 'verdi' ? 'green' : 'orange'}`} style={e.iptal ? { color: '#dc2626', background: '#fee2e2' } : undefined}>{e.iptal ? 'İptal' : e.odeme_durumu === 'verdi' ? 'Verdi' : 'Verecek'}</span></td>
          </tr>) : <tr><td colSpan={9} className="empty">Ekstre kaydı bulunmuyor.</td></tr>}
        </tbody>
      </table></div>
    </div>
  </div>;
}
