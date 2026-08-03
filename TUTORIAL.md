# Babel VJ — the walkthrough

This is the long version: everything the desk does, in the order you are likely to need
it. Read it once with the app open beside you; after that the keys do the talking.

Conventions here: **bold** is something you click, `code` is something you press.

---

## 1. The two windows

Babel VJ is a **controller** and an **output**. The controller is where you work: search,
library, three players, mixer, samples, footer. The output is the picture — the only thing
the room sees.

The output does not open by itself. Press `O` or click **OPEN OUTPUT**. With two screens
it goes fullscreen on the second one immediately; with one screen it opens as a window you
can drag and resize. The top-right corner says `NO OUTPUT` until it exists, so you always
know whether anything is live.

Closing the controller closes everything. Closing the output leaves the desk running —
useful when you want to rehearse without projecting.

> **Rehearsing without an output:** with no output window, the deck monitors become the
> source *with sound*, so you can prepare a whole set on one screen.

## 2. Getting video in

There are three doors, and they all end in the same place.

**Paste.** Press `/` to open the search strip, paste a YouTube URL or an 11-character ID,
press `Enter`. Free, instant, no key. A URL containing `list=` loads a whole playlist.

**Search.** Same strip, with a key saved (see the README). Type words instead of a URL.
The dropdown next to the box switches the source between **YouTube** and **Archive**.
Sort order and length filter sit beside it, and **no vertical** discards phone-shaped
videos — the ones that ruin a 16:9 projection. Results that refuse embedding are dropped
before you ever see them.

**The browse column.** `Ctrl+F` opens a taller column on the left, for digging rather than
grabbing: big thumbnails, duration stamped on the corner, channel, year, view count. On
Archive it adds collection, sort by downloads, a year range and *only with MP4*. **Archive
search works with no title at all** — set a collection and a decade and let it show you
what is there. That is the point of the thing.

**Your disk.** In either library, **files** picks videos, **folder** takes a whole tree
(up to 200 files). Both dialogs open at your library folder, set in **settings → library
folder**.

Whatever the door, the item lands in **one library**, shown beside both decks. There is no
"deck A library" and "deck B library" any more — the deck is chosen when you throw it.

## 3. The cue: look before the room does

The middle player is the **cue**. It is wired to nothing. Click any result or library item
and it loads there, and you can watch it, scrub it, listen on **PHONES**, and decide.

When you find the moment:

- `[` sends it to **deck A**, `]` to **deck B** — *from the point you were watching*.
- **→A** and **B←** do the same with the mouse.
- **+library** keeps it, **+bed** sends it to the audio playlist.
- **mirror** flips the cue into a monitor of the live output instead, so the middle column
  becomes "what the room sees" when you want to check the mix.

`IN` and `OUT` mark a section. With both set, the deck loops that section instead of the
whole video. On a deck holding a **local file**, the **✂** button cuts the marked section
into a new file — a night of digging becomes a folder of usable material.

The **⤓** button downloads the current remote item. Progress shows in the button itself;
when it finishes, the file replaces the stream **everywhere it is referenced, live** — if
it is on air, it reloads at the exact second it was at and keeps playing, now from disk.

## 4. Playing and mixing

Each deck has a play/pause, a timeline, `IN`/`OUT`, a loop toggle, opacity, zoom, volume
and **framing** (pan, rotate, mirror, crop the edges). `Tab` switches which deck is
*armed*; `Space` plays or pauses that one. The **arm** button does it with the mouse.

The **crossfader** is the middle of everything. `←` and `→` move it in steps, `Home` and
`End` cut hard to A or B. **SMOOTH** adds inertia so a jerky hand still lands soft, and
the curve selector chooses how the middle behaves: *linear*, *smooth*, or *cut*. **auto
fade (G)** runs a timed crossfade on its own — set the seconds beside it.

**BLEND** decides how the two decks meet: normal, screen, difference, multiply and the
rest. Difference on two moving images is where most of the good accidents happen.

## 5. Effects

Three buses: `Z` deck A, `X` deck B, `C` master (the already-mixed picture). The selected
bus is what the effect keys act on:

`Q` glitch · `W` invert · `E` melt · `R` hue · `T` strobe

Each bus has its own amount slider. `P` — **PANIC** — drops every effect on every bus at
once. It is in the top bar in large type for the same reason a fire alarm is red.

In **settings → render engine**, WebGL replaces the CSS chain for local files and gives
you real shaders: pixelate, RGB split, kaleidoscope, feedback, plus the same melt, hue,
glitch and invert done properly. YouTube decks stay on DOM — their pixels are unreadable,
which is a rule of the browser, not a limitation of the app. Remote Archive sources fall
back to DOM by themselves because archive.org sends no CORS header.

## 6. Samples

The **SAMPLES 0–9** grid holds short things loaded and paused, ready to appear the instant
you ask. `Shift`+click a pad (or `Shift`+the digit) assigns whatever is selected. Then
**hold** `0`–`9`: the sample appears over the mix while the key is down and disappears when
you let go. It is a momentary key, like a drum pad, not a toggle.

The pads have their own blend, fade and zoom, and a **sound** switch — most of the time
you want them silent over the music, sometimes you want the bark of the sample itself.

Samples take YouTube, Archive and local files. The pool size is set in settings.

## 7. The audio bed

Along the footer, **BED C** is an audio-only player with its own playlist. Drop tracks into
it, press `Shift+Space` (or `V`, or the button) and it plays underneath everything.

The **⟲** button toggles *loop* (one track repeating) against *sequential* (a playlist that
advances). **XFADE** sets how many seconds two tracks overlap in volume when one ends, so
the set never cuts dry. **list** opens the playlist.

The footer also carries the audio routing — **follow video** or a fixed choice — and the A
and B levels, because sound belongs on one plane and not scattered through the desk.

## 8. Making the picture listen

Open the **tempo & modulation** zone.

Pick an audio source: the system output (loopback — whatever is playing on the machine) or
an input. Then create a **route**: a source (a frequency band, the beat, an LFO) pointed at
a parameter (opacity, zoom, an effect amount, anything with a slider).

Two modes: **scale** makes the parameter pulse between zero and where you left the control;
**sum** adds on top of it. Turning a route off returns the parameter to the control value,
so nothing is left stuck at a random number.

A modulated control **changes colour and moves on its own** — you can see what is being
driven without remembering. Tap tempo, detected BPM, and four LFO shapes (sine, triangle,
saw, random) are in the same zone.

## 9. Scenes

`F1`–`F8` recall a scene. `Shift`+the same key records the current mix over it. The **+
save mix** button and the scene list do the same with the mouse, and **MORPH** sets how
many seconds the transition takes.

A scene stores the **mix and never the content**: fader, opacity, zoom, framing, effects,
shaders, sample settings. Calling `F3` in the middle of a track does not change what is
playing — it changes how it looks. That is what makes scenes usable live instead of
terrifying.

Continuous values interpolate over the morph time; switches land at the start.

## 10. Recording

The **● REC** button records. The **▾** beside it opens the options, and it opens whether
or not you have ever recorded:

- **what to capture**: the output window, the controller window, or **both** — which
  produces two separate files, one of the picture and one of your hands.
- **which windows**: found by title automatically, with manual selection and a **rescan
  windows** button.
- **where**: any folder, remembered between sessions. **open folder** works before the
  first recording exists.
- **bitrate**: 4 to 30 Mb/s.

It captures the *window*, not an internal composition — so YouTube, effects, shaders and
text all land in the file exactly as the room saw them, with system sound. While recording,
the button pulses red and shows a clock. **convert to MP4** turns the recording over to
ffmpeg when you stop; WebM is what has been tested most.

## 11. Text on the projection

The text panel puts a line over the picture: fixed, scrolling, or blinking, with size,
colour, position and an outline so it survives a bright frame underneath.

## 12. Sessions

**settings → session** saves everything — library, slots, scenes, routes, mixer state — to
a JSON file, and opens it back. The API key is never written into it, so a session file is
safe to copy between machines or hand to someone else.

Two things live outside the session: your **library folder** and the **recording folder**,
which are machine settings, not performance state.

## 13. Stage mode

`F9`. Preparation disappears — search, library, browse — and what you play with grows:
crossfader, samples, effects. Press it again to get the desk back. Use it once the set is
loaded and you are done choosing.

## 14. When something is wrong

**A deck stays black and silent.** Almost always a blocked embed. In-app search filters
those out; a pasted URL does not. Try another video.

**An Archive item will not play.** Some items declare an MP4 that has no real derivative
behind it. Nothing to do from here — pick another, or download it and see.

**Archive stutters.** It streams from a single datacentre. Press **⤓** and let it become a
local file; it will swap live without stopping the image.

**The projection flashes or tears in WebGL.** Switch back to DOM in settings. WebGL is
worth it for local files and shaders, not for a room full of YouTube.

**Keys stopped working.** Click anywhere outside a text field. Text fields swallow keys on
purpose — sliders do not, they release focus so the desk keeps answering.

**Something went very wrong on screen.** `B` blacks out the output, `P` drops every effect.
In that order.

---

Taller Laboratório Fotoquímico · 2026
