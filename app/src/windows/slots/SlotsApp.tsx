// ────────────────────────────────────────────
// TALLER VJ APP 1.4 — SlotsApp.tsx
// § - Slots window: a remote for the pool, holds no state · TSX
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { makeBus, type Msg, type SlotInfo } from '../../bus';
import './slots.css';

const ORDEM = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

export default function SlotsApp() {
  const [itens, setItens] = useState<SlotInfo[]>([]);
  const [live, setLive] = useState(false);
  const [bus] = useState(() => makeBus());

  useEffect(() => {
    const off = bus.on((m: Msg) => {
      if ('t' in m && m.t === 'slots') { setItens(m.itens); setLive(m.live); }
    });
    bus.send({ t: 'slotAsk' } as never);
    const id = setInterval(() => { if (!itens.length) bus.send({ t: 'slotAsk' } as never); }, 1500);

    // esta janela também dispara por tecla: quem estiver com o foco comanda
    const down = (e: KeyboardEvent) => {
      if (!/^[0-9]$/.test(e.key) || e.repeat) return;
      e.preventDefault(); bus.send({ t: 'slotKey', n: +e.key, down: true } as never);
    };
    const up = (e: KeyboardEvent) => {
      if (!/^[0-9]$/.test(e.key)) return;
      bus.send({ t: 'slotKey', n: +e.key, down: false } as never);
    };
    const solta = () => ORDEM.forEach(n => bus.send({ t: 'slotKey', n, down: false } as never));
    addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', solta);
    return () => {
      off(); clearInterval(id);
      removeEventListener('keydown', down); removeEventListener('keyup', up);
      removeEventListener('blur', solta);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const apertar = (n: number, down: boolean) => bus.send({ t: 'slotKey', n, down } as never);
  const s = (n: number) => itens.find(i => i.n === n);

  return (
    <div id="sroot">
      <div className="sbar">
        <span className="name">SLOTS</span>
        <span className={'lampada' + (live ? ' on' : '')} />
        <span className="tag">{live ? 'output live' : 'no output — samples idle'}</span>
      </div>
      <div className="sgrid">
        {ORDEM.map(n => {
          const it = s(n);
          return (
            <div key={n}
              className={'sslot' + (it?.armado ? ' armed' : '') + (it?.aceso ? ' hot' : '')}
              onMouseDown={() => apertar(n, true)}
              onMouseUp={() => apertar(n, false)}
              onMouseLeave={() => it?.aceso && apertar(n, false)}>
              {it?.thumb && <img src={it.thumb} alt="" />}
              <span className="num">{n}</span>
              {!!it?.trecho && <span className="tr">{it.trecho}</span>}
              {!!it?.titulo && <span className="tit">{it.titulo}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
