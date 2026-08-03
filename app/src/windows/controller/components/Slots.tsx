// ────────────────────────────────────────────
// TALLER VJ APP 0.3 — Slots.tsx
// § - Hot slots 0-9: momentary samples with trim · TSX
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useSession } from '../../../store';
import { assignSlot, cue, poolAssign } from '../../../actions';
import { clean, fmt, type Item } from '../../../types';

type Dock = 'mid' | 'A' | 'B' | 'window';

const DOCAS: [Dock, string][] = [
  ['A', 'deck A'], ['mid', 'centre'], ['B', 'deck B'], ['window', 'own window']
];

export function DockPicker() {
  const s = useSession();
  const mover = (d: Dock) => {
    s.set('slotsDock', d); s.save();
    if (d === 'window') window.vj?.openSlots?.(); else window.vj?.closeSlots?.();
  };
  return (
    <div className="row dockrow">
      <span className="tag">slots 0–9</span>
      {DOCAS.map(([d, t]) => (
        <button key={d} className={'mk' + (s.slotsDock === d ? ' on' : '')}
          onClick={() => mover(d)}>{t}</button>
      ))}
    </div>
  );
}

export default function Slots() {
  const s = useSession();
  const order = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

  if (s.slotsDock === 'window') {
    return (
      <div className="card">
        <div className="row">
          <span className="tag">slots 0–9 — own window</span>
          <button className="mk" onClick={() => window.vj?.openSlots?.()}>show</button>
          <button className="mk" onClick={() => {
            s.set('slotsDock', 'mid'); s.save(); window.vj?.closeSlots?.();
          }}>bring back</button>
        </div>
        <p className="nota">Keys 0–9 work in whichever window has focus.</p>
      </div>
    );
  }

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
