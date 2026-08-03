// ────────────────────────────────────────────
// TALLER VJ APP 0.9 — Scenes.tsx
// § - Saved mixes recalled by click or function key · TSX
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useState } from 'react';
import { useSession } from '../../../store';
import { flashMsg } from '../../../actions';
import { aplicar, capturar } from '../../../scenes';

export default function Scenes() {
  const s = useSession();
  const [edit, setEdit] = useState<string | null>(null);

  const guardar = (i?: number) => {
    const nome = i == null ? `scene ${s.cenas.length + 1}` : s.cenas[i].nome;
    const nova = capturar(nome);
    // regravar mantém o id: quem já apontava para esta cena continua apontando
    if (i == null) s.set('cenas', [...s.cenas, nova]);
    else { const l = [...s.cenas]; l[i] = { ...nova, id: l[i].id }; s.set('cenas', l); }
    s.save();
    flashMsg(i == null ? 'scene saved' : 'scene overwritten');
  };

  return (
    <>
      <div className="row">
        <button className="mk" onClick={() => guardar()}>+ save mix</button>
        <span className="tag">morph</span>
        <input type="range" min={0} max={5000} step={100} value={s.cenaFade} style={{ maxWidth: 70 }}
          onChange={e => { s.set('cenaFade', +e.target.value); s.save(); }} />
        <span className="val">{s.cenaFade ? (s.cenaFade / 1000).toFixed(1) + 's' : 'cut'}</span>
      </div>

      {!s.cenas.length && (
        <p className="nota">Stores mixer state, not clips. F1–F8 recall · Shift+F1–F8 overwrite.</p>
      )}

      <div className="cenas">
        {s.cenas.map((c, i) => (
          <span className="cena" key={c.id}>
            <button className="cenab" onClick={() => aplicar(c, s.cenaFade)} title="recall">
              {i < 8 && <i className="fkey">F{i + 1}</i>}
              {edit === c.id ? '' : c.nome}
            </button>
            {edit === c.id && (
              <input autoFocus defaultValue={c.nome} style={{ width: 84 }}
                onBlur={e => {
                  const l = [...s.cenas]; l[i] = { ...c, nome: e.target.value || c.nome };
                  s.set('cenas', l); s.save(); setEdit(null);
                }}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
            )}
            <button className="mk" title="rename" onClick={() => setEdit(c.id)}>✎</button>
            <button className="mk" title="overwrite" onClick={() => guardar(i)}>⤓</button>
            <button className="mk" title="delete" onClick={() => {
              s.set('cenas', s.cenas.filter(x => x.id !== c.id)); s.save();
            }}>×</button>
          </span>
        ))}
      </div>
    </>
  );
}
