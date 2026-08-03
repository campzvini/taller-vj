// ────────────────────────────────────────────
// TALLER VJ APP 1.0 — RecPanel.tsx
// § - Record menu: what to capture, where to save, running clock · TSX
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from '../../../store';
import { flashMsg } from '../../../actions';
import { useClickOutside } from '../../../hooks/useClickOutside';
import {
  acharControlador, acharSaida, durMMSS, listarAlvos, rec, startRec, stopRec,
  type Alvo, type Modo, type Pedido
} from '../../../record';

const MODOS: [Modo, string][] = [
  ['out', 'output only'],
  ['ctrl', 'controller only'],
  ['ambos', 'both — two files']
];

export default function RecPanel() {
  const s = useSession();
  const [alvos, setAlvos] = useState<Alvo[]>([]);
  const [padrao, setPadrao] = useState('');
  const [open, setOpen] = useState(false);
  const [, forca] = useState(0);
  const btn = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const fechar = useCallback(() => setOpen(false), []);
  useClickOutside(open, fechar, [box, btn]);

  // o relógio da gravação vive fora do React
  useEffect(() => {
    const t = setInterval(() => forca(x => x + 1), 500);
    window.vj?.recDir?.().then(setPadrao).catch(() => { });
    return () => clearInterval(t);
  }, []);

  const pasta = s.recDir || padrao;

  /** Toda vez que o menu abre, relemos as janelas: elas nascem e morrem o tempo todo. */
  const carregar = useCallback(async (avisar = false) => {
    const l = await listarAlvos();
    setAlvos(l);
    const v = useSession.getState();
    const saida = acharSaida(l), ctrl = acharControlador(l);
    if (saida && !l.some(a => a.id === v.recAlvo)) v.set('recAlvo', saida.id);
    if (ctrl && !l.some(a => a.id === v.recAlvoCtrl)) v.set('recAlvoCtrl', ctrl.id);
    v.save();
    if (avisar) flashMsg(`${l.length} windows · output ${saida ? 'found' : 'not found'}`);
    return l;
  }, []);

  const abrirMenu = () => {
    const abrindo = !open;
    setOpen(abrindo);
    if (abrindo) void carregar();
  };

  const nome = (id: string) => alvos.find(a => a.id === id)?.name || '';

  const pedidos = (): Pedido[] => {
    const p: Pedido[] = [];
    if (s.recModo !== 'ctrl' && s.recAlvo) p.push({ id: s.recAlvo, rotulo: 'output' });
    if (s.recModo !== 'out' && s.recAlvoCtrl) p.push({ id: s.recAlvoCtrl, rotulo: 'controller' });
    return p;
  };

  const alternar = async () => {
    if (rec.ativo) {
      const ps = await stopRec(s.recMp4, s.recDir || undefined);
      flashMsg(ps.length ? `${ps.length} file(s) saved` : 'failed: ' + (rec.erro || 'no data'));
      return;
    }
    let p = pedidos();
    if (!p.length) { await carregar(); p = pedidos(); }
    if (!p.length) {
      flashMsg('window not found — pick one in ▾');
      setOpen(true); void carregar();
      return;
    }
    const ok = await startRec(p, s.recSom, s.recMbps);
    flashMsg(ok ? `recording ${p.length === 2 ? 'both windows' : p[0].rotulo}`
      : 'cannot record: ' + (rec.erro || ''));
  };

  const r = btn.current?.getBoundingClientRect();

  return (
    <>
      <button className={'tgl' + (rec.ativo ? ' rec' : '')} onClick={alternar}
        title="record the selected window with system audio">
        {rec.ativo ? `● ${durMMSS(rec.ms)}${rec.quantos > 1 ? ' ×2' : ''}` : '● REC'}</button>
      <button ref={btn} className="mk" title="recording options" onClick={abrirMenu}>▾</button>

      {open && (
        // fixa na tela: dentro da barra o painel seria recortado pelo overflow
        <div className="recpanel" ref={box} style={{
          left: Math.max(6, Math.min((r?.left ?? 6) - 200, innerWidth - 300)),
          top: (r?.bottom ?? 30) + 4
        }}>
          <div className="row"><b>Recording</b></div>

          <div className="tag">capture</div>
          {MODOS.map(([m, t]) => (
            <label className="opt" key={m}>
              <input type="radio" name="recmodo" checked={s.recModo === m}
                onChange={() => { s.set('recModo', m); s.save(); }} />
              <span>{t}</span>
            </label>
          ))}

          <div className="tag">output window</div>
          <select value={s.recAlvo} onChange={e => { s.set('recAlvo', e.target.value); s.save(); }}>
            <option value="">— not found —</option>
            {alvos.map(a => <option key={a.id} value={a.id}>{a.tipo}: {a.name}</option>)}
          </select>

          <div className="tag">controller window</div>
          <select value={s.recAlvoCtrl} onChange={e => { s.set('recAlvoCtrl', e.target.value); s.save(); }}>
            <option value="">— not found —</option>
            {alvos.map(a => <option key={a.id} value={a.id}>{a.tipo}: {a.name}</option>)}
          </select>
          <div className="row">
            <button className="mk" onClick={() => carregar(true)}>rescan windows</button>
          </div>

          <div className="tag">save to</div>
          <span className="nota caminho" title={pasta}>{pasta || '…'}</span>
          <div className="row">
            <button className="mk" onClick={async () => {
              const d = await window.vj?.pickDir?.(s.recDir || pasta);
              if (d) { s.set('recDir', d); s.save(); }
            }}>choose folder</button>
            <button className="mk" title="may open behind a fullscreen output"
              onClick={() => window.vj?.reveal?.(rec.ultimos[0] || s.recDir || pasta)}>
              open folder</button>
            {!!s.recDir && (
              <button className="mk" onClick={() => { s.set('recDir', ''); s.save(); }}>default</button>
            )}
          </div>

          <div className="tag">format</div>
          <div className="row">
            <button className={'tgl' + (s.recSom ? ' on' : '')}
              onClick={() => { s.set('recSom', !s.recSom); s.save(); }}>system audio</button>
            <button className={'tgl' + (s.recMp4 ? ' on' : '')}
              onClick={() => { s.set('recMp4', !s.recMp4); s.save(); }}>convert to MP4</button>
          </div>
          <div className="row">
            <span className="tag w40">bitrate</span>
            <input type="range" min={4} max={30} value={s.recMbps}
              onChange={e => { s.set('recMbps', +e.target.value); s.save(); }} />
            <span className="val">{s.recMbps} Mb/s</span>
          </div>

          <p className="nota">Captures the window, effects included. WebM now, MP4 after stopping.</p>
          {s.recModo !== 'out' && !!s.recAlvoCtrl && (
            <p className="nota alerta">Recording both doubles GPU load.</p>
          )}
          {!!rec.ultimos.length && (
            <p className="nota">last: {rec.ultimos.map(p => p.split(/[\\/]/).pop()).join(' · ')}</p>
          )}
          {!!nome(s.recAlvo) && <p className="nota">output: {nome(s.recAlvo)}</p>}
        </div>
      )}
    </>
  );
}
