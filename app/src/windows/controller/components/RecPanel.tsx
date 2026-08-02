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
  ['out', 'só a saída'],
  ['ctrl', 'só o controlador'],
  ['ambos', 'os dois (dois arquivos)']
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
    if (avisar) flashMsg(`${l.length} janelas · saída ${saida ? 'ok' : 'não achada'}`);
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
    if (s.recModo !== 'ctrl' && s.recAlvo) p.push({ id: s.recAlvo, rotulo: 'saida' });
    if (s.recModo !== 'out' && s.recAlvoCtrl) p.push({ id: s.recAlvoCtrl, rotulo: 'controlador' });
    return p;
  };

  const alternar = async () => {
    if (rec.ativo) {
      const ps = await stopRec(s.recMp4, s.recDir || undefined);
      flashMsg(ps.length
        ? `${ps.length} arquivo(s) salvo(s)`
        : 'falhou: ' + (rec.erro || 'sem arquivo'));
      return;
    }
    let p = pedidos();
    if (!p.length) { await carregar(); p = pedidos(); }
    if (!p.length) {
      flashMsg('não achei a janela — escolha no menu ▾');
      setOpen(true); void carregar();
      return;
    }
    const ok = await startRec(p, s.recSom, s.recMbps);
    flashMsg(ok ? `gravando ${p.length === 2 ? 'as duas janelas' : p[0].rotulo}`
      : 'não deu para gravar: ' + (rec.erro || ''));
  };

  const r = btn.current?.getBoundingClientRect();

  return (
    <>
      <button className={'tgl' + (rec.ativo ? ' rec' : '')} onClick={alternar}
        title="grava a janela escolhida, com o som do sistema">
        {rec.ativo ? `● ${durMMSS(rec.ms)}${rec.quantos > 1 ? ' ×2' : ''}` : '● gravar'}</button>
      <button ref={btn} className="mk" title="opções de gravação" onClick={abrirMenu}>▾</button>

      {open && (
        // fixa na tela: dentro da barra o painel seria recortado pelo overflow
        <div className="recpanel" ref={box} style={{
          left: Math.max(6, Math.min((r?.left ?? 6) - 200, innerWidth - 300)),
          top: (r?.bottom ?? 30) + 4
        }}>
          <div className="row"><b>Gravação</b></div>

          <div className="tag">o que capturar</div>
          {MODOS.map(([m, t]) => (
            <label className="opt" key={m}>
              <input type="radio" name="recmodo" checked={s.recModo === m}
                onChange={() => { s.set('recModo', m); s.save(); }} />
              <span>{t}</span>
            </label>
          ))}

          <div className="tag">janela da saída</div>
          <select value={s.recAlvo} onChange={e => { s.set('recAlvo', e.target.value); s.save(); }}>
            <option value="">— não achada —</option>
            {alvos.map(a => <option key={a.id} value={a.id}>{a.tipo}: {a.name}</option>)}
          </select>

          <div className="tag">janela do controlador</div>
          <select value={s.recAlvoCtrl} onChange={e => { s.set('recAlvoCtrl', e.target.value); s.save(); }}>
            <option value="">— não achada —</option>
            {alvos.map(a => <option key={a.id} value={a.id}>{a.tipo}: {a.name}</option>)}
          </select>
          <div className="row">
            <button className="mk" onClick={() => carregar(true)}>reprocurar janelas</button>
          </div>

          <div className="tag">onde salvar</div>
          <span className="nota caminho" title={pasta}>{pasta || 'lendo…'}</span>
          <div className="row">
            <button className="mk" onClick={async () => {
              const d = await window.vj?.pickDir?.(s.recDir || pasta);
              if (d) { s.set('recDir', d); s.save(); }
            }}>escolher pasta</button>
            <button className="mk" title="abre no explorador (pode abrir atrás da projeção)"
              onClick={() => window.vj?.reveal?.(rec.ultimos[0] || s.recDir || pasta)}>
              abrir pasta</button>
            {!!s.recDir && (
              <button className="mk" title="voltar para Vídeos/taller-vj"
                onClick={() => { s.set('recDir', ''); s.save(); }}>padrão</button>
            )}
          </div>

          <div className="tag">como gravar</div>
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
            arquivo, já com os efeitos. Gravar as duas gera <b>dois arquivos</b>
            (…-saida e …-controlador), nunca um mosaico. WebM sai na hora; MP4 é
            conversão depois de parar e demora.
          </p>
          {s.recModo !== 'out' && !!s.recAlvoCtrl && (
            <p className="nota alerta">
              Gravar o controlador dobra a carga da placa; em festa, prefira só a saída.
            </p>
          )}
          {!!rec.ultimos.length && (
            <p className="nota">último: {rec.ultimos.map(p => p.split(/[\\/]/).pop()).join(' · ')}</p>
          )}
          {!!nome(s.recAlvo) && <p className="nota">saída: {nome(s.recAlvo)}</p>}
        </div>
      )}
    </>
  );
}
