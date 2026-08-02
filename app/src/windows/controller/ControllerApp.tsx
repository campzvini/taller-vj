// ────────────────────────────────────────────
// TALLER VJ APP 0.2 — ControllerApp.tsx
// § - Controller window: temporary driver while the port advances · TSX
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react';
import { makeBus, type Cmd, type Deck, type Tele } from '../../bus';
import './controller.css';

const FX = ['glitch', 'invert', 'melt', 'hue', 'strobe'];

export default function ControllerApp() {
  const bus = useRef(makeBus());
  const [tele, setTele] = useState<Tele | null>(null);
  const [vid, setVid] = useState('jNQXAC9IVRw');
  const [xf, setXf] = useState(0);
  const [op, setOp] = useState<Record<Deck, number>>({ A: 100, B: 100 });
  const [fx, setFx] = useState<Record<string, Set<string>>>({ A: new Set(), B: new Set(), M: new Set() });

  const send = (c: Cmd) => bus.current.send(c);

  useEffect(() => {
    const b = bus.current;
    return b.on(m => {
      if ('t' in m && m.t === 'tele') setTele(m);
      if ('t' in m && m.t === 'up') send({ c: 'frame', ar: '16/9' });   // saída renasceu: reenvia estado
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = (d: Deck) => {
    send({ c: 'load', deck: d, id: vid.trim() });
    send({ c: 'present', deck: d, v: true });
  };
  const toggleFx = (b: 'A' | 'B' | 'M', name: string) => {
    const next = new Set(fx[b]);
    next.has(name) ? next.delete(name) : next.add(name);
    setFx({ ...fx, [b]: next });
    send({ c: 'bus', bus: b, fx: [...next], amt: 1 });
  };

  return (
    <div className="wrap">
      <h1>TALLER VJ — controlador (port em andamento)</h1>

      <section className="card">
        <div className="row">
          <input value={vid} onChange={e => setVid(e.target.value)} style={{ flex: 1 }} />
          <button onClick={() => load('A')}>carregar em A</button>
          <button onClick={() => load('B')}>carregar em B</button>
          <button onClick={() => window.vj?.openOutput()}>abrir saída</button>
        </div>

        <div className="row">
          <b>A</b>
          <input type="range" min={0} max={100} value={xf}
            onChange={e => { const v = +e.target.value; setXf(v); send({ c: 'xf', v }); }} />
          <b>B</b><span className="val">{xf}</span>
        </div>

        {(['A', 'B'] as Deck[]).map(d => (
          <div className="row" key={d}>
            <span className="tag">opac {d}</span>
            <input type="range" min={0} max={100} value={op[d]}
              onChange={e => { const v = +e.target.value; setOp({ ...op, [d]: v }); send({ c: 'opacity', deck: d, v: v / 100 }); }} />
            <span className="val">{op[d]}</span>
            <button onClick={() => send({ c: 'toggle', deck: d })}>▶❚❚</button>
          </div>
        ))}

        {(['A', 'B', 'M'] as const).map(b => (
          <div className="row" key={b}>
            <span className="tag">fx {b}</span>
            {FX.map(f => (
              <button key={f} className={fx[b].has(f) ? 'on' : ''} onClick={() => toggleFx(b, f)}>{f}</button>
            ))}
          </div>
        ))}
      </section>

      <section className="card">
        <span className="tag">telemetria da saída</span>
        <pre>{tele
          ? `A  ${tele.decks.A.time.toFixed(1)}s / ${tele.decks.A.dur.toFixed(0)}s  estado ${tele.decks.A.state}\n` +
            `B  ${tele.decks.B.time.toFixed(1)}s / ${tele.decks.B.dur.toFixed(0)}s  estado ${tele.decks.B.state}\n` +
            `samples ${tele.samp.map(t => t.toFixed(1)).join('  ')}`
          : 'sem sinal da saída'}</pre>
      </section>
    </div>
  );
}
