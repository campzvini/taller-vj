// ────────────────────────────────────────────
// TALLER VJ APP 1.5 — Deck.tsx
// § - Deck strip: source module, mix block, library · TSX
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
import { importFiles, importFolder, salvarTrecho } from '../../../catalog';

const SHORT: Record<FxName, string> = { glitch: 'GLI', invert: 'INV', melt: 'MEL', hue: 'HUE', strobe: 'STR' };

/**
 * A tira do deck é sempre a mesma dos dois lados — idêntica, nunca espelhada:
 * a mão aprende POSIÇÃO, e duas posições diferentes para a mesma função custam
 * mais do que a simetria devolve.
 */
export default function Deck({ side }: { side: D }) {
  const s = useSession();
  const liveOp = useLive(l => l.val[('op' + side) as Dest]);
  const liveZoom = useLive(l => l.val[('zoom' + side) as Dest]);
  const [over, setOver] = useState(false);
  const p = usePlayer('yt' + side + 'mon', {
    muted: true,
    quality: (useSession.getState().monQuality || 'small') as YT.SuggestedVideoQuality,
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
  const arquivo = kindOf(s.now[side]) === 'file';

  return (
    <div
      className={'col' + (over ? ' drop' : '')}
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); dropInto(side, e); }}
    >
      <div className="modulo">
        <div className="hd">
          <span>Deck <b>{side}</b></span>
          <span className="now">{s.now[side]?.title ?? ''}</span>
        </div>

        <div className={'mon' + (s.armed === side ? ' armed' : '')} id={'mon' + side}
          style={{ ['--zoom' as never]: (s.zoom[side] / 100).toFixed(3) }}>
          <div className="srcwrap" id={'ytwrap' + side}><div id={'yt' + side + 'mon'} /></div>
          <video className="srcvid" id={'vid' + side + 'mon'} playsInline muted
            style={{ display: 'none' }} ref={el => setVid(side, el)} />
          <div className="capa" />
        </div>

        <Transport canal={side}
          tempo={() => outLive()
            ? { t: tele.decks[side].time, dur: tele.decks[side].dur }
            : { t: M.time(side), dur: M.dur(side) }}
          seek={t => { M.seek(side, t); if (outLive()) out.seek(side, t); }}
          toggle={() => toggle(side)} />

        <div className="row marcas">
          <button className={'mk' + (s.armed === side ? ' on' : '')}
            title="space plays the armed deck (Tab switches)"
            onClick={() => s.set('armed', side)}>arm</button>
          <button className="mk" onClick={() => setMark(side, 'in')}>IN</button>
          <button className="mk" onClick={() => setMark(side, 'out')}>OUT</button>
          <button className={'mk' + (s.tloop[side] ? ' on' : '')}
            title="loop the marked range" onClick={() => toggleTloop(side)}>⟲</button>
          <button className="mk" title="clear range" onClick={() => clearMark(side)}>×</button>
          <span className={'rng' + (has ? ' set' : '')}>
            {has ? `${fmt(mk.in)} → ${fmt(mk.out)}` : '—'}</span>
          <span className="grabh" draggable title="drag this clip anywhere"
            onDragStart={e => {
              const it = s.now[side];
              if (!it) { e.preventDefault(); return; }
              e.dataTransfer.setData('text/plain',
                JSON.stringify({ ...it, in: mk.in ?? null, out: mk.out ?? null }));
              e.dataTransfer.effectAllowed = 'copy';
            }}>⇢</span>
          {arquivo && mk.out != null && (
            <button className="mk" title="save the marked range as a new file"
              onClick={() => salvarTrecho(s.now[side], mk.in, mk.out)}>✂</button>
          )}
        </div>
      </div>

      {/* bloco de controle: sempre visível, porque é o que a mão toca por faixa */}
      <div className="bloco ctrl">
        <div className="row"><span className="tag w40">opacity</span>
          <input type="range" min={0} max={100}
            className={liveOp != null ? 'modulado' : ''}
            value={Math.round(liveOp ?? s.op[side])}
            onChange={e => applyOpacity(side, +e.target.value)} />
          <span className="val">{Math.round(liveOp ?? s.op[side])}</span></div>

        <div className="row"><span className="tag w40">zoom</span>
          <input type="range" min={100} max={220}
            className={liveZoom != null ? 'modulado' : ''}
            value={Math.round(liveZoom ?? s.zoom[side])}
            onChange={e => applyZoom(side, +e.target.value)} />
          <span className="val">{Math.round(liveZoom ?? s.zoom[side])}</span></div>

        <div className="row"><span className="tag w40">volume</span>
          <input type="range" min={0} max={100} value={s.vol[side]}
            onChange={e => { s.set('vol', { ...s.vol, [side]: +e.target.value } as never); applyAudio(); }} />
          <span className="val">{s.vol[side]}</span></div>

        <div className={'row fxrow' + (s.bus === side ? ' focus' : '')}>
          <PosPanel side={side} />
          {FX_NAMES.map(f => (
            <button key={f} className={'fx' + (s.fx[side].has(f) ? ' on' : '')}
              onClick={() => { s.set('bus', side); toggleFx(side, f); }}>{SHORT[f]}</button>
          ))}
          <input type="range" min={0} max={100} value={Math.round(s.amt[side] * 100)}
            title="effect amount" onChange={e => setAmt(side, +e.target.value / 100)} />
        </div>
      </div>

      <div className="libhd">
        <span className="tag">library {side}</span>
        <span className="conta">{s.lib[side].length}</span>
        <div style={{ flex: 1 }} />
        <button className="mk" onClick={() => importFiles(side)}>files</button>
        <button className="mk" onClick={() => importFolder(side)}>folder</button>
      </div>
      <Library lane={side} />
    </div>
  );
}
