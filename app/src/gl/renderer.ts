// ────────────────────────────────────────────
// TALLER VJ APP 0.8 — renderer.ts
// § - WebGL layer for sources that expose pixels · TS
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────

/**
 * Motor opcional. O iframe do YouTube NÃO entra aqui — cross-origin, sem pixels —
 * então esta camada só atende fontes que expõem quadros (<video> de arquivo, câmera,
 * captura). A composição ENTRE camadas segue em CSS; o shader age dentro da camada.
 */
export type GlFx = {
  invert: number; hue: number; pixel: number; rgb: number;
  melt: number; glitch: number; feedback: number; kaleido: number;
};
export const GLFX0: GlFx = { invert: 0, hue: 0, pixel: 0, rgb: 0, melt: 0, glitch: 0, feedback: 0, kaleido: 0 };

const VERT = `attribute vec2 p; varying vec2 uv;
void main(){ uv = p*0.5+0.5; uv.y = 1.0-uv.y; gl_Position = vec4(p,0.0,1.0); }`;

const FRAG = `precision mediump float;
varying vec2 uv;
uniform sampler2D tex;      // quadro atual
uniform sampler2D prev;     // quadro anterior, para feedback
uniform vec2  res;
uniform float time;
uniform float uInvert, uHue, uPixel, uRgb, uMelt, uGlitch, uFeedback, uKaleido;

vec3 hueShift(vec3 c, float a){
  const vec3 k = vec3(0.57735);
  float ca = cos(a);
  return c*ca + cross(k,c)*sin(a) + k*dot(k,c)*(1.0-ca);
}

void main(){
  vec2 t = uv;

  // caleidoscópio: dobra o quadro em setores espelhados
  if(uKaleido > 0.01){
    vec2 c = t - 0.5;
    float ang = atan(c.y, c.x), rad = length(c);
    float n = mix(1.0, 8.0, uKaleido);
    ang = abs(mod(ang, 6.2831/n) - 3.1415/n);
    t = 0.5 + vec2(cos(ang), sin(ang)) * rad;
  }

  // deslocamento horizontal por faixas: o glitch com quadro inteiro preservado
  if(uGlitch > 0.01){
    float faixa = floor(t.y * 24.0);
    float r = fract(sin(faixa*91.17 + floor(time*12.0)) * 43758.5453);
    t.x += (r - 0.5) * 0.25 * uGlitch;
  }

  if(uPixel > 0.01){
    float n = mix(res.x, 12.0, uPixel);
    vec2 g = res / max(n, 8.0) * 0.5;
    t = floor(t * g) / g;
  }

  vec3 col;
  if(uRgb > 0.01){
    float d = 0.03 * uRgb;
    col = vec3(texture2D(tex, t + vec2(d,0.0)).r,
               texture2D(tex, t).g,
               texture2D(tex, t - vec2(d,0.0)).b);
  } else col = texture2D(tex, t).rgb;

  // "melt": média de 9 amostras, barata, com contraste puxado
  if(uMelt > 0.01){
    vec2 o = uMelt * 6.0 / res;
    vec3 s = vec3(0.0);
    for(int i=-1;i<=1;i++) for(int j=-1;j<=1;j++)
      s += texture2D(tex, t + vec2(float(i), float(j))*o).rgb;
    col = mix(col, s/9.0, 0.85);
    col = clamp((col - 0.5) * (1.0 + uMelt*2.0) + 0.5, 0.0, 1.0);
  }

  if(uHue > 0.001) col = hueShift(col, uHue * 6.2831);
  if(uInvert > 0.001) col = mix(col, 1.0 - col, uInvert);

  if(uFeedback > 0.01){
    vec2 z = (uv - 0.5) * (1.0 - 0.02*uFeedback) + 0.5;   // zoom lento realimentado
    col = mix(col, texture2D(prev, z).rgb, uFeedback * 0.85);
  }

  gl_FragColor = vec4(col, 1.0);
}`;

function compile(gl: WebGLRenderingContext, tipo: number, src: string) {
  const s = gl.createShader(tipo)!;
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
  return s;
}

export class GlLayer {
  canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private prog: WebGLProgram;
  private texVideo: WebGLTexture;
  private fbo: { fb: WebGLFramebuffer; tex: WebGLTexture }[] = [];
  private ping = 0;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private raf = 0;
  private src: HTMLVideoElement | null = null;
  fx: GlFx = { ...GLFX0 };
  ok = false;
  erro: string | null = null;
  onFalha: ((motivo: string) => void) | null = null;
  frames = 0;          // diagnóstico: quantos quadros já foram desenhados
  brilho = 0;          // média do quadro, amostrada do FBO (que persiste)

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false,
      preserveDrawingBuffer: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL indisponível');
    this.gl = gl;

    this.prog = gl.createProgram()!;
    gl.attachShader(this.prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(this.prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(this.prog);
    if (!gl.getProgramParameter(this.prog, gl.LINK_STATUS)) throw new Error('link falhou');
    gl.useProgram(this.prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const p = gl.getAttribLocation(this.prog, 'p');
    gl.enableVertexAttribArray(p);
    gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);

    ['tex', 'prev', 'res', 'time', 'uInvert', 'uHue', 'uPixel', 'uRgb', 'uMelt',
      'uGlitch', 'uFeedback', 'uKaleido'].forEach(n => {
        this.u[n] = gl.getUniformLocation(this.prog, n);
      });

    this.texVideo = this.novaTex();
    this.ok = true;
  }

  private novaTex() {
    const gl = this.gl, t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return t;
  }

  private garanteFbo(w: number, h: number) {
    const gl = this.gl;
    if (this.fbo.length && this.canvas.width === w && this.canvas.height === h) return;
    this.fbo.forEach(f => { gl.deleteFramebuffer(f.fb); gl.deleteTexture(f.tex); });
    this.fbo = [0, 1].map(() => {
      const tex = this.novaTex();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      const fb = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return { fb, tex };
    });
  }

  attach(video: HTMLVideoElement) { this.src = video; }

  start() {
    const gl = this.gl;
    const passo = () => {
      this.raf = requestAnimationFrame(passo);
      const v = this.src;
      if (!v || v.readyState < 2) return;

      const w = v.videoWidth || 1280, h = v.videoHeight || 720;
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.garanteFbo(w, h);
        this.canvas.width = w; this.canvas.height = h;
      } else this.garanteFbo(w, h);

      gl.bindTexture(gl.TEXTURE_2D, this.texVideo);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
      // fonte remota sem CORS (Archive é assim) contamina a tela: o shader não a
      // alcança. Em vez de piscar preto, a camada se declara incapaz e volta ao DOM.
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, v);
      } catch (e) {
        this.ok = false; this.erro = String((e as Error)?.name || e);
        this.stop(); this.onFalha?.(this.erro);
        return;
      }

      gl.useProgram(this.prog);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.texVideo);
      gl.uniform1i(this.u.tex, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.fbo[1 - this.ping].tex);
      gl.uniform1i(this.u.prev, 1);
      gl.uniform2f(this.u.res, w, h);
      gl.uniform1f(this.u.time, performance.now() / 1000);
      const f = this.fx;
      gl.uniform1f(this.u.uInvert, f.invert); gl.uniform1f(this.u.uHue, f.hue);
      gl.uniform1f(this.u.uPixel, f.pixel); gl.uniform1f(this.u.uRgb, f.rgb);
      gl.uniform1f(this.u.uMelt, f.melt); gl.uniform1f(this.u.uGlitch, f.glitch);
      gl.uniform1f(this.u.uFeedback, f.feedback); gl.uniform1f(this.u.uKaleido, f.kaleido);

      // desenha no FBO (guarda para o feedback) e depois na tela
      gl.viewport(0, 0, w, h);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo[this.ping].fb);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      this.frames++;

      // amostra barata a cada 30 quadros: o FBO guarda o resultado mesmo depois
      // que o buffer da tela é apresentado, então dá para conferir que há imagem
      if (this.frames % 30 === 0) {
        const px = new Uint8Array(4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo[this.ping].fb);
        gl.readPixels(w >> 1, h >> 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        this.brilho = (px[0] + px[1] + px[2]) / 3;
      }
      this.ping = 1 - this.ping;
    };
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(passo);
  }

  stop() { cancelAnimationFrame(this.raf); }

  dispose() {
    this.stop();
    const gl = this.gl;
    this.fbo.forEach(f => { gl.deleteFramebuffer(f.fb); gl.deleteTexture(f.tex); });
    gl.deleteTexture(this.texVideo);
    gl.deleteProgram(this.prog);
    this.ok = false;
  }
}
