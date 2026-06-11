# Diritto Quiz T

App desktop (Linux) di ripasso a quiz a risposta multipla, sul modello dei quiz
della patente: simulazioni d'esame realistiche, ripasso per argomento, tracciamento
errori con spaced repetition (Leitner) e statistiche di tutti i quiz.

Nasce **multi-materia**: il nucleo è generico (materie → moduli → domande → sessioni
→ SRS). Primo contenuto caricato: **Diritto dell'Informatica T** (UniBo).

## Stack

Tauri 2 · React 19 · TypeScript · Vite · Tailwind CSS 4 · SQLite (`@tauri-apps/plugin-sql`)
· zustand · recharts · lucide-react.

## Stato

v0.1 funzionante. Pool iniziale: **155 domande** verificate su 13 moduli (Diritto
dell'Informatica T). Design:
[`docs/superpowers/specs/2026-06-11-quiz-multimateria-design.md`](docs/superpowers/specs/2026-06-11-quiz-multimateria-design.md).

### Build & avvio

```bash
npm install
npm run tauri dev      # sviluppo
npm run tauri build    # genera .deb e .AppImage in src-tauri/target/release/bundle/
npm test               # test della logica (scoring, Leitner)
```

Installazione: `sudo dpkg -i "src-tauri/target/release/bundle/deb/Diritto Quiz T_0.1.0_amd64.deb"`
oppure esegui l'AppImage. I dati restano in `~/.config/com.lorenzo.diritto-quiz/`.

## Funzioni principali

- **Simulazione esame** — N domande random, timer, punteggio e voto su scala materia.
- **Ripasso per argomento** — selezione moduli + numero domande.
- **Ripassa errori (SRS)** — Leitner a 5 box, ripropone le domande dovute.
- **Statistiche** — accuratezza per modulo, trend voto, trabocchetti ricorrenti.
- **Genera / Approva domande** — generazione assistita (Grok/Ollama) con verifica
  automatica contro la fonte e approvazione umana prima di entrare nel pool.
