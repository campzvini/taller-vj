// ────────────────────────────────────────────
// TALLER VJ APP 0.3 — Mixer.tsx
// § - Crossfader, master fx and sample layer controls · TSX
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
const SBLENDS = ['screen', 'normal', 'difference', 'multiply', 'exclusion', 'lighten'];

export default function Mixer() {
  const s = useSession();
  const liveXf = useLive(l => l.val.xf);
  const secs = useRef<HTMLInputElement>(null);
  const fade = () => autofade(parseFloat(secs.current?.value || '4') || 4);

  const xfMostrado = Math.round(liveXf ?? s.xf);
  const label = xfMostrado === 0 ? 'A' : xfMostrado === 100 ? 'B'
    : `A ${100 - xfMostrado} · ${xfMostrado} B`;

  return (
    <>
      <div id="xfbox">
        <div className="row"><span className="tag">crossfader</span><span className="tag">{label}</span></div>
        {/* quando há modulação, o ponteiro mostra o valor efetivo: o som virou o VJ */}
        <div className="row"><b>A</b>
          <input type="range" id="xf" min={0} max={100}
            className={liveXf != null ? 'modulado' : ''}
            value={Math.round(liveXf ?? s.xf)}
            onChange={e => applyXf(+e.target.value)} /><b>B</b></div>
        <div className="row">
          <span className="tag">smooth</span>
          <input type="range" min={0} max={300} value={s.smooth} style={{ maxWidth: 60 }}
            onChange={e => { const v = +e.target.value; s.set('smooth', v); out.smooth(v); }} />
          <span className="val">{s.smooth}</span>
          <span className="tag">secs</span>
          <input ref={secs} defaultValue="4" style={{ width: 34 }} />
          <button onClick={fade}>auto fade (G)</button>
          <select value={s.blend} style={{ maxWidth: 90 }}
            onChange={e => { s.set('blend', e.target.value); out.blend(e.target.value); }}>
            {BLENDS.map(b => <option key={b}>{b}</option>)}
          </select>
          {/* a curva muda a sensação da mão sem mexer no traço do fader */}
          <select value={s.curve} style={{ maxWidth: 70 }} title="crossfader curve"
            onChange={e => { s.set('curve', e.target.value as Curve); applyXf(s.xf); }}>
            <option value="linear">linear</option>
            <option value="log">smooth</option>
            <option value="cut">cut</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="row">
          <span className="tag">samples 0–9</span>
          <select value={s.sampBlend} style={{ maxWidth: 86 }}
            onChange={e => { s.set('sampBlend', e.target.value); out.sampBlend(e.target.value); }}>
            {SBLENDS.map(b => <option key={b}>{b}</option>)}
          </select>
          <span className="tag">fade</span>
          <input type="range" min={0} max={600} value={s.sampFade} style={{ maxWidth: 46 }}
            onChange={e => { const v = +e.target.value; s.set('sampFade', v); out.sampFade(v); }} />
          <span className="tag">zoom</span>
          <input type="range" min={100} max={220} value={s.sampZoom} style={{ maxWidth: 46 }}
            onChange={e => { const v = +e.target.value; s.set('sampZoom', v); out.sampZoom(+(v / 100).toFixed(3)); }} />
          <button className={'tgl' + (s.sampAudio ? ' on' : '')}
            onClick={() => { const on = !s.sampAudio; s.set('sampAudio', on); out.sampVol(on ? s.sampVol : 0); }}>sound</button>
          <input type="range" min={0} max={100} value={s.sampVol} style={{ maxWidth: 46 }}
            onChange={e => { const v = +e.target.value; s.set('sampVol', v); if (s.sampAudio) out.sampVol(v); }} />
        </div>

        <div className={'row fxrow' + (s.bus === 'M' ? ' focus' : '')}>
          <span className="tag w40">master</span>
          {FX_NAMES.map(f => (
            <button key={f} className={'fx' + (s.fx.M.has(f) ? ' on' : '')}
              onClick={() => { s.set('bus', 'M'); toggleFx('M', f); }}>{SHORT[f]}</button>
          ))}
          <input type="range" min={0} max={100} value={Math.round(s.amt.M * 100)}
            onChange={e => setAmt('M', +e.target.value / 100)} />
        </div>
      </div>
    </>
  );
}
