// ────────────────────────────────────────────
// TALLER VJ APP 1.5 — Slots.tsx
// § - Samples 0-9: pads and everything that shapes them · TSX
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useSession } from '../../../store';
import { out } from '../../../out';
import { assignSlot, cue, holdOff, holdOn, poolAssign } from '../../../actions';
import { clean, fmt, type Item } from '../../../types';

const SBLENDS = ['screen', 'normal', 'difference', 'multiply', 'exclusion', 'lighten'];

/** Pads e parâmetros no mesmo bloco: eram a mesma ideia em duas caixas. */
export default function Slots() {
  const s = useSession();
  const order = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

  return (
    <div className="bloco sampbox">
      <div className="bhd">
        <span>samples 0–9</span>
        <span className="dica">hold to fire · shift+click to assign</span>
      </div>

      <div id="slots">
        {order.map(n => {
          const it = s.slots[n];
          const armed = it && s.poolOf[n] != null;
          return (
            <div key={n}
              className={'slot' + (armed ? ' armed' : '') + (s.held[n] ? ' hot' : '')}
              title={it?.title || 'empty'}
              onMouseDown={e => {
                if (e.shiftKey) { assignSlot(n); return; }
                if (it) holdOn(n);
              }}
              onMouseUp={() => holdOff(n)}
              onMouseLeave={() => s.held[n] && holdOff(n)}
              onDoubleClick={() => { if (it) cue(it); }}
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

      <div className="row">
        <span className="tag w40">blend</span>
        <select value={s.sampBlend} style={{ maxWidth: 96 }}
          onChange={e => { s.set('sampBlend', e.target.value); out.sampBlend(e.target.value); }}>
          {SBLENDS.map(b => <option key={b}>{b}</option>)}
        </select>
        <span className="tag">fade</span>
        <input type="range" min={0} max={600} value={s.sampFade} style={{ maxWidth: 56 }}
          onChange={e => { const v = +e.target.value; s.set('sampFade', v); out.sampFade(v); }} />
        <span className="tag">zoom</span>
        <input type="range" min={100} max={220} value={s.sampZoom} style={{ maxWidth: 56 }}
          onChange={e => { const v = +e.target.value; s.set('sampZoom', v); out.sampZoom(+(v / 100).toFixed(3)); }} />
      </div>

      <div className="row">
        <button className={'tgl' + (s.sampAudio ? ' on' : '')}
          onClick={() => { const on = !s.sampAudio; s.set('sampAudio', on); out.sampVol(on ? s.sampVol : 0); }}>
          sound</button>
        <input type="range" min={0} max={100} value={s.sampVol}
          onChange={e => { const v = +e.target.value; s.set('sampVol', v); if (s.sampAudio) out.sampVol(v); }} />
        <span className="val">{s.sampVol}</span>
      </div>
    </div>
  );
}
