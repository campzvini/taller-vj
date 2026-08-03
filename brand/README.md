# Marca — babel vj, um software Taller

Tudo aqui nasce dos arquivos de marca do Taller (`04_ExpLab/08_Designe/logo`).
O SVG é o mestre; os PNG são exportações e podem ser refeitos a qualquer momento.

## Nome

**babel vj** — a Biblioteca de Babel do Borges: o app trata YouTube e Internet Archive
como um acervo grande demais para caber numa cabeça só. O sobrenome continua sendo o
Taller: assinatura em toda peça é *um software Taller*.

O código ainda se chama `taller-vj`. A troca de nome no produto (títulos de janela,
nome dos arquivos gravados) **não foi feita** de propósito: a gravação encontra as
janelas pelo título (`/taller.*(output|saída)/i`), então renomear sem tocar nisso
quebraria o recurso. É uma tarefa própria, não um efeito colateral.

## Cores — Âmbar de Laboratório

| uso | hex |
|---|---|
| fundo / tinta | `#24211E` |
| âmbar (acento) | `#B66A2C` |
| areia (apoio, texto secundário) | `#D7C2A3` |
| creme (papel, texto principal) | `#F7F2EA` |

A interface da mesa mantém a paleta escura própria (`controller.css`, § 0): tela de
trabalho no escuro não é lugar para papel creme. O âmbar é o que costura as duas.

## Tipografia

**Ubuntu**, embutida no app em `app/src/assets/fonts` (cópia única — não duplicar aqui),
carregada por `@font-face` em `controller.css` e `output.css`. Redistribuída sob a
Ubuntu Font Licence 1.0, cujo texto viaja junto em `UFL-1.0.txt`.
Regular 400 para corpo, Medium 500 para rótulos, Bold 700 para títulos e para a
palavra-marca. Vem embutida para a mesa ser igual em qualquer máquina.

## Ícone

`app-icon.svg` — uma torre em degraus (a biblioteca, Babel) coroada por um *play*.
Lê-se aos 32 px porque são quatro formas cheias e um triângulo, sem contorno fino.
Exportado em `png/icon-{16..1024}.png` e `icon.ico`; a janela do app usa o de 256.

## Símbolos

`symbols.svg` — grade de 96, traço 8, ponta redonda, mesmo peso do desenho da marca.
Transporte, direção, mesa e acervo. Creme é estado neutro; **âmbar marca o que é
destrutivo, ativo ou irreversível** (gravar, baixar, blackout, mudo, cena).
A última linha é a marca do Taller usada como cursor.

## Refazer as exportações

O rasterizador vive no scratchpad da sessão (`render.js`, Chromium do próprio
Electron do projeto). Limite conhecido do Windows: a janela é cortada na altura da
tela, então nenhuma peça é desenhada acima de ~1000 px — as artes verticais são
compostas depois pelo ffmpeg.
