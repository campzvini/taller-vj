// ────────────────────────────────────────────
// TALLER VJ APP 1.1 — ControllerApp.tsx
// § - Three columns, a bar of seconds-decisions and stage mode · TSX
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { useSession } from '../../store';
import { onBus } from '../../out';
import { panic, pushAll, setFlash, toggleBlackout } from '../../actions';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useSync } from '../../hooks/useSync';
import Deck from './components/Deck';
import Cue from './components/Cue';
import Slots from './components/Slots';
import Mixer from './components/Mixer';
import Footer from './components/Footer';
import SearchStrip from './components/SearchStrip';
import ModPanel from './components/ModPanel';
import Scenes from './components/Scenes';
import RecPanel from './components/RecPanel';
import Settings from './components/Settings';
import Zona from './components/Zona';
import { startModulation, stopModulation } from '../../modulation';
import './controller.css';

/**
 * A barra superior guarda só decisões de SEGUNDOS: o que está no ar, o que apaga
 * tudo, o que grava. Formato, calibração e reprodução mudam uma vez antes de
 * começar — moram na configuração. Quem separa não é a importância, é a frequência.
 */
export default function ControllerApp() {
  const s = useSession();
  const [msg, setMsg] = useState<string | null>(null);
  const [cfg, setCfg] = useState(false);
  useKeyboard();
  useSync();

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    setFlash(m => { setMsg(m); clearTimeout(t); t = setTimeout(() => setMsg(null), 1600); });
    startModulation();
    // a saída pode nascer depois do controlador: quando ela anuncia, reenviamos tudo
    const off = onBus(m => { if ('t' in m && m.t === 'up') pushAll(); });
    return () => { off(); stopModulation(); };
  }, []);

  // o modo palco é uma classe no body: alcança a busca e o rodapé, fora do #main
  useEffect(() => { document.body.classList.toggle('palco', s.palco); }, [s.palco]);

  const rotas = s.mods.filter(m => m.on).length;
  const resumoMod = [
    rotas ? rotas + (rotas > 1 ? ' rotas' : ' rota') : '',
    s.audioOn ? 'ouvindo' : ''
  ].filter(Boolean).join(' · ');

  return (
    <>
      <div id="bar">
        <span className="name">TALLER VJ</span>
        <button className={s.outLive ? 'live' : ''} onClick={() => window.vj?.openOutput()}>
          {s.outLive ? 'SAÍDA NO AR' : 'ABRIR SAÍDA (O)'}
        </button>
        <div className="fsep" />
        {/* emergência: maiores que o resto, para acertar no escuro sem olhar */}
        <button className={'tgl urg' + (s.blackout ? ' on' : '')}
          onClick={toggleBlackout} title="apaga a saída (B)">BLACKOUT</button>
        <button className="urg" onClick={panic} title="zera todos os efeitos (P)">PANIC</button>
        <div className="fsep" />
        <RecPanel />
        <div className="fsep" />
        <button onClick={() => { s.set('searchOpen', !s.searchOpen); s.save(); }}>busca (/)</button>
        <button className={'palcob tgl' + (s.palco ? ' on' : '')}
          title="esconde tudo que é preparação e aumenta o que a mão toca (F9)"
          onClick={() => { s.set('palco', !s.palco); s.save(); }}>palco</button>
        <button onClick={() => setCfg(true)}>config</button>
        <div style={{ flex: 1 }} />
        {!s.outLive && <span className="tag treino">modo treino — sem saída</span>}
      </div>

      <SearchStrip />

      <div id="main">
        <Deck side="A" />
        <div className="col midcol">
          <Cue />
          <Slots />
          <Mixer />
          <Zona id="cenas" titulo="cenas" some
            resumo={s.cenas.length ? s.cenas.length + ' guardadas' : ''}>
            <Scenes />
          </Zona>
          <Zona id="mod" titulo="tempo e modulação" resumo={resumoMod}>
            <ModPanel />
          </Zona>
        </div>
        <Deck side="B" />
      </div>

      <Footer />
      {cfg && <Settings onClose={() => setCfg(false)} />}
      {msg && <div id="flash">{msg}</div>}
    </>
  );
}
