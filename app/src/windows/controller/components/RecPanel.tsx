// ────────────────────────────────────────────
// TALLER VJ APP 0.9 — RecPanel.tsx
// § - Record button with target picker and running clock · TSX
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from '../../../store';
import { flashMsg } from '../../../actions';
import { useClickOutside } from '../../../hooks/useClickOutside';
import { acharSaida, durMMSS, listarAlvos, rec, startRec, stopRec, type Alvo } from '../../../record';

export default function RecPanel() {
  const s = useSession();
  const [alvos, setAlvos] = useState<Alvo[]>([]);
  const [open, setOpen] = useState(false);
  const [, forca] = useState(0);
  const btn = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const fechar = useCallback(() => setOpen(false), []);
  useClickOutside(open, fechar, [box, btn]);

  // o relógio da gravação vive fora do React
  useEffect(() => {
    const t = setInterval(() => forca(x => x + 1), 500);
    return () => clearInterval(t);
  }, []);

  const carregar = async () => {
    const l = await listarAlvos();
    setAlvos(l);
    if (!s.recAlvo) {
      const saida = acharSaida(l);
      if (saida) { s.set('recAlvo', saida.id); s.save(); }
    }
  };

  const alternar = async () => {
    if (rec.ativo) {
      const p = await stopRec(s.recMp4);
      flashMsg(p ? 'gravação salva' : 'falhou: ' + (rec.erro || 'sem arquivo'));
      return;
    }
    let alvo = s.recAlvo;
    if (!alvo) {
      const l = await listarAlvos(); setAlvos(l);
      alvo = acharSaida(l)?.id || '';
      if (alvo) { s.set('recAlvo', alvo); s.save(); }
    }
    if (!alvo) { flashMsg('escolha o que gravar'); setOpen(true); await carregar(); return; }
    const ok = await startRec(alvo, s.recSom, s.recMbps);
    flashMsg(ok ? 'gravando' : 'não deu para gravar: ' + (rec.erro || ''));
  };

  return (
    <span className="poswrap">
      <button className={'tgl' + (rec.ativo ? ' rec' : '')} onClick={alternar}
        title="grava a janela escolhida, com o som do sistema">
        {rec.ativo ? `● ${durMMSS(rec.ms)}` : '● gravar'}</button>
      <button ref={btn} className="mk" title="o que gravar e como"
        onClick={() => { setOpen(o => !o); if (!open) carregar(); }}>▾</button>

      {open && (
        <div className="pospanel recpanel" ref={box}>
          <div className="tag">o que gravar</div>
          <select value={s.recAlvo} onChange={e => { s.set('recAlvo', e.target.value); s.save(); }}>
            <option value="">— escolha —</option>
            {alvos.map(a => <option key={a.id} value={a.id}>{a.tipo}: {a.name}</option>)}
          </select>
          <div className="row">
            <button className="mk" onClick={carregar}>atualizar lista</button>
            <button className="mk" onClick={async () => {
              const l = await listarAlvos(); setAlvos(l);
              const sa = acharSaida(l);
              if (sa) { s.set('recAlvo', sa.id); s.save(); flashMsg('alvo: ' + sa.name); }
              else flashMsg('saída não encontrada — abra a janela de saída');
            }}>achar a saída</button>
          </div>
          <div className="row">
            <button className={'tgl' + (s.recSom ? ' on' : '')}
              onClick={() => { s.set('recSom', !s.recSom); s.save(); }}>som do sistema</button>
            <button className={'tgl' + (s.recMp4 ? ' on' : '')}
              onClick={() => { s.set('recMp4', !s.recMp4); s.save(); }}>converter p/ MP4</button>
          </div>
          <div className="row">
            <span className="tag w40">taxa</span>
            <input type="range" min={4} max={30} value={s.recMbps}
              onChange={e => { s.set('recMbps', +e.target.value); s.save(); }} />
            <span className="val">{s.recMbps} Mb/s</span>
          </div>
          <p className="nota">
            Grava a <b>janela</b>, não a composição — é assim que o YouTube entra no
            arquivo, já com os efeitos. Sai em WebM na pasta Vídeos/taller-vj; a
            conversão para MP4 acontece depois de parar e demora.
          </p>
          {rec.ultimo && (
            <div className="row">
              <button className="mk" onClick={() => window.vj?.reveal?.(rec.ultimo!)}>abrir pasta</button>
              <span className="nota">{rec.ultimo.split(/[\\/]/).pop()}</span>
            </div>
          )}
        </div>
      )}
    </span>
  );
}
