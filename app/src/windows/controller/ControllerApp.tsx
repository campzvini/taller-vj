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
import Slots, { DockPicker } from './components/Slots';
import Browser from './components/Browser';
import Mixer from './components/Mixer';
import Footer from './components/Footer';
import SearchStrip from './components/SearchStrip';
import ModPanel from './components/ModPanel';
import Scenes from './components/Scenes';
import RecPanel from './components/RecPanel';
import Settings from './components/Settings';
import Zona from './components/Zona';
import { startModulation, stopModulation } from '../../modulation';
import { startSlotsBus, stopSlotsBus } from '../../slotsbus';
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
    startSlotsBus();     // a janela de slots só pinta o que sai daqui
    // a saída pode nascer depois do controlador: quando ela anuncia, reenviamos tudo
    const off = onBus(m => { if ('t' in m && m.t === 'up') pushAll(); });
    return () => { off(); stopModulation(); stopSlotsBus(); };
  }, []);

  // os três monitores seguem a proporção escolhida para a saída, e entre si
  useEffect(() => { document.documentElement.style.setProperty('--ar', s.ar); }, [s.ar]);

  // o modo palco é uma classe no body: alcança a busca e o rodapé, fora do #main
  useEffect(() => { document.body.classList.toggle('palco', s.palco); }, [s.palco]);

  const rotas = s.mods.filter(m => m.on).length;
  const resumoMod = [
    rotas ? rotas + (rotas > 1 ? ' routes' : ' route') : '',
    s.audioOn ? 'listening' : ''
  ].filter(Boolean).join(' · ');

  return (
    <>
      <div id="bar">
        <span className="name">TALLER VJ</span>
        <button className={s.outLive ? 'live' : ''} onClick={() => window.vj?.openOutput()}>
          {s.outLive ? 'OUTPUT LIVE' : 'OPEN OUTPUT (O)'}
        </button>
        <div className="fsep" />
        {/* emergência: maiores que o resto, para acertar no escuro sem olhar */}
        <button className={'tgl urg' + (s.blackout ? ' on' : '')}
          onClick={toggleBlackout} title="black out the output (B)">BLACKOUT</button>
        <button className="urg" onClick={panic} title="clear all effects (P)">PANIC</button>
        <div className="fsep" />
        <RecPanel />
        <div className="fsep" />
        <button onClick={() => { s.set('searchOpen', !s.searchOpen); s.save(); }}>search (/)</button>
        <button className={'tgl' + (s.browserOpen ? ' on' : '')}
          title="deep search column: filters, duration, details"
          onClick={() => { s.set('browserOpen', !s.browserOpen); s.save(); }}>browse</button>
        <button className={'palcob tgl' + (s.palco ? ' on' : '')}
          title="hide preparation panels, enlarge performance controls (F9)"
          onClick={() => { s.set('palco', !s.palco); s.save(); }}>stage</button>
        <button onClick={() => setCfg(true)}>settings</button>
        <div style={{ flex: 1 }} />
        {!s.outLive && <span className="tag treino">no output</span>}
      </div>

      <SearchStrip />

      <div id="main" className={s.browserOpen ? 'combrowser' : ''}>
        {s.browserOpen && <Browser />}
        <Deck side="A" doca={s.slotsDock === 'A' ? <Slots /> : null} />
        {/* o cue fica parado como os decks; a rolagem começa nos samples */}
        <div className="col midcol">
          <Cue />
          <div className="midscroll">
            {s.slotsDock === 'mid' || s.slotsDock === 'window' ? <Slots /> : null}
            <DockPicker />
            <Mixer />
            <Zona id="cenas" titulo="scenes" some
              resumo={s.cenas.length ? s.cenas.length + ' saved' : ''}>
              <Scenes />
            </Zona>
            <Zona id="mod" titulo="tempo &amp; modulation" resumo={resumoMod}>
              <ModPanel />
            </Zona>
          </div>
        </div>
        <Deck side="B" doca={s.slotsDock === 'B' ? <Slots /> : null} />
      </div>

      <Footer />
      {cfg && <Settings onClose={() => setCfg(false)} />}
      {msg && <div id="flash">{msg}</div>}
    </>
  );
}
