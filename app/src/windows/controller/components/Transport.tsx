// ────────────────────────────────────────────
// TALLER VJ APP 1.3 — Transport.tsx
// § - One timeline and play button for every source · TSX
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react';
import { M, type Canal } from '../../../players';
import { fmt } from '../../../types';

/**
 * A barra não sabe se está falando com um iframe, com um arquivo ou com o Archive:
 * pergunta ao transporte. É o que permite ao cue, ao bed e aos decks terem o mesmo
 * gesto — e o que tornou dispensável a barra nativa do YouTube.
 */
type Props = {
  canal: Canal;
  tempo?: () => { t: number; dur: number };   // quando a fonte da verdade é a saída
  seek?: (t: number) => void;                 // idem: seek precisa alcançar as duas
  toggle?: () => void;
  compacto?: boolean;
};

export default function Transport(props: Props) {
  const { canal, compacto } = props;
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [tocando, setTocando] = useState(false);
  const arrastando = useRef(false);
  // as funções mudam a cada render do pai; guardá-las evita recriar o intervalo
  const p = useRef(props); p.current = props;

  useEffect(() => {
    const id = setInterval(() => {
      setTocando(M.state(canal) === 1);
      if (arrastando.current) return;
      const v = p.current.tempo ? p.current.tempo() : { t: M.time(canal), dur: M.dur(canal) };
      setT(v.t || 0); setDur(v.dur || 0);
    }, 250);
    return () => clearInterval(id);
  }, [canal]);

  const irPara = (v: number) => { p.current.seek ? p.current.seek!(v) : M.seek(canal, v); };

  return (
    <div className={'transport' + (compacto ? ' mini' : '')}>
      <button className="tplay" onClick={() => (p.current.toggle ?? (() => M.toggle(canal)))()}
        title={tocando ? 'pause' : 'play'}>{tocando ? '❚❚' : '▶'}</button>
      <input type="range" className="tline" min={0} max={Math.max(1, Math.floor(dur))}
        value={Math.min(Math.floor(t), Math.max(1, Math.floor(dur)))}
        onMouseDown={() => { arrastando.current = true; }}
        onChange={e => setT(+e.target.value)}
        onMouseUp={e => { arrastando.current = false; irPara(+(e.target as HTMLInputElement).value); }} />
      <span className="ttime">{fmt(t)}{dur ? ' / ' + fmt(dur) : ''}</span>
    </div>
  );
}
