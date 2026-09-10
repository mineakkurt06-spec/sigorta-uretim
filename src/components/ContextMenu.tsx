import { useEffect, useState } from 'react';
import { Copy, Scissors, ClipboardPaste, CheckSquare } from 'lucide-react';

type MenuState = { x: number; y: number; target: HTMLInputElement | HTMLTextAreaElement };

export function ContextMenu() {
  const [menu, setMenu] = useState<MenuState | null>(null);

  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        e.preventDefault();
        e.stopPropagation();
        const maxX = window.innerWidth - 180;
        const maxY = window.innerHeight - 180;
        setMenu({ x: Math.min(e.clientX, maxX), y: Math.min(e.clientY, maxY), target: target as HTMLInputElement | HTMLTextAreaElement });
      } else {
        setMenu(null);
      }
    };
    document.addEventListener('contextmenu', onContextMenu);
    return () => document.removeEventListener('contextmenu', onContextMenu);
  }, []);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menu]);

  if (!menu) return null;

  const el = menu.target;
  const hasSelection = el.selectionStart !== el.selectionEnd;

  const setNativeValue = (value: string) => {
    const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    setter?.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const doPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      setNativeValue(el.value.slice(0, start) + text + el.value.slice(end));
      el.setSelectionRange(start + text.length, start + text.length);
    } catch {
      el.focus();
      document.execCommand('paste');
    }
  };

  const actions = [
    { label: 'Kopyala', icon: Copy, enabled: hasSelection, action: () => { el.focus(); document.execCommand('copy'); } },
    { label: 'Kes', icon: Scissors, enabled: hasSelection, action: () => { el.focus(); document.execCommand('cut'); } },
    { label: 'Yapıştır', icon: ClipboardPaste, enabled: true, action: doPaste },
    { label: 'Tümünü Seç', icon: CheckSquare, enabled: el.value.length > 0, action: () => el.select() },
  ];

  return (
    <div className="fixed z-[100]" style={{ top: menu.y, left: menu.x }} onClick={e => e.stopPropagation()}>
      <div className="card p-1 shadow-xl" style={{ minWidth: 160 }}>
        {actions.map(({ label, icon: Icon, enabled, action }) => (
          <button key={label} disabled={!enabled} className="w-full text-left px-3 py-2 rounded-md hover:bg-teal-50 text-sm flex items-center gap-2 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed" onClick={() => { action(); setMenu(null); }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>
    </div>
  );
}
