# Legacy — version 0

The original Babel VJ (then *Taller VJ*): one HTML page plus an output page, served over
`python -m http.server` and driven from a browser. It is here for the record only.

**Frozen.** No fixes, no features, no back-ports. It is not a reference for how the app
behaves — the app is. If something here disagrees with `app/`, the app is right.

To run it anyway:

```bash
python -m http.server 8787
```

Then open <http://localhost:8787/legacy/youtube-vj.html> and press `O` for the output
window. It must be served over HTTP; YouTube embeds refuse `file://`.

What the app gained and this never had: local files and folders, the Internet Archive with
download, WebGL shaders, window recording, scenes, an audio bed with crossfade, audio
modulation, text on the projection, sessions on disk, and an installer.
