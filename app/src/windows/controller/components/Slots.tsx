// ────────────────────────────────────────────
// TALLER VJ APP 0.3 — Slots.tsx
// § - Hot slots 0-9: momentary samples with trim · TSX
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useSession } from '../../../store';
import { assignSlot, cue, poolAssign } from '../../../actions';
import { clean, fmt, type Item } from '../../../types';

export default function Slots() {
  const s = useSession();
  const order = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

  return (
    <div id="slots">
      {order.map(n => {
        const it = s.slots[n];
        const armed = it && s.poolOf[n] != null;
        return (
          <div key={n}
            className={'slot' + (armed ? ' armed' : '') + (s.held[n] ? ' hot' : '')}
            onClick={() => { if (it) cue(it); }}
            onContextMenu={e => { e.preventDefault(); assignSlot(n); }}
            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drop'); }}
            onDragLeave={e => e.currentTarget.classList.remove('drop')}
            onDrop={e => {
              e.preventDefault(); e.stopPropagation();
              e.currentTarget.classList.remove('drop');
              try {
                const dropped = clean(JSON.parse(e.dataTransfer.getData('text/plain')) as Item);
                const slots = [...s.slots]; slots[n] = dropped;
                s.set('slots', slots); s.save(); poolAssign(n);
              } catch { /* ignore */ }
            }}>
            {it && <img src={it.thumb} alt="" />}
            <span className="n">{n}</span>
            {it?.out != null && <span className="tr">{fmt(it.in ?? 0)}–{fmt(it.out)}</span>}
          </div>
        );
      })}
    </div>
  );
}
