// ────────────────────────────────────────────
// TALLER VJ APP 0.3 — Library.tsx
// § - Per-lane list with drag between lanes · TSX
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useSession } from '../../../store';
import { cue, play } from '../../../actions';
import type { Lane } from '../../../types';

export default function Library({ lane, className = 'lib' }: { lane: Lane; className?: string }) {
  const items = useSession(s => s.lib[lane]);
  const now = useSession(s => s.now[lane]);
  const removeFrom = useSession(s => s.removeFrom);

  if (!items.length) return <div className={className}><div className="empty">arraste vídeos aqui</div></div>;

  return (
    <div className={className}>
      {items.map(it => (
        <div
          key={it.id}
          className={'item' + (now?.id === it.id ? ' playing' : '')}
          draggable
          onDragStart={e => {
            e.dataTransfer.setData('text/plain', JSON.stringify({ ...it, _from: lane }));
            e.dataTransfer.effectAllowed = 'copyMove';
          }}
          // clique manda pro cue (nunca direto ao ar); duplo clique toca no deck
          onClick={() => (lane === 'C' ? play('C', it) : cue(it))}
          onDoubleClick={() => play(lane, it)}
        >
          <img src={it.thumb} alt="" />
          <span>{it.title}</span>
          <div className="x" onClick={e => { e.stopPropagation(); removeFrom(lane, it.id); }}>×</div>
        </div>
      ))}
    </div>
  );
}
