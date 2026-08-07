// ────────────────────────────────────────────
// TALLER VJ APP 0.8 — Settings.tsx
// § - Configuration: engine, sources, playback, shaders · TSX
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from '../../../store';
import { out } from '../../../out';
import { abrirSaida, checklist, fecharSaida, pushAll, setPattern, telaCheiaSaida } from '../../../actions';
import { exportSession, importSession } from '../../../session';
import { useClickOutside } from '../../../hooks/useClickOutside';
import { GLFX0 } from '../../../gl/renderer';
import type { Deck } from '../../../types';

const GLFX_LABEL: Record<keyof typeof GLFX0, string> = {
  invert: 'invert', hue: 'hue', pixel: 'pixelate', rgb: 'RGB split',
  melt: 'melt', glitch: 'glitch', feedback: 'feedback', kaleido: 'kaleidoscope'
};

export default function Settings({ onClose }: { onClose: () => void }) {
  const s = useSession();
  const [padrao, setPadrao] = useState('');
  const [telas, setTelas] = useState<{ id: number; rotulo: string }[]>([]);
  useEffect(() => { window.vj?.libDir?.().then(setPadrao).catch(() => { }); }, []);
  useEffect(() => { window.vj?.displays?.().then(setTelas).catch(() => { }); }, []);
  const box = useRef<HTMLDivElement>(null);
  const fechar = useCallback(() => onClose(), [onClose]);
  useClickOutside(true, fechar, [box]);

  const trocarEngine = (mode: 'dom' | 'gl') => {
    s.set('engine', mode); s.save(); out.engine(mode);
  };
  const setGlFx = (d: Deck, k: keyof typeof GLFX0, v: number) => {
    const next = { ...s.glfx[d], [k]: v };
    s.set('glfx', { ...s.glfx, [d]: next } as any);
    out.glfx(d, next);
  };

  return (
    <div className="modalbg">
      <div className="modal" ref={box}>
        <div className="row modalhd">
          <b>Settings</b><div style={{ flex: 1 }} />
          <button onClick={onClose}>close</button>
        </div>

        <div className="secao">
          <div className="tag">render engine</div>
          <div className="row">
            <button className={'tgl' + (s.engine === 'dom' ? ' on' : '')}
              onClick={() => trocarEngine('dom')}>DOM / CSS</button>
            <button className={'tgl' + (s.engine === 'gl' ? ' on' : '')}
              onClick={() => trocarEngine('gl')}>WebGL</button>
          </div>
          <p className="nota">WebGL applies to file and camera sources. YouTube decks stay on DOM.</p>
        </div>

        {s.engine === 'gl' && (['A', 'B'] as Deck[]).map(d => (
          <div className="secao" key={d}>
            <div className="tag">shaders — deck {d}</div>
            {(Object.keys(GLFX0) as (keyof typeof GLFX0)[]).map(k => (
              <div className="row" key={k}>
                <span className="tag w80">{GLFX_LABEL[k]}</span>
                <input type="range" min={0} max={100} value={Math.round(s.glfx[d][k] * 100)}
                  onChange={e => setGlFx(d, k, +e.target.value / 100)} />
                <span className="val">{Math.round(s.glfx[d][k] * 100)}</span>
              </div>
            ))}
            <div className="row">
              <button className="mk" onClick={() => {
                s.set('glfx', { ...s.glfx, [d]: { ...GLFX0 } } as any);
                out.glfx(d, { ...GLFX0 });
              }}>reset shaders {d}</button>
            </div>
          </div>
        ))}

        {/* A saída é uma janela como outra qualquer: quem decide onde ela mora é o
            operador. Com um monitor só, tela cheia automática esconderia a mesa. */}
        <div className="secao">
          <div className="tag">output window</div>
          <div className="row">
            <span className="tag w80">screen</span>
            <select value={s.outDisplay}
              onChange={e => { s.set('outDisplay', e.target.value); s.save(); window.vj?.outDisplay?.(e.target.value); }}>
              <option value="auto">auto — second screen if there is one</option>
              {telas.map(t => <option key={t.id} value={String(t.id)}>{t.rotulo}</option>)}
            </select>
          </div>
          <div className="row">
            <span className="tag w80">on open</span>
            <button className={'tgl' + (!s.outFull ? ' on' : '')}
              onClick={() => { s.set('outFull', false); s.save(); }}>window</button>
            <button className={'tgl' + (s.outFull ? ' on' : '')}
              onClick={() => { s.set('outFull', true); s.save(); }}>fullscreen</button>
          </div>
          <div className="row">
            <button onClick={abrirSaida}>open output</button>
            <button onClick={() => telaCheiaSaida()}>toggle fullscreen</button>
            <button className="mk" onClick={fecharSaida}>close output</button>
          </div>
          <p className="nota">
            F11 switches fullscreen on and off, Esc leaves it — from either window.
            Closing the output does not close the desk; the deck monitors get their sound back.
          </p>
        </div>

        {/* saiu da barra superior: se muda uma vez antes de começar, mora aqui */}
        <div className="secao">
          <div className="tag">frame &amp; calibration</div>
          <div className="row">
            <span className="tag w80">aspect</span>
            {['16/9', '4/3'].map(a => (
              <button key={a} className={'tgl' + (s.ar === a ? ' on' : '')}
                onClick={() => { s.set('ar', a); s.save(); out.frame(a); }}>{a.replace('/', ':')}</button>
            ))}
          </div>
          <div className="row">
            <span className="tag w80">test pattern</span>
            {[['grid', 'grid'], ['bars', 'bars'], ['focus', 'focus']].map(([k, t]) => (
              <button key={k} className={'tgl' + (s.pattern === k ? ' on' : '')}
                onClick={() => setPattern(k)}>{t}</button>
            ))}
          </div>
        </div>

        <div className="secao">
          <div className="tag">playback</div>
          <div className="row">
            <span className="tag w80">on end</span>
            <button className={'tgl' + (s.loop ? ' on' : '')}
              onClick={() => { const on = !s.loop; s.set('loop', on); s.save(); out.loop(on); }}>
              repeat (L)</button>
            <button className={'tgl' + (s.cc ? ' on' : '')}
              onClick={() => { const on = !s.cc; s.set('cc', on); s.save(); out.cc(on); }}>
              captions (K)</button>
          </div>
          <div className="row">
            <span className="tag w80">monitor quality</span>
            <select value={s.monQuality} onChange={e => { s.set('monQuality', e.target.value); s.save(); }}>
              <option value="small">low</option>
              <option value="medium">medium</option>
              <option value="default">auto</option>
            </select>
          </div>
          <div className="row">
            <span className="tag w80">sample pool</span>
            <input type="number" min={1} max={8} value={s.poolSize} style={{ width: 48 }}
              onChange={e => { s.set('poolSize', Math.max(1, Math.min(8, +e.target.value || 4))); s.save(); }} />
          </div>
        </div>

        <div className="secao">
          <div className="tag">library folder</div>
          <span className="nota caminho" title={s.libDir || padrao}>{s.libDir || padrao || '…'}</span>
          <div className="row">
            <button onClick={async () => {
              const d = await window.vj?.pickDir?.(s.libDir || padrao);
              if (d) { s.set('libDir', d); s.save(); }
            }}>choose folder</button>
            <button onClick={() => window.vj?.reveal?.(s.libDir || padrao)}>open folder</button>
            {!!s.libDir && (
              <button className="mk" onClick={() => { s.set('libDir', ''); s.save(); }}>default</button>
            )}
          </div>
          <p className="nota">Downloads land here, and the import dialogs open here.</p>
        </div>

        <div className="secao">
          <div className="tag">session</div>
          <div className="row">
            <button onClick={exportSession}>save session</button>
            <button onClick={() => importSession(pushAll)}>open session</button>
            <button onClick={checklist}>check setup</button>
          </div>
          <p className="nota">Session files never contain the API key.</p>
        </div>
      </div>
    </div>
  );
}
