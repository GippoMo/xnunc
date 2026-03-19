@echo off
echo.
echo  xNunc.ai — Pubblicazione in corso...
echo  ─────────────────────────────────────
git add .
git commit -m "aggiornamento %date% %time%"
git push
echo.
echo  Fatto! Vercel aggiornerà il sito in 1-2 minuti.
echo  https://xnunc.ai
echo.
pause
