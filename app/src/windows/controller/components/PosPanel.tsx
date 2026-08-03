// ────────────────────────────────────────────
// TALLER VJ APP 0.5 — PosPanel.tsx
// § - Per-channel framing: pan, rotation, flip, crop · TSX
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useCallback, useRef, useState } from 'react';
import { useSession } from '../../../store';
import { applyPos, resetPos } from '../../../actions';
import { useClickOutside } from '../../../hooks/useClickOutside';
import type { Deck } from '../../../types';

export default function PosPanel({ side }: { side: Deck }) {
  const pos = useSession(s => s.pos[side]);
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(open, close, [box, btn]);

  const mexido = pos.pan[0] || pos.pan[1] || pos.rot || pos.flipH || pos.flipV
    || pos.crop.some(c => c);

  return (
    <span className="poswrap">
      <button ref={btn} className={'posbtn' + (mexido ? ' on' : '')}
        onClick={() => setOpen(o => !o)} title="pan, rotate, flip, crop">
        ✥ framing</button>

      {open && (
        <div className="pospanel" ref={box}>
          <div className="row"><span className="tag w40">pan X</span>
            <input type="range" min={-50} max={50} value={pos.pan[0]}
              onChange={e => applyPos(side, { pan: [+e.target.value, pos.pan[1]] })} />
            <span className="val">{pos.pan[0]}</span></div>
          <div className="row"><span className="tag w40">pan Y</span>
            <input type="range" min={-50} max={50} value={pos.pan[1]}
              onChange={e => applyPos(side, { pan: [pos.pan[0], +e.target.value] })} />
            <span className="val">{pos.pan[1]}</span></div>
          <div className="row"><span className="tag w40">rotate</span>
            <input type="range" min={-180} max={180} value={pos.rot}
              onChange={e => applyPos(side, { rot: +e.target.value })} />
            <span className="val">{pos.rot}°</span></div>
          <div className="row">
            <button className={'mk' + (pos.flipH ? ' on' : '')}
              onClick={() => applyPos(side, { flipH: !pos.flipH })}>flip ↔</button>
            <button className={'mk' + (pos.flipV ? ' on' : '')}
              onClick={() => applyPos(side, { flipV: !pos.flipV })}>flip ↕</button>
            <button className="mk" onClick={() => resetPos(side)}>reset</button>
          </div>
          <div className="tag">edge crop</div>
          {(['top', 'right', 'bottom', 'left'] as const).map((nome, i) => (
            <div className="row" key={nome}><span className="tag w40">{nome}</span>
              <input type="range" min={0} max={45} value={pos.crop[i]}
                onChange={e => {
                  const crop = [...pos.crop] as [number, number, number, number];
                  crop[i] = +e.target.value;
                  applyPos(side, { crop });
                }} />
              <span className="val">{pos.crop[i]}</span></div>
          ))}
        </div>
      )}
    </span>
  );
}
