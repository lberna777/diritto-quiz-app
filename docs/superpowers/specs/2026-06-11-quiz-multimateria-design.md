# Quiz Multi-Materia — Design

> Data: 2026-06-11 · Stato: approvato (brainstorming) · Prossimo passo: writing-plans

## 1. Obiettivo

App desktop installabile su Linux per il ripasso a quiz a risposta multipla, sul
modello dei quiz della patente. Funziona a **simulazioni d'esame realistiche** e a
**ripasso per argomento**, traccia gli errori e li ripropone con spaced repetition,
e conserva le statistiche di tutti i quiz.

Primo uso: esame **Diritto dell'Informatica T** (UniBo, 16/06/2026), che si svolge
con 22 quiz a risposta multipla scritti. Ma l'app nasce **multi-materia**: il nucleo
è generico (materie → moduli → domande → sessioni → SRS) e Diritto è solo il primo
contenuto caricato. Riutilizzabile per esami futuri creando una nuova materia.

Sostituisce l'attuale prototipo a file singolo
`~/UniCode/SIMULAZIONI ESAMI/DIRITTO/simulazione_diritto.html` (67 domande, nessuna
persistenza), rafforzandone tutte le funzioni.

## 2. Stack e collocazione

Stesso pattern di `~/Idee/accountability-app`:

- **Tauri 2** (Rust shell) + **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS 4**
- **SQLite** via `@tauri-apps/plugin-sql` con migrazioni numerate
- **zustand** (stato), **recharts** (grafici statistiche), **lucide-react** (icone),
  **react-router-dom** (routing)
- Bundle target: `.deb` + `.AppImage` (installabili su Linux)

Collocazione: **`~/Idee/diritto-quiz-app/`**
- `productName`: "Diritto Quiz T" (rinominabile in seguito a nome generico)
- `identifier`: `com.lorenzo.diritto-quiz`
- DB applicativo in `~/.config/com.lorenzo.diritto-quiz/` (come Accountability)

## 3. Modello dati (SQLite)

Nucleo generico, nessuna logica specifica per "diritto".

### `subjects` (materie)
| campo | tipo | note |
|---|---|---|
| id | INTEGER PK | |
| name | TEXT | es. "Diritto dell'Informatica T" |
| code | TEXT | slug breve, es. "diritto-info-t" |
| exam_n_questions | INTEGER | default per simulazione (Diritto: 22) |
| exam_points_per_correct | REAL | Diritto: 1.5 |
| exam_points_per_wrong | REAL | Diritto: 0 |
| exam_n_options | INTEGER | opzioni per domanda (Diritto: 3) |
| exam_timer_minutes | INTEGER | Diritto: 45 |
| grade_scale_max | INTEGER | scala voto (Diritto: 30) |
| source_paths | TEXT (JSON) | cartelle/file fonte per la generazione |
| is_active | INTEGER | materia selezionabile |
| created_at | TEXT | ISO |

### `modules`
| campo | tipo | note |
|---|---|---|
| id | INTEGER PK | |
| subject_id | INTEGER FK → subjects | |
| code | TEXT | es. "D1" (univoco per materia) |
| name | TEXT | es. "Concetti giuridici di base" |
| weight | REAL | peso per la distribuzione domande (temi pesanti) |
| position | INTEGER | ordinamento |

### `questions`
| campo | tipo | note |
|---|---|---|
| id | INTEGER PK | |
| subject_id | INTEGER FK → subjects | denormalizzato per query veloci |
| module_id | INTEGER FK → modules | |
| text | TEXT | testo domanda |
| explanation | TEXT | spiegazione mostrata dopo la risposta |
| difficulty | INTEGER | 1–5 |
| origin | TEXT | `curated` \| `grok` \| `ollama` \| `manual` |
| status | TEXT | `active` \| `draft` \| `archived` |
| source_ref | TEXT | file/sezione fonte (tracciabilità) |
| created_at | TEXT | ISO |

### `options`
| campo | tipo | note |
|---|---|---|
| id | INTEGER PK | |
| question_id | INTEGER FK → questions | |
| text | TEXT | |
| is_correct | INTEGER | esattamente una per domanda |
| position | INTEGER | ordine canonico (mescolato a runtime) |

### `quiz_sessions`
| campo | tipo | note |
|---|---|---|
| id | INTEGER PK | |
| subject_id | INTEGER FK | |
| mode | TEXT | `exam` \| `topic` \| `review` |
| started_at / finished_at | TEXT | ISO |
| total_questions | INTEGER | |
| n_correct / n_wrong | INTEGER | |
| score_points | REAL | |
| grade | INTEGER | voto su scala materia (es. /30) |
| duration_sec | INTEGER | |
| timer_used | INTEGER | |

### `quiz_answers` (log granulare)
| campo | tipo | note |
|---|---|---|
| id | INTEGER PK | |
| session_id | INTEGER FK → quiz_sessions | |
| question_id | INTEGER FK → questions | |
| chosen_option_id | INTEGER FK → options | NULL se tempo scaduto |
| is_correct | INTEGER | |
| time_spent_sec | INTEGER | |
| answered_at | TEXT | ISO |

Alimenta: accuratezza per modulo, trend, e i "trabocchetti ricorrenti"
(opzioni sbagliate scelte più spesso).

### `srs_state` (Leitner per domanda)
| campo | tipo | note |
|---|---|---|
| question_id | INTEGER PK FK → questions | |
| box | INTEGER | 1–5 |
| due_at | TEXT | ISO, quando torna in ripasso |
| last_reviewed_at | TEXT | |
| n_seen / n_correct / n_wrong | INTEGER | |

### `llm_providers`
Chiavi API e configurazione provider (Grok/Ollama), come migrazione 003 di
Accountability: `id, name, api_key, base_url, model, is_default`.

## 4. Generazione e verifica del pool (build-time)

Contenuto iniziale prodotto **prima** dal lavoro di curatela (non a runtime):
**180–220 domande** per Diritto, distribuite sui 13 moduli D1–D13, pesate sui temi
pesanti d'esame (D8 privacy/GDPR, D12 AI Act, D11 reati informatici, D9 firme).

Incrocio di 5 livelli di fonte per modulo (tutte già presenti in `~/UniCode`):

| Fonte | Path | Ruolo |
|---|---|---|
| Speed review | `RIPASSO DIRITTO/speedreview_D0X_*.md` | formulazioni della prof → domande core |
| Glossario | `glossario_diritto.md` | definizioni → domande definitorie |
| Appunti completi | `claudeAppunti/APPUNTI DIRITTO/appunti_moduloDX_*.md` | sfumature → distrattori plausibili |
| Appunti grezzi | `APPUNTI GREZZI/Diritto/Appunti_moduloDX.md` | dubbi lasciati → domande mirate sui punti deboli |
| Tabelle comparative | `RIPASSO DIRITTO/tabelle_comparative.md` | distinzioni cross-modulo (trabocchetti) |

Ogni domanda: 3 opzioni (1 corretta), distrattori = parafrasi plausibili,
spiegazione, difficoltà 1–5, `source_ref`.

**Loop di verifica** (durante la curatela):
1. Per ogni domanda, riverifica la risposta corretta contro il file-fonte citato.
2. Scarta o segnala le domande dove la fonte è ambigua/contraddittoria.
3. Mantiene la difficoltà alta: niente domande banali, distrattori non eliminabili
   a colpo d'occhio.

Output: `seed/seed_questions.json` (materia + moduli + domande + opzioni),
importato in SQLite al primo avvio (DB vuoto).

## 5. Generazione in-app (Grok primario, Ollama fallback)

Per ampliare il pool nel tempo, senza dipendere dalla curatela manuale.

- **Provider**: Grok (xAI API) primario — più affidabile sul diritto italiano di un
  modello locale; Ollama come fallback offline. Chiavi in `llm_providers`.
- **Flusso "Genera domande"**: scegli materia + modulo + quantità → chiamata al
  provider con il testo-fonte del modulo nel prompt → ritorna candidate.
- **Verifica automatica**: seconda chiamata che valida ogni candidata contro la
  fonte (la risposta marcata è corretta? i distrattori sono errati?). Le candidate
  che non passano vengono scartate o segnalate.
- **Gate umano**: le candidate entrano come `status='draft'`. Schermata
  **"Approva domande"**: approva / modifica / scarta. Solo l'approvazione le porta
  a `status='active'`.
- **Invariante**: nessuna domanda generata entra nel pool live senza passare per
  verifica automatica **e** approvazione umana.

## 6. Schermate / modalità

Tutte filtrano sulla **materia attiva** (selettore in alto).

1. **Dashboard** — riepilogo statistiche, streak, moduli più deboli, accessi rapidi.
2. **Simulazione esame** — N domande random (default materia: 22 per Diritto),
   timer (45min), punteggio (1,5pt giusta / 0 errata), voto su scala materia (/30),
   feedback immediato opzionale. Porting fedele del comportamento attuale, persistito.
3. **Ripasso per argomento** — scegli uno o più moduli + numero domande.
4. **Ripassa errori (SRS)** — serve le domande con `due_at` scaduto.
5. **Statistiche** — accuratezza per modulo nel tempo (recharts), trend voto,
   numero quiz, trabocchetti ricorrenti.
6. **Genera / Approva domande** — generazione (Grok/Ollama) + coda di revisione.
7. **Impostazioni** — chiavi API/provider, default timer, gestione materie
   (**Nuova materia**: nome, parametri esame, cartelle-fonte).

## 7. Spaced repetition (Leitner)

5 box. Una domanda risposta in **qualunque** modalità aggiorna il suo `srs_state`:
- **Errata** → box 1, `due_at` ravvicinato.
- **Corretta** → promozione di box, `due_at` più lontano.
- Intervalli per box (indicativi): box1 ≈ 1g · box2 ≈ 3g · box3 ≈ 7g ·
  box4 ≈ 16g · box5 ≈ >30g.

La modalità "Ripassa errori" pesca solo le domande `due`, ordinate per scadenza.

## 8. Scoring

- Punti: `exam_points_per_correct` per risposta giusta, `exam_points_per_wrong`
  per errata (Diritto: 1,5 / 0).
- Voto: `round(n_correct / total * grade_scale_max)` (Diritto: /30).
- Simulazione esame: numero domande e timer dai parametri della materia.

## 9. Test e qualità

- **Vitest** per la logica pura: scoring, scheduling Leitner (avanzamento box e
  calcolo `due_at`), selezione random e distribuzione per modulo, mescolamento
  opzioni con preservazione del flag corretto.
- **Script di validazione del seed**: per ogni domanda esattamente 1 opzione
  corretta, modulo valido ed esistente, spiegazione e testo non vuoti, difficoltà
  in [1,5]. Eseguito in CI/pre-import.

## 10. Decomposizione e fasi (per il piano)

Due blocchi principali, in un unico spec ma fasati nel piano d'implementazione:

- **(A) App** — scaffold Tauri, migrazioni, modello dati, le 7 schermate, SRS,
  scoring, statistiche, generazione in-app. (Codice.)
- **(B) Contenuto** — curatela e verifica delle 180–220 domande Diritto dal
  materiale `~/UniCode`. (Contenuto; è il percorso più lungo.)

Ordine consigliato: nucleo dati + simulazione esame su un seed minimo → SRS e
ripasso → statistiche → generazione in-app → curatela completa del pool.

## 11. Fuori scope (YAGNI per v1)

- Sync cloud / multi-dispositivo.
- Account utente / multi-utente.
- Modalità mobile dedicata.
- Import automatico da PDF della prof (le fonti sono già in markdown).
- Materie diverse da Diritto al primo rilascio (il motore le supporta, ma se ne
  carica una sola).
