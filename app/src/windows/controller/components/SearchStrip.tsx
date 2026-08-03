// ────────────────────────────────────────────
// TALLER VJ APP 1.2 — SearchStrip.tsx
// § - Search across YouTube and Internet Archive · TSX
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useState } from 'react';
import { useSession } from '../../../store';
import { cue, flashMsg } from '../../../actions';
import { getKey, search, setKey, type Dur, type Order } from '../../../search';
import { buscaArchive } from '../../../archive';

type Fonte = 'yt' | 'ia';

export default function SearchStrip() {
  const s = useSession();
  const [fonte, setFonte] = useState<Fonte>('yt');
  const [q, setQ] = useState('');
  const [key, setK] = useState(getKey());
  const [reveal, setReveal] = useState(false);
  const [order, setOrder] = useState<Order>('relevance');
  const [dur, setDur] = useState<Dur>('any');
  const [hideV, setHideV] = useState(true);
  const [page, setPage] = useState<string | undefined>();
  const [pagIA, setPagIA] = useState(1);
  const [busy, setBusy] = useState(false);

  const run = async (more = false) => {
    setBusy(true);
    if (fonte === 'ia') {
      const pag = more ? pagIA + 1 : 1;
      const r = await buscaArchive(q, pag);
      setBusy(false);
      if (r.error) { flashMsg(r.error); return; }
      setPagIA(pag);
      setPage(r.temMais ? String(pag + 1) : undefined);
      s.set('results', more ? [...s.results, ...r.items] : r.items);
      if (!more) s.set('sel', null);
      if (!r.items.length) flashMsg('no results');
      return;
    }
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
    if (r.descartados) flashMsg(`${r.descartados} skipped (vertical or not embeddable)`);
  };

  const ia = fonte === 'ia';

  return (
    <div id="searchwrap" className={s.searchOpen ? '' : 'closed'}>
      <div id="sbar">
        <select value={fonte} style={{ maxWidth: 92 }}
          onChange={e => { setFonte(e.target.value as Fonte); setPage(undefined); }}>
          <option value="yt">YouTube</option>
          <option value="ia">Archive</option>
        </select>
        <input id="q" value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); run(); } }}
          placeholder={ia ? 'search archive.org' : 'search youtube, or paste URL / ID'} />
        <button onClick={() => run()} disabled={busy}>{busy ? '…' : 'Search'}</button>

        {!ia && (
          <>
            <select value={order} onChange={e => setOrder(e.target.value as Order)} title="sort">
              <option value="relevance">relevance</option>
              <option value="date">newest</option>
              <option value="viewCount">most viewed</option>
              <option value="rating">top rated</option>
            </select>
            <select value={dur} onChange={e => setDur(e.target.value as Dur)} title="length">
              <option value="any">any length</option>
              <option value="short">under 4 min</option>
              <option value="medium">4–20 min</option>
              <option value="long">over 20 min</option>
            </select>
            <button className={'tgl' + (hideV ? ' on' : '')} onClick={() => setHideV(v => !v)}
              title="hide vertical videos">no vertical</button>

            <input type={reveal ? 'text' : 'password'} autoComplete="off" placeholder="API key"
              style={{ width: 120 }} value={key} onChange={e => setK(e.target.value)} />
            <button title="show" onClick={() => {
              setReveal(r => !r);
              if (!reveal) setTimeout(() => setReveal(false), 6000);
            }}>👁</button>
            <button onClick={() => { setKey(key); setReveal(false); flashMsg('key saved'); }}>save</button>
            <span className="tag">{getKey() ? '…' + getKey().slice(-4) : 'no key'}</span>
          </>
        )}
        {ia && <span className="tag">public domain · no key needed</span>}
      </div>

      <div id="results">
        {!s.results.length
          ? <div className="empty">click a result to cue · drag to a column</div>
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
              <span className="moretxt">more</span>
            </div>}
          </>}
      </div>
    </div>
  );
}
