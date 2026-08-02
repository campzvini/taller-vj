// ────────────────────────────────────────────
// TALLER VJ APP 0.3 — ControllerApp.tsx
// § - Three columns: deck A, cue and mixer, deck B · TSX
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { useSession } from '../../store';
import { out, onBus } from '../../out';
import { setFlash } from '../../actions';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useSync } from '../../hooks/useSync';
import Deck from './components/Deck';
import Cue from './components/Cue';
import Slots from './components/Slots';
import Mixer from './components/Mixer';
import Footer from './components/Footer';
import SearchStrip from './components/SearchStrip';
import './controller.css';

export default function ControllerApp() {
  const s = useSession();
  const [msg, setMsg] = useState<string | null>(null);
  useKeyboard();
  useSync();

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    setFlash(m => { setMsg(m); clearTimeout(t); t = setTimeout(() => setMsg(null), 1600); });
    // a saída pode nascer depois do controlador: quando ela anuncia, reenviamos tudo
    return onBus(m => { if ('t' in m && m.t === 'up') pushAll(); });
  }, []);

  const pushAll = () => {
    const v = useSession.getState();
    out.frame(v.ar); out.loop(v.loop); out.cc(v.cc);
    out.smooth(v.smooth); out.blend(v.blend);
    (['A', 'B'] as const).forEach(d => {
      out.opacity(d, v.op[d] / 100);
      out.zoomCh(d, +(v.zoom[d] / 100).toFixed(3));
      out.present(d, !!v.now[d]);
      if (v.now[d]) out.load(d, v.now[d]!.id);
    });
    out.xf(v.xf);
    (['A', 'B', 'M'] as const).forEach(b => out.fxBus(b, [...v.fx[b]], v.amt[b]));
    out.sampBlend(v.sampBlend); out.sampFade(v.sampFade);
    out.sampZoom(+(v.sampZoom / 100).toFixed(3));
    out.sampVol(v.sampAudio ? v.sampVol : 0);
    v.pool.forEach((n, i) => { if (n != null && v.slots[n]) out.sampLoad(i, v.slots[n]!.id, v.slots[n]!.in ?? 0); });
  };

  return (
    <>
      <div id="bar">
        <span className="name">TALLER VJ</span>
        <button className={s.outLive ? 'live' : ''} onClick={() => window.vj?.openOutput()}>
          {s.outLive ? 'SAÍDA NO AR' : 'ABRIR SAÍDA (O)'}
        </button>
        <button onClick={() => { s.set('searchOpen', !s.searchOpen); s.save(); }}>busca (/)</button>
        <div className="fsep" />
        <span className="tag">formato</span>
        {['16/9', '4/3'].map(a => (
          <button key={a} className={'tgl' + (s.ar === a ? ' on' : '')}
            onClick={() => { s.set('ar', a); s.save(); out.frame(a); }}>{a.replace('/', ':')}</button>
        ))}
        <button className={'tgl' + (s.loop ? ' on' : '')}
          onClick={() => { const on = !s.loop; s.set('loop', on); s.save(); out.loop(on); }}>loop (L)</button>
        <button className={'tgl' + (s.cc ? ' on' : '')}
          onClick={() => { const on = !s.cc; s.set('cc', on); s.save(); out.cc(on); }}>CC (K)</button>
      </div>

      <SearchStrip />

      <div id="main">
        <Deck side="A" />
        <div className="col"><Cue /><Slots /><Mixer /></div>
        <Deck side="B" />
      </div>

      <Footer />
      {msg && <div id="flash">{msg}</div>}
    </>
  );
}
