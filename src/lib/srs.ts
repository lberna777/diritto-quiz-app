import { getDb } from "./db";

// Leitner: giorni fino alla prossima comparsa per box (1..5).
// Box 1 (errore appena fatto) = 0 giorni -> ripassabile SUBITO.
export const BOX_INTERVAL_DAYS = [0, 0, 1, 3, 7, 16]; // index = box (1..5)

export function nextBox(currentBox: number, correct: boolean): number {
  if (!correct) return 1;
  return Math.min(5, currentBox + 1);
}

/**
 * Aggiorna lo stato SRS dopo una risposta.
 * Solo gli ERRORI entrano nel sistema di ripasso: una domanda risposta
 * correttamente al primo colpo (mai sbagliata) non viene tracciata.
 * Quando una domanda già in ripasso viene azzeccata, sale di box (torna più tardi).
 */
export async function updateSrs(questionId: number, correct: boolean): Promise<void> {
  const db = await getDb();
  const rows = await db.select<{ box: number }[]>(
    "SELECT box FROM srs_state WHERE question_id = ?",
    [questionId],
  );
  const existing = rows.length > 0;
  // corretta e non ancora nel sistema => non è un errore, non tracciare
  if (correct && !existing) return;
  // nuova (= sbagliata) -> box 1; altrimenti avanza se corretta, azzera se sbagliata
  const finalBox = existing ? nextBox(rows[0].box, correct) : 1;
  const days = BOX_INTERVAL_DAYS[finalBox] ?? 0;
  await db.execute(
    `INSERT INTO srs_state (question_id, box, due_at, last_reviewed_at, n_seen, n_correct, n_wrong)
     VALUES (?, ?, datetime('now', '+' || ? || ' days'), datetime('now'), 1, ?, ?)
     ON CONFLICT(question_id) DO UPDATE SET
       box = ?,
       due_at = datetime('now', '+' || ? || ' days'),
       last_reviewed_at = datetime('now'),
       n_seen = n_seen + 1,
       n_correct = n_correct + ?,
       n_wrong = n_wrong + ?`,
    [
      questionId,
      finalBox,
      days,
      correct ? 1 : 0,
      correct ? 0 : 1,
      finalBox,
      days,
      correct ? 1 : 0,
      correct ? 0 : 1,
    ],
  );
}

/** Numero di domande "due" (da ripassare) per una materia. */
export async function dueCount(subjectId: number): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ c: number }[]>(
    `SELECT COUNT(*) AS c
     FROM srs_state s JOIN questions q ON q.id = s.question_id
     WHERE q.subject_id = ? AND q.status = 'active' AND s.due_at <= datetime('now')`,
    [subjectId],
  );
  return rows[0]?.c ?? 0;
}

/** Id delle domande da ripassare (due), priorità ai box bassi (errori recenti). */
export async function pickDueIds(subjectId: number, limit: number): Promise<number[]> {
  const db = await getDb();
  const rows = await db.select<{ id: number }[]>(
    `SELECT q.id
     FROM srs_state s JOIN questions q ON q.id = s.question_id
     WHERE q.subject_id = ? AND q.status = 'active' AND s.due_at <= datetime('now')
     ORDER BY s.box ASC, s.due_at ASC
     LIMIT ?`,
    [subjectId, limit],
  );
  return rows.map((r) => r.id);
}
