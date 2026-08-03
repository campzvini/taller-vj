// ────────────────────────────────────────────
// TALLER VJ APP 0.3 — Deck.tsx
// § - One deck column: monitor, trim, fx bus, library · TSX
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { useSession } from '../../../store';
import { useLive } from '../../../live';
import type { Dest } from '../../../modulation';
import { usePlayer } from '../../../hooks/usePlayer';
import { L, M, setVid } from '../../../players';
import { out, outLive, tele } from '../../../out';
import Transport from './Transport';
import {
  applyAudio, applyOpacity, applyZoom, clearMark, dropInto, setAmt, setMark, toggle, toggleFx, toggleTloop
} from '../../../actions';
import { FX_NAMES, fmt, kindOf, type Deck as D, type FxName } from '../../../types';
import Library from './Library';
import PosPanel from './PosPanel';
import Zona from './Zona';
import { importFiles, importFolder, salvarTrecho } from '../../../catalog';

const SHORT: Record<FxName, string> = { glitch: 'GLI', invert: 'INV', melt: 'MEL', hue: 'HUE', strobe: 'STR' };

export default function Deck({ side, doca }: { side: D; doca?: React.ReactNode }) {
  const s = useSession();
  const liveOp = useLive(l => l.val[('op' + side) as Dest]);
  const liveZoom = useLive(l => l.val[('zoom' + side) as Dest]);
  const [over, setOver] = useState(false);
  // monitor com controles nativos: serve de scrub e vira fonte quando não há saída
  // sem controles nativos: quem comanda é a nossa barra, igual para toda fonte
  const p = usePlayer('yt' + side + 'mon', {
    muted: true,
    quality: (useSession.getState().monQuality || 'small') as YT.SuggestedVideoQuality,
    // sem saída aberta o monitor é a fonte, então o loop também acontece aqui
    onState: state => {
      if (state !== 0) return;
      const st = useSession.getState();
      if (!st.loop || st.outLive) return;
      try { p.current?.seekTo(0, true); p.current?.playVideo(); } catch { /* ignore */ }
    }
  });

  useEffect(() => {
    const t = setInterval(() => {
      if (!p.current) return;
      if (side === 'A') L.monA = p.current; else L.monB = p.current;
      M.setKind(side, 'yt');
      applyAudio();
      clearInterval(t);
    }, 200);
    // arquivo tem o mesmo direito ao loop que o YouTube tem
    const v = document.getElementById('vid' + side + 'mon') as HTMLVideoElement | null;
    const fim = () => {
      const st = useSession.getState();
      if (!st.loop || st.outLive || !v) return;
      v.currentTime = 0; v.play().catch(() => { });
    };
    v?.addEventListener('ended', fim);
    return () => { clearInterval(t); v?.removeEventListener('ended', fim); };
  }, []);

  const mk = s.mark[side];
  const has = mk.in != null || mk.out != null;

  return (
    <div
      className={'col' + (over ? ' drop' : '')}
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); dropInto(side, e); }}
    >
      <div className="hd"><span>Deck <b>{side}</b></span><span className="now">{s.now[side]?.title ?? ''}</span></div>

      {/* as duas fontes convivem no monitor; só uma fica visível por vez */}
      <div className={'mon' + (s.armed === side ? ' armed' : '')} id={'mon' + side}
        style={{ ['--zoom' as any]: (s.zoom[side] / 100).toFixed(3) }}>
        <div className="srcwrap" id={'ytwrap' + side}><div id={'yt' + side + 'mon'} /></div>
        <video className="srcvid" id={'vid' + side + 'mon'} playsInline muted
          style={{ display: 'none' }} ref={el => setVid(side, el)} />
        {/* come o ponteiro: sem hover não há chrome do YouTube nem clique acidental */}
        <div className="capa" />
      </div>

      <Transport canal={side}
        tempo={() => outLive()
          ? { t: tele.decks[side].time, dur: tele.decks[side].dur }
          : { t: M.time(side), dur: M.dur(side) }}
        seek={t => { M.seek(side, t); if (outLive()) out.seek(side, t); }}
        toggle={() => toggle(side)} />

      <div className="card sob">
        <div className="row">
          <button className={'mk' + (s.armed === side ? ' on' : '')}
            onClick={() => s.set('armed', side)}>arm</button>
          <button className="mk" onClick={() => setMark(side, 'in')}>IN</button>
          <button className="mk" onClick={() => setMark(side, 'out')}>OUT</button>
          <button className={'mk' + (s.tloop[side] ? ' on' : '')} onClick={() => toggleTloop(side)}>⟲</button>
          <button className="mk" onClick={() => clearMark(side)}>×</button>
          <span className={'rng' + (has ? ' set' : '')}>
            {has ? `${fmt(mk.in)} → ${fmt(mk.out)}` : '—'}</span>
        </div>
      </div>

      <Zona id={'mix' + side} titulo="mix &amp; framing"
        resumo={[s.op[side] < 100 ? 'opacity ' + s.op[side] : '',
          s.zoom[side] > 100 ? 'zoom' : '',
          (s.pos[side].pan[0] || s.pos[side].pan[1] || s.pos[side].rot) ? 'framed' : ''
        ].filter(Boolean).join(' · ')}>
        <div className="row"><span className="tag w34">opacity</span>
          <input type="range" min={0} max={100}
            className={liveOp != null ? 'modulado' : ''}
            value={Math.round(liveOp ?? s.op[side])}
            onChange={e => applyOpacity(side, +e.target.value)} />
          <span className="val">{Math.round(liveOp ?? s.op[side])}</span></div>

        <div className="row"><span className="tag w34">zoom</span>
          <input type="range" min={100} max={220}
            className={liveZoom != null ? 'modulado' : ''}
            value={Math.round(liveZoom ?? s.zoom[side])}
            onChange={e => applyZoom(side, +e.target.value)} />
          <span className="val">{Math.round(liveZoom ?? s.zoom[side])}</span></div>

        <div className="row"><span className="tag w34">volume</span>
          <input type="range" min={0} max={100} value={s.vol[side]}
            onChange={e => { s.set('vol', { ...s.vol, [side]: +e.target.value } as any); applyAudio(); }} />
          <span className="val">{s.vol[side]}</span></div>

        <div className="row">
          <PosPanel side={side} />
          <span className="grabh" draggable
            onDragStart={e => {
              const it = s.now[side];
              if (!it) { e.preventDefault(); return; }
              e.dataTransfer.setData('text/plain',
                JSON.stringify({ ...it, in: mk.in ?? null, out: mk.out ?? null }));
              e.dataTransfer.effectAllowed = 'copy';
            }}>⇢</span>
        </div>

        {kindOf(s.now[side]) === 'file' && mk.out != null && (
          <div className="row">
            <button className="mk" title="save the marked range as a new file"
              onClick={() => salvarTrecho(s.now[side], mk.in, mk.out)}>✂ export clip</button>
          </div>
        )}
      </Zona>

      <Zona id={'fx' + side} titulo={'effects ' + side}
        resumo={s.fx[side].size ? [...s.fx[side]].map(f => SHORT[f]).join(' ') : ''}>
        <div className={'row fxrow' + (s.bus === side ? ' focus' : '')}>
          {FX_NAMES.map(f => (
            <button key={f} className={'fx' + (s.fx[side].has(f) ? ' on' : '')}
              onClick={() => { s.set('bus', side); toggleFx(side, f); }}>{SHORT[f]}</button>
          ))}
          <input type="range" min={0} max={100} value={Math.round(s.amt[side] * 100)}
            onChange={e => setAmt(side, +e.target.value / 100)} />
        </div>
      </Zona>

      {/* os slots podem morar aqui, se o operador docar nesta coluna */}
      {doca}

      <div className="row libbar">
        <span className="tag">library</span>
        <button className="mk" onClick={() => importFiles(side)}>add files</button>
        <button className="mk" onClick={() => importFolder(side)}>add folder</button>
      </div>
      <Library lane={side} />
    </div>
  );
}
