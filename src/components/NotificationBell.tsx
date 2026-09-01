import { useState } from 'react';
import { Bell, ChevronRight, X } from 'lucide-react';

export type Policy = {
  id: string;
  musteri_adi: string;
  plaka: string;
  sigorta_turu: string;
  bitis_tarihi: string;
  iptal: boolean;
};

type NotificationItem = {
  policy: Policy;
  daysLeft: number;
  expired: boolean;
};

function dateDiff(date: string): number {
  if (!date) return Infinity;
  return Math.ceil((new Date(`${date}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
}

const WARNING_DAYS = 15;

export function NotificationBell({
  policies,
  onNavigate,
}: {
  policies: Policy[];
  onNavigate: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const flagged = policies
    .filter(p => !p.iptal && p.bitis_tarihi && dateDiff(p.bitis_tarihi) <= WARNING_DAYS)
    .sort((a, b) => dateDiff(a.bitis_tarihi) - dateDiff(b.bitis_tarihi));

  const items: NotificationItem[] = flagged.map(p => ({
    policy: p,
    daysLeft: dateDiff(p.bitis_tarihi),
    expired: dateDiff(p.bitis_tarihi) < 0,
  }));

  const count = flagged.length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative text-slate-500 hover:text-slate-700 transition"
        title="Bildirimler"
      >
        <Bell size={20} />
        {count > 0 && (
          <span className="absolute -right-1.5 -top-1.5 size-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div
            className="modal"
            style={{ width: 'min(100%, 520px)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Bell size={20} className="text-teal-600" />
                <h3 className="font-bold text-lg">Bildirimler</h3>
                {count > 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">{count}</span>}
              </div>
              <button className="icon-btn" onClick={() => setOpen(false)}><X size={18} /></button>
            </div>

            {count === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">Şu an bildirim yok. Süresi yaklaşan veya dolmuş poliçe bulunmuyor.</p>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {items.map((item, i) => (
                  <div
                    key={i}
                    className={`rounded-xl border p-4 cursor-pointer transition hover:shadow-md ${item.expired ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}
                    onClick={() => { onNavigate(item.policy.id); setOpen(false); }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.expired ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}`}>
                            {item.expired ? 'Süresi Doldu' : `${item.daysLeft} Gün Kaldı`}
                          </span>
                          <span className="text-xs text-slate-500">{item.policy.bitis_tarihi}</span>
                        </div>
                        <p className="font-semibold text-slate-800 text-sm">{item.policy.musteri_adi}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {item.policy.sigorta_turu} · {item.policy.plaka || 'Plaka yok'}
                        </p>
                      </div>
                      <ChevronRight size={18} className="text-slate-400 flex-shrink-0 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
