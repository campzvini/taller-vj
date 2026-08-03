# Changelog

## 1.0.0 — 2026-08-03

First packaged release. The browser page became a desktop instrument.

**Sources.** Internet Archive alongside YouTube, with filters that work on an empty search
box (collection, year range, sort by downloads, only with MP4). Local files and folders.
One library serving both decks instead of two separate lists. Archive items download with
one button and **replace the stream live**, at the second they were playing.

**Playing.** Cue player that never reaches the output, with IN/OUT marks and clip export.
Crossfader with inertia and three curves, blend modes, per-deck framing (pan, rotate,
mirror, crop), automatic fade, blackout, calibration patterns. Sample pool on `0`–`9`
accepting any source. Audio bed with playlist, loop or sequential, and a volume crossfade
between tracks.

**Processing.** CSS effects on three buses, plus an optional WebGL engine with real
shaders for local files. Audio capture from the system with routes from bands, beat and
LFOs into any parameter; tap tempo and BPM. Text overlay on the projection.

**Working.** Scenes on `F1`–`F8` storing the mix and never the content. Window recording —
output, controller, or both as two files — with system sound and a chosen folder. Sessions
saved and reopened as JSON, without the API key.

**The desk itself.** Own title bar, no system menu, stage mode on `F9`, collapsible zones,
a browse column for digging, and every performance control reachable by key.

**Identity.** Babel VJ: icon, symbol set, Âmbar de Laboratório palette, Ubuntu embedded.

**Packaging.** Windows installer and portable build. ffmpeg and ffprobe unpacked from the
asar so they actually run; the selftest also writes `%TEMP%/taller-vj-selftest.json`,
because a packaged app has no stdout to read.

**Retired.** The HTML version moved to `legacy/` and is frozen.

### Known limits

- The installer is not code-signed; SmartScreen will warn.
- Windows only so far.
- Some Internet Archive items advertise an MP4 with no playable derivative.
- Effects on YouTube decks are CSS, not frame processing — the iframe is cross-origin.
- Deck monitors are a second copy kept aligned by seeking, so they drift slightly.
