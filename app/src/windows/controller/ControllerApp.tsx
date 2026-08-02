// ────────────────────────────────────────────
// TALLER VJ APP 0.3 — ControllerApp.tsx
// § - Three columns: deck A, cue and mixer, deck B · TSX
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react';
import { useSession } from '../../store';
import { out, onBus } from '../../out';
import { setFlash, setPattern, toggleBlackout } from '../../actions';
import { getKey } from '../../search';
import { exportSession, importSession } from '../../session';
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

  const flash = (m: string) => setFlashNow(m);
  const setFlashNow = (m: string) => { setMsg(m); clearTimeout(flashT.current); flashT.current = setTimeout(() => setMsg(null), 2600); };
  const flashT = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    setFlash(m => { setMsg(m); clearTimeout(t); t = setTimeout(() => setMsg(null), 1600); });
    // a saída pode nascer depois do controlador: quando ela anuncia, reenviamos tudo
    return onBus(m => { if ('t' in m && m.t === 'up') pushAll(); });
  }, []);

  // checklist pré-show: o que costuma faltar cinco minutos antes de começar
  const runChecklist = async () => {
    const v = useSession.getState();
    const info = (await window.vj?.checklist?.()) as Record<string, unknown> | undefined;
    const itens = [
      [!!info?.saida, 'saída aberta'],
      [!!info?.fullscreen || (info?.telas as number) === 1, 'saída em tela cheia'],
      [(info?.telas as number) > 1, 'segunda tela conectada'],
      [!!getKey(), 'chave de API salva'],
      [navigator.onLine, 'internet'],
      [!!v.now.A || !!v.now.B, 'ao menos um deck carregado'],
      [!v.blackout, 'blackout desligado'],
      [!v.pattern, 'padrão de calibração desligado']
    ] as [boolean, string][];
    const faltando = itens.filter(([ok]) => !ok).map(([, t]) => t);
    flash(faltando.length ? '⚠ ' + faltando.join(' · ') : '✓ tudo pronto');
  };

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
        <div className="fsep" />
        <button className={'tgl' + (s.blackout ? ' on' : '')}
          onClick={toggleBlackout} title="apaga a saída (B)">blackout</button>
        <span className="tag">calibrar</span>
        {[['grid', 'grade'], ['bars', 'barras'], ['focus', 'foco']].map(([k, t]) => (
          <button key={k} className={'tgl' + (s.pattern === k ? ' on' : '')}
            onClick={() => setPattern(k)}>{t}</button>
        ))}
        <div className="fsep" />
        <button onClick={exportSession} title="salvar sessão em arquivo">salvar sessão</button>
        <button onClick={() => importSession(pushAll)}>abrir sessão</button>
        <div style={{ flex: 1 }} />
        {!s.outLive && <span className="tag treino">modo treino — sem saída</span>}
        <button onClick={runChecklist}>checar</button>
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
