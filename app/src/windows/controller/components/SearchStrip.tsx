// ────────────────────────────────────────────
// TALLER VJ APP 0.3 — SearchStrip.tsx
// § - Collapsible search strip and results · TSX
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useState } from 'react';
import { useSession } from '../../../store';
import { cue, flashMsg } from '../../../actions';
import { getKey, search, setKey } from '../../../search';

export default function SearchStrip() {
  const s = useSession();
  const [q, setQ] = useState('');
  const [key, setK] = useState(getKey());
  const [reveal, setReveal] = useState(false);

  const run = async () => {
    const r = await search(q);
    if (r.error) { flashMsg(r.error); return; }
    if (!r.items.length) return;
    if (r.direct) {
      s.set('results', [...r.items, ...s.results]);
      s.set('sel', 0);
      if (!r.items[0].plist) cue(r.items[0]);
    } else {
      s.set('results', r.items); s.set('sel', null);
    }
  };

  return (
    <div id="searchwrap" className={s.searchOpen ? '' : 'closed'}>
      <div id="sbar">
        <input id="q" value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); run(); } }}
          placeholder="buscar no youtube  ·  ou colar URL/ID e Enter" />
        <button onClick={run}>Buscar</button>
        <input type={reveal ? 'text' : 'password'} autoComplete="off" placeholder="API key"
          style={{ width: 150 }} value={key} onChange={e => setK(e.target.value)} />
        <button title="mostrar/ocultar" onClick={() => {
          setReveal(r => !r);
          if (!reveal) setTimeout(() => setReveal(false), 6000);   // reesconde sozinha
        }}>👁</button>
        <button onClick={() => { setKey(key); setReveal(false); flashMsg('key salva'); }}>salvar</button>
        <span className="tag">{getKey() ? 'salva ✓ …' + getKey().slice(-4) : 'sem chave'}</span>
      </div>

      <div id="results">
        {!s.results.length
          ? <div className="empty">busque algo, ou cole uma URL do YouTube e dê Enter — clique para abrir no Cue, arraste para as colunas</div>
          : s.results.map((r, i) => (
            <div key={r.id + i} className={'res' + (s.sel === i ? ' sel' : '')} draggable
              onClick={() => { s.set('sel', i); cue(r); }}
              onDragStart={e => {
                s.set('sel', i);
                e.dataTransfer.setData('text/plain', JSON.stringify({ ...r, _from: 'res' }));
                e.dataTransfer.effectAllowed = 'copy';
              }}>
              <img src={r.thumb} alt="" />
              <span>{r.title}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
