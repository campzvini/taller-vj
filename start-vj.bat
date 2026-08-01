@echo off
rem ── TALLER TOYS 0.1 — start-vj.bat ──
rem § - Serves youtube-vj.html over http (YouTube embeds refuse file://) · Batch
cd /d "%~dp0"
start "" http://localhost:8787/youtube-vj.html
python -m http.server 8787
