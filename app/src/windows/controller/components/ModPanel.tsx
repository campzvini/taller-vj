// ────────────────────────────────────────────
// TALLER VJ APP 0.7 — ModPanel.tsx
// § - Tempo, system audio and modulation routes · TSX
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { useSession } from '../../../store';
import { audio, listarFontes, startAudio, stopAudio, tap, type Fonte } from '../../../audio';
import { DEST_LABEL, SRC_LABEL, novoMod, type Dest, type Src } from '../../../modulation';
import { flashMsg } from '../../../actions';

export default function ModPanel() {
  const s = useSession();
  const [, forca] = useState(0);
  const [fontes, setFontes] = useState<Fonte[]>([]);

  // medidores e BPM detectado vivem fora do React; puxamos num ritmo suave
  useEffect(() => {
    const t = setInterval(() => forca(x => x + 1), 120);
    listarFontes().then(setFontes);
    return () => clearInterval(t);
  }, []);

  const ligarAudio = async () => {
    if (s.audioOn) { await stopAudio(); s.set('audioOn', false); return; }
    const ok = await startAudio(s.audioFonte);
    s.set('audioOn', ok);
    if (!ok) flashMsg('sem áudio: ' + (audio.erro || 'fonte indisponível'));
  };

  const trocarFonte = async (id: string) => {
    s.set('audioFonte', id); s.save();
    if (s.audioOn) {
      const ok = await startAudio(id);
      s.set('audioOn', ok);
      if (!ok) flashMsg('sem áudio: ' + (audio.erro || 'fonte indisponível'));
    }
  };

  const bpm = s.bpmManual || audio.bpm;
  const barra = (v: number) => ({ width: Math.min(100, v * 140) + '%' });

  return (
    <div className="card">
      <div className="row">
        <span className="tag">som</span>
        <select value={s.audioFonte} onChange={e => trocarFonte(e.target.value)}
          style={{ maxWidth: 168 }} title="de onde vem o áudio analisado">
          {fontes.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
        <button className={'tgl' + (s.audioOn ? ' on' : '')} onClick={ligarAudio}>
          {s.audioOn ? 'ouvindo' : 'ouvir'}</button>
        <button onClick={() => { const v = tap(); s.set('bpmManual', v); }}>tap</button>
        <span className="val">{bpm ? bpm + ' bpm' : '—'}</span>
        {!!s.bpmManual && <button className="mk" onClick={() => s.set('bpmManual', 0)}>auto</button>}
      </div>

      {s.audioOn && (
        <div className="meters">
          <div className="meter"><i style={barra(audio.bands.low)} /></div>
          <div className="meter mid"><i style={barra(audio.bands.mid)} /></div>
          <div className="meter high"><i style={barra(audio.bands.high)} /></div>
          <span className={'beat' + (audio.beat ? ' on' : '')} />
        </div>
      )}

      <div className="row">
        <span className="tag">modulação</span>
        <button className="mk" onClick={() => { s.set('mods', [...s.mods, novoMod()]); s.save(); }}>+ rota</button>
      </div>

      {s.mods.map((m, i) => (
        <div className="row modrow" key={m.id}>
          <button className={'mk' + (m.on ? ' on' : '')}
            onClick={() => {
              const mods = [...s.mods]; mods[i] = { ...m, on: !m.on };
              s.set('mods', mods); s.save();
            }}>{m.on ? '●' : '○'}</button>
          <select value={m.src} onChange={e => {
            const mods = [...s.mods]; mods[i] = { ...m, src: e.target.value as Src };
            s.set('mods', mods); s.save();
          }}>
            {Object.entries(SRC_LABEL).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
          </select>
          <span className="tag">→</span>
          <select value={m.dest} onChange={e => {
            const mods = [...s.mods]; mods[i] = { ...m, dest: e.target.value as Dest };
            s.set('mods', mods); s.save();
          }}>
            {Object.entries(DEST_LABEL).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
          </select>
          <input type="range" min={-100} max={100} value={m.amount} style={{ maxWidth: 60 }}
            onChange={e => {
              const mods = [...s.mods]; mods[i] = { ...m, amount: +e.target.value };
              s.set('mods', mods); s.save();
            }} />
          <span className="val">{m.amount}</span>
          {['sine', 'tri', 'saw', 'rand'].includes(m.src) && (
            <>
              <input type="number" min={1} max={32} value={m.compassos} style={{ width: 38 }}
                title="batidas por ciclo"
                onChange={e => {
                  const mods = [...s.mods]; mods[i] = { ...m, compassos: +e.target.value || 1 };
                  s.set('mods', mods); s.save();
                }} />
              <span className="tag">bat</span>
            </>
          )}
          <button className="mk" onClick={() => {
            s.set('mods', s.mods.filter(x => x.id !== m.id)); s.save();
          }}>×</button>
        </div>
      ))}
    </div>
  );
}
