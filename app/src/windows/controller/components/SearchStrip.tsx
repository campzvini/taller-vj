// ────────────────────────────────────────────
// TALLER VJ APP 0.5 — SearchStrip.tsx
// § - Collapsible search: filters, ordering, paging · TSX
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useState } from 'react';
import { useSession } from '../../../store';
import { cue, flashMsg } from '../../../actions';
import { getKey, search, setKey, type Dur, type Order } from '../../../search';

export default function SearchStrip() {
  const s = useSession();
  const [q, setQ] = useState('');
  const [key, setK] = useState(getKey());
  const [reveal, setReveal] = useState(false);
  const [order, setOrder] = useState<Order>('relevance');
  const [dur, setDur] = useState<Dur>('any');
  const [hideV, setHideV] = useState(true);
  const [page, setPage] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const run = async (more = false) => {
    setBusy(true);
    const r = await search(q, { order, duration: dur, hideVertical: hideV, page: more ? page : undefined });
    setBusy(false);
    if (r.error) { flashMsg(r.error); return; }
    setPage(r.nextPage);
    if (r.direct) {
      s.set('results', [...r.items, ...s.results]);
      s.set('sel', 0);
      if (!r.items[0].plist) cue(r.items[0]);
      return;
    }
    s.set('results', more ? [...s.results, ...r.items] : r.items);
    if (!more) s.set('sel', null);
    if (r.descartados) flashMsg(`${r.descartados} descartados (vertical ou sem embed)`);
  };

  return (
    <div id="searchwrap" className={s.searchOpen ? '' : 'closed'}>
      <div id="sbar">
        <input id="q" value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); run(); } }}
          placeholder="buscar no youtube  ·  ou colar URL/ID e Enter" />
        <button onClick={() => run()} disabled={busy}>{busy ? '…' : 'Buscar'}</button>

        <select value={order} onChange={e => setOrder(e.target.value as Order)} title="ordenar">
          <option value="relevance">relevância</option>
          <option value="date">recentes</option>
          <option value="viewCount">mais vistos</option>
          <option value="rating">melhor avaliados</option>
        </select>
        <select value={dur} onChange={e => setDur(e.target.value as Dur)} title="duração">
          <option value="any">qualquer</option>
          <option value="short">até 4 min</option>
          <option value="medium">4–20 min</option>
          <option value="long">+20 min</option>
        </select>
        {/* shorts se reconhecem pela vertical, não pela duração: trecho curto é bom material */}
        <button className={'tgl' + (hideV ? ' on' : '')} onClick={() => setHideV(v => !v)}
          title="ocultar vídeos verticais (shorts)">sem vertical</button>

        <input type={reveal ? 'text' : 'password'} autoComplete="off" placeholder="API key"
          style={{ width: 120 }} value={key} onChange={e => setK(e.target.value)} />
        <button title="mostrar/ocultar" onClick={() => {
          setReveal(r => !r);
          if (!reveal) setTimeout(() => setReveal(false), 6000);
        }}>👁</button>
        <button onClick={() => { setKey(key); setReveal(false); flashMsg('key salva'); }}>salvar</button>
        <span className="tag">{getKey() ? '…' + getKey().slice(-4) : 'sem chave'}</span>
      </div>

      <div id="results">
        {!s.results.length
          ? <div className="empty">busque algo, ou cole uma URL do YouTube e dê Enter — clique para abrir no Cue, arraste para as colunas</div>
          : <>
            {s.results.map((r, i) => (
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
            {page && <div className="res more" onClick={() => run(true)}>
              <span className="moretxt">+ carregar<br />mais</span>
            </div>}
          </>}
      </div>
    </div>
  );
}
