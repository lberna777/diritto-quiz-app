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

In progettazione. Design approvato:
[`docs/superpowers/specs/2026-06-11-quiz-multimateria-design.md`](docs/superpowers/specs/2026-06-11-quiz-multimateria-design.md).

## Funzioni principali

- **Simulazione esame** — N domande random, timer, punteggio e voto su scala materia.
- **Ripasso per argomento** — selezione moduli + numero domande.
- **Ripassa errori (SRS)** — Leitner a 5 box, ripropone le domande dovute.
- **Statistiche** — accuratezza per modulo, trend voto, trabocchetti ricorrenti.
- **Genera / Approva domande** — generazione assistita (Grok/Ollama) con verifica
  automatica contro la fonte e approvazione umana prima di entrare nel pool.
