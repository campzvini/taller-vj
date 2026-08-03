// ────────────────────────────────────────────
// TALLER VJ APP 1.6 — TextPanel.tsx
// § - Text over the projection: title cards, names, messages · TSX
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useSession } from '../../../store';
import { out } from '../../../out';

const MODOS: [string, string][] = [['fixo', 'static'], ['marquee', 'scroll'], ['pisca', 'blink']];
const CORES = ['#ffffff', '#ff3b3b', '#3bd17a', '#3b8cff', '#e8c33b', '#ff59d6', '#000000'];

/** Texto é a camada mais barata que existe e a que mais aparece: nome da festa,
 *  do artista, um aviso. Fica acima da imagem e abaixo do blackout. */
export default function TextPanel() {
  const s = useSession();

  const manda = (patch: Partial<ReturnType<typeof estado>> = {}) => {
    const e = { ...estado(), ...patch };
    out.texto(e);
  };
  const estado = () => ({
    txt: s.txt, on: s.txtOn, size: s.txtSize, cor: s.txtCor,
    x: s.txtX, y: s.txtY, modo: s.txtModo, contorno: s.txtContorno
  });
  const põe = <K extends keyof typeof camposMapa>(k: K, v: never) => {
    s.set(camposMapa[k], v); s.save();
    manda({ [k]: v } as never);
  };
  const camposMapa = {
    txt: 'txt', on: 'txtOn', size: 'txtSize', cor: 'txtCor',
    x: 'txtX', y: 'txtY', modo: 'txtModo', contorno: 'txtContorno'
  } as const;

  return (
    <>
      <div className="row">
        <input value={s.txt} placeholder="text on the projection" style={{ flex: 1, minWidth: 90 }}
          onChange={e => põe('txt', e.target.value as never)} />
        <button className={'tgl' + (s.txtOn ? ' on' : '')}
          onClick={() => põe('on', !s.txtOn as never)}>{s.txtOn ? 'on air' : 'show'}</button>
      </div>

      <div className="row">
        <span className="tag w40">size</span>
        <input type="range" min={2} max={30} value={s.txtSize}
          onChange={e => põe('size', +e.target.value as never)} />
        <span className="val">{s.txtSize}</span>
        <select value={s.txtModo} style={{ maxWidth: 84 }}
          onChange={e => põe('modo', e.target.value as never)}>
          {MODOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
        </select>
      </div>

      <div className="row">
        <span className="tag w40">place</span>
        <input type="range" min={0} max={100} value={s.txtX} title="horizontal"
          onChange={e => põe('x', +e.target.value as never)} />
        <input type="range" min={0} max={100} value={s.txtY} title="vertical"
          onChange={e => põe('y', +e.target.value as never)} />
      </div>

      <div className="row">
        <span className="tag w40">colour</span>
        {CORES.map(c => (
          <button key={c} className={'cor' + (s.txtCor === c ? ' on' : '')}
            style={{ background: c }} title={c}
            onClick={() => põe('cor', c as never)} />
        ))}
        <button className={'mk' + (s.txtContorno ? ' on' : '')}
          title="dark outline so it reads over any image"
          onClick={() => põe('contorno', !s.txtContorno as never)}>outline</button>
      </div>
    </>
  );
}
