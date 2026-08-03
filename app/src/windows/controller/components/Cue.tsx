// ────────────────────────────────────────────
// TALLER VJ APP 1.5 — Cue.tsx
// § - Preview module: image, transport, trim and destinations · TSX
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { useSession } from '../../../store';
import { usePlayer } from '../../../hooks/usePlayer';
import { L, M, setVid } from '../../../players';
import { clearMark, cue, sendCue, setMark } from '../../../actions';
import { fmt, kindOf, type Item } from '../../../types';
import { baixar } from '../../../catalog';
import { useState as useEstado } from 'react';
import Transport from './Transport';

export default function Cue() {
  const s = useSession();
  const [over, setOver] = useState(false);
  const p = usePlayer('ytPrev');

  useEffect(() => {
    const t = setInterval(() => { if (p.current) { L.cue = p.current; clearInterval(t); } }, 200);
    return () => clearInterval(t);
  }, []);

  const mk = s.mark.P;
  const has = mk.in != null || mk.out != null;
  const addTo = (lane: 'V' | 'C') => { if (s.now.P) s.addTo(lane, s.now.P); };
  const [baixando, setBaixando] = useEstado(false);
  // só faz sentido para fonte remota: YouTube não entrega os bytes, local já está aqui
  const src = s.now.P?.src || '';
  const remoto = kindOf(s.now.P) === 'file' && (src.startsWith('archive:') || /^https?:/i.test(src));

  return (
    <>
      {/* imagem, transporte e marcas são UM gesto: uma caixa só */}
      <div className="modulo cuemod">
        <div className="hd">
          <span>Cue</span>
          <span className="now">{s.now.P?.title ?? ''}</span>
        </div>

        <div id="cue" className={over ? 'over' : ''}
          onDragOver={e => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={e => {
            e.preventDefault(); e.stopPropagation(); setOver(false);
            try { cue(JSON.parse(e.dataTransfer.getData('text/plain')) as Item); } catch { /* ignore */ }
          }}>
          <div className="srcwrap" id="ytwrapP"><div id="ytPrev" /></div>
          <video className="srcvid" id="vidPrev" playsInline
            style={{ display: 'none' }} ref={el => setVid('P', el)} />
          <div className="capa" />
        </div>

        <Transport canal="P" />

        <div className="row marcas">
          <button className="mk" onClick={() => setMark('P', 'in')}>IN</button>
          <button className="mk" onClick={() => setMark('P', 'out')}>OUT</button>
          <button className="mk" onClick={() => clearMark('P')} title="clear range">×</button>
          <span className={'rng' + (has ? ' set' : '')}>{has ? `${fmt(mk.in)} → ${fmt(mk.out)}` : '—'}</span>
          <span className="grabh" draggable title="drag this clip anywhere"
            onDragStart={e => {
              if (!s.now.P) { e.preventDefault(); return; }
              e.dataTransfer.setData('text/plain',
                JSON.stringify({ ...s.now.P, in: mk.in ?? null, out: mk.out ?? null }));
              e.dataTransfer.effectAllowed = 'copy';
            }}>⇢</span>
          <span className="tag">phones</span>
          <input type="range" min={0} max={100} value={s.vol.P} style={{ maxWidth: 64 }}
            onChange={e => {
              const v = +e.target.value;
              s.set('vol', { ...s.vol, P: v });
              M.vol('P', v);
            }} />
        </div>

        {/* destino do que acabou de ser marcado: colado no módulo, não numa aba */}
        <div className="row envio">
          <button className="env" onClick={() => sendCue('A')}>◄ A</button>
          <button className="env" onClick={() => sendCue('B')}>B ►</button>
          <span className="fsep" />
          <button className="mk" onClick={() => addTo('V')}>+ library</button>
          {remoto && (
            <button className="mk" title="bring this file to the local library"
              disabled={baixando}
              onClick={async () => {
                setBaixando(true);
                const p = await baixar(s.now.P);
                setBaixando(false);
                if (p) cue({ ...s.now.P!, kind: 'file', src: p });
              }}>{baixando ? '⤓ …' : '⤓ download'}</button>
          )}
          <button className="mk" onClick={() => addTo('C')}>+ bed</button>
          <span className="fsep" />
          <button className={'tgl' + (s.mirror ? ' on' : '')}
            onClick={() => s.set('mirror', !s.mirror)}>mirror</button>
        </div>
      </div>
    </>
  );
}
