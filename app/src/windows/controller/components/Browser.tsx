// ────────────────────────────────────────────
// TALLER VJ APP 1.4 — Browser.tsx
// § - Collapsible column: deep search across YouTube and Archive · TSX
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useState } from 'react';
import { useSession } from '../../../store';
import { cue, flashMsg, play } from '../../../actions';
import { getKey, search, type Dur, type Order } from '../../../search';
import { buscaArchive, COLECOES, ORDENS, type ArchiveOpts } from '../../../archive';
import { curto, fmt, type Item } from '../../../types';

/**
 * A faixa de cima continua sendo a busca rápida. Esta coluna é para garimpar:
 * miniatura grande, duração carimbada, canal, e os filtros que o acervo do
 * Archive exige para deixar de ser ruído.
 */
type Fonte = 'yt' | 'ia';

export default function Browser() {
  const s = useSession();
  const [fonte, setFonte] = useState<Fonte>('yt');
  const [q, setQ] = useState('');
  const [itens, setItens] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [aviso, setAviso] = useState('');

  const [order, setOrder] = useState<Order>('relevance');
  const [dur, setDur] = useState<Dur>('any');
  const [hideV, setHideV] = useState(true);
  const [page, setPage] = useState<string | undefined>();

  const [ia, setIa] = useState<ArchiveOpts>({ colecao: '', ordem: 'downloads desc', soMp4: true });
  const [pagIA, setPagIA] = useState(1);
  const [mais, setMais] = useState(false);

  const buscar = async (more = false) => {
    setBusy(true); setAviso('');
    if (fonte === 'ia') {
      const pag = more ? pagIA + 1 : 1;
      const r = await buscaArchive(q, { ...ia, pagina: pag, linhas: 30 });
      setBusy(false); setPagIA(pag); setMais(!!r.temMais);
      if (r.error) { setAviso(r.error); return; }
      setItens(more ? [...itens, ...r.items] : r.items);
      if (!r.items.length) setAviso('no results');
      return;
    }
    const r = await search(q, {
      order, duration: dur, hideVertical: hideV, maxResults: 30,
      page: more ? page : undefined
    });
    setBusy(false);
    if (r.error) { setAviso(r.error); return; }
    setPage(r.nextPage); setMais(!!r.nextPage);
    setItens(more ? [...itens, ...r.items] : r.items);
    if (r.descartados) setAviso(`${r.descartados} skipped (vertical or not embeddable)`);
  };

  const arrastar = (e: React.DragEvent, it: Item) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ ...it, _from: 'res' }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="col browser">
      <div className="hd">
        <span><b>Browse</b></span>
        <button className="mk" onClick={() => { s.set('browserOpen', false); s.save(); }}>×</button>
      </div>

      <div className="bloco">
        <div className="row">
          <select value={fonte} style={{ maxWidth: 88 }}
            onChange={e => { setFonte(e.target.value as Fonte); setItens([]); setMais(false); }}>
            <option value="yt">YouTube</option>
            <option value="ia">Archive</option>
          </select>
          <input value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1, minWidth: 90 }}
            onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); buscar(); } }}
            placeholder={fonte === 'ia' ? 'search archive.org' : 'search youtube'} />
          <button onClick={() => buscar()} disabled={busy}>{busy ? '…' : 'Search'}</button>
        </div>

        {fonte === 'yt' ? (
          <>
            <div className="row">
              <select value={order} onChange={e => setOrder(e.target.value as Order)}>
                <option value="relevance">relevance</option>
                <option value="date">newest</option>
                <option value="viewCount">most viewed</option>
                <option value="rating">top rated</option>
              </select>
              <select value={dur} onChange={e => setDur(e.target.value as Dur)}>
                <option value="any">any length</option>
                <option value="short">under 4 min</option>
                <option value="medium">4–20 min</option>
                <option value="long">over 20 min</option>
              </select>
              <button className={'tgl' + (hideV ? ' on' : '')}
                onClick={() => setHideV(v => !v)}>no vertical</button>
            </div>
            {!getKey() && <p className="nota alerta">no API key — set it in the top search bar</p>}
          </>
        ) : (
          <>
            <div className="row">
              <select value={ia.colecao} style={{ flex: 1 }}
                onChange={e => setIa({ ...ia, colecao: e.target.value })}>
                {COLECOES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </select>
            </div>
            <div className="row">
              <select value={ia.ordem} style={{ flex: 1 }}
                onChange={e => setIa({ ...ia, ordem: e.target.value })}>
                {ORDENS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </select>
            </div>
            <div className="row">
              <span className="tag">years</span>
              <input value={ia.anoDe || ''} placeholder="from" style={{ width: 52 }}
                onChange={e => setIa({ ...ia, anoDe: e.target.value })} />
              <input value={ia.anoAte || ''} placeholder="to" style={{ width: 52 }}
                onChange={e => setIa({ ...ia, anoAte: e.target.value })} />
              <button className={'tgl' + (ia.soMp4 !== false ? ' on' : '')}
                title="only items that have an MP4 derivative"
                onClick={() => setIa({ ...ia, soMp4: ia.soMp4 === false })}>MP4 only</button>
            </div>
          </>
        )}
        {!!aviso && <p className="nota alerta">{aviso}</p>}
      </div>

      <div className="grade">
        {!itens.length && <div className="empty">search to fill this column</div>}
        {itens.map((it, i) => (
          <div className="cartao" key={it.id + i} draggable onDragStart={e => arrastar(e, it)}>
            <div className="capa2">
              {it.thumb ? <img src={it.thumb} alt="" loading="lazy" /> : <div className="noimg" />}
              {!!it.dur && <span className="dursel">{fmt(it.dur)}</span>}
              {it.kind === 'file' && <span className="fontesel">IA</span>}
            </div>
            <div className="meta">
              <span className="tit" title={it.title}>{it.title}</span>
              <span className="sub">
                {[it.canal, it.ano, it.views ? curto(it.views) + (it.kind === 'file' ? ' dl' : ' views') : '']
                  .filter(Boolean).join(' · ')}
              </span>
            </div>
            <div className="row acoes">
              <button className="mk" onClick={() => cue(it)}>cue</button>
              <button className="mk" onClick={() => play('A', it)}>→ A</button>
              <button className="mk" onClick={() => play('B', it)}>→ B</button>
              <button className="mk" title="add to library A"
                onClick={() => { s.addTo('A', it) && flashMsg('→ A'); }}>+A</button>
              <button className="mk" title="add to library B"
                onClick={() => { s.addTo('B', it) && flashMsg('→ B'); }}>+B</button>
            </div>
          </div>
        ))}
        {mais && <button className="mk maisbtn" onClick={() => buscar(true)}>load more</button>}
      </div>
    </div>
  );
}
