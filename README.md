# Tetris — pezzaliAPP (PWA)

Tetris classico come **Progressive Web App**: offline, installabile, giocabile da browser su **iPhone/iPad/Android/PC/Mac**.

## 🎯 Funzionalità
- Griglia 10×20, **7‑bag** random, **ghost piece**, **hold (C)**, soft/hard drop
- Rotazioni Z/X (stile SRS semplificato), livelli e punteggio
- **Pausa (P)** e **Restart (R)**
- **Controlli touch** per mobile
- **Offline‑ready** con Service Worker, **installabile** con manifest

## ⌨️ Comandi
- ◀︎/▶︎ muovi • ▼ soft drop • **Space** hard drop
- **Z/X** ruota • **C** hold • **P** pausa • **R** restart

## 📱 iPhone/iPad
- Aggiungi alla Home: **Condividi → Aggiungi a Home** (Safari)
- A schermo intero in modalità standalone. Niente cloud: cache locale.
- Se aggiorni i file, fai **hard refresh** (chiudi l’app, riapri con rete) o incrementa la costante `CACHE` nel `service-worker.js`.

## 🚀 Deploy su GitHub Pages
1. Crea una repo e carica i file in root (oppure in `/docs`).
2. **Settings → Pages → Deploy from branch**.
3. Apri l’URL della pagina. Al primo caricamento parte la cache offline.

## 🔁 Aggiornamenti
- Modifica `const CACHE = 'tetris-pwa-vX'` in `service-worker.js` quando pubblichi una nuova versione.

## 📄 Licenza
MIT — © 2025 pezzaliAPP
