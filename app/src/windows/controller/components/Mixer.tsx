// ────────────────────────────────────────────
// TALLER VJ APP 1.5 — Mixer.tsx
// § - Crossfader and the master bus it feeds, in one block · TSX
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useRef } from 'react';
import { useSession } from '../../../store';
import { useLive } from '../../../live';
import { out } from '../../../out';
import { applyXf, autofade, setAmt, toggleFx } from '../../../actions';
import { FX_NAMES, type Curve, type FxName } from '../../../types';

const SHORT: Record<FxName, string> = { glitch: 'GLI', invert: 'INV', melt: 'MEL', hue: 'HUE', strobe: 'STR' };
const BLENDS = ['normal', 'difference', 'screen', 'multiply', 'exclusion', 'overlay', 'hard-light', 'color-dodge', 'luminosity'];

/** O crossfader alimenta o bus master: procurá-los em caixas diferentes é
 *  procurar duas vezes a mesma coisa. Aqui eles são um bloco só. */
export default function Mixer() {
  const s = useSession();
  const liveXf = useLive(l => l.val.xf);
  const secs = useRef<HTMLInputElement>(null);
  const fade = () => autofade(parseFloat(secs.current?.value || '4') || 4);

  const xfMostrado = Math.round(liveXf ?? s.xf);
  const label = xfMostrado === 0 ? 'full A' : xfMostrado === 100 ? 'full B'
    : `${100 - xfMostrado} · ${xfMostrado}`;

  return (
    <div className="bloco xfbox">
      <div className="bhd"><span>crossfader</span><span className="valbig">{label}</span></div>

      <div className="row xfrow">
        <b>A</b>
        <input type="range" id="xf" min={0} max={100}
          className={liveXf != null ? 'modulado' : ''}
          value={Math.round(liveXf ?? s.xf)}
          onChange={e => applyXf(+e.target.value)} />
        <b>B</b>
      </div>

      <div className="row">
        <span className="tag w40">smooth</span>
        <input type="range" min={0} max={300} value={s.smooth} style={{ maxWidth: 76 }}
          onChange={e => { const v = +e.target.value; s.set('smooth', v); out.smooth(v); }} />
        <span className="val">{s.smooth}</span>
        <select value={s.curve} style={{ maxWidth: 74 }} title="crossfader curve"
          onChange={e => { s.set('curve', e.target.value as Curve); applyXf(s.xf); }}>
          <option value="linear">linear</option>
          <option value="log">smooth</option>
          <option value="cut">cut</option>
        </select>
        <input ref={secs} defaultValue="4" style={{ width: 30 }} title="seconds" />
        <button onClick={fade}>auto fade (G)</button>
      </div>

      <div className="row">
        <span className="tag w40">blend</span>
        <select value={s.blend} style={{ flex: 1 }}
          onChange={e => { s.set('blend', e.target.value); out.blend(e.target.value); }}>
          {BLENDS.map(b => <option key={b}>{b}</option>)}
        </select>
      </div>

      <div className={'row fxrow master' + (s.bus === 'M' ? ' focus' : '')}>
        <span className="tag w40">master</span>
        {FX_NAMES.map(f => (
          <button key={f} className={'fx' + (s.fx.M.has(f) ? ' on' : '')}
            onClick={() => { s.set('bus', 'M'); toggleFx('M', f); }}>{SHORT[f]}</button>
        ))}
        <input type="range" min={0} max={100} value={Math.round(s.amt.M * 100)}
          title="master effect amount" onChange={e => setAmt('M', +e.target.value / 100)} />
      </div>
    </div>
  );
}
