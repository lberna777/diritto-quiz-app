import { getDb, type RunQuestion, type Subject } from "./db";

export function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export function fmtPts(n: number): string {
  return n.toFixed(1).replace(".", ",");
}

export function grade(nCorrect: number, total: number, scaleMax: number): number {
  if (total === 0) return 0;
  return Math.round((nCorrect / total) * scaleMax);
}

/** Load a full RunQuestion (text + shuffled options) for a set of question ids. */
export async function loadRunQuestions(ids: number[]): Promise<RunQuestion[]> {
  if (ids.length === 0) return [];
  const db = await getDb();
  const ph = ids.map(() => "?").join(",");
  const qs = await db.select<
    { id: number; module_id: number; moduleCode: string; text: string; explanation: string }[]
  >(
    `SELECT q.id, q.module_id, m.code AS moduleCode, q.text, q.explanation
     FROM questions q JOIN modules m ON m.id = q.module_id
     WHERE q.id IN (${ph})`,
    ids,
  );
  const opts = await db.select<
    { id: number; question_id: number; text: string; is_correct: number }[]
  >(
    `SELECT id, question_id, text, is_correct FROM options WHERE question_id IN (${ph})`,
    ids,
  );
  const byQ = new Map<number, RunQuestion>();
  for (const q of qs) {
    byQ.set(q.id, {
      id: q.id,
      module_id: q.module_id,
      moduleCode: q.moduleCode,
      text: q.text,
      explanation: q.explanation,
      options: [],
    });
  }
  for (const o of opts) {
    byQ.get(o.question_id)?.options.push({
      id: o.id,
      text: o.text,
      correct: o.is_correct === 1,
    });
  }
  // preserve requested id order, shuffle option order
  const out: RunQuestion[] = [];
  for (const id of ids) {
    const rq = byQ.get(id);
    if (rq) {
      rq.options = shuffle(rq.options);
      out.push(rq);
    }
  }
  return out;
}

/**
 * Pick N active question ids for a subject, optionally limited to modules.
 * Anti-ripetizione: priorità alle domande mai viste, poi alle meno recenti,
 * con casualità a parità (così l'ordine cambia ma non rivede sempre le stesse).
 */
export async function pickQuestionIds(
  subjectId: number,
  n: number,
  moduleIds?: number[],
): Promise<number[]> {
  const db = await getDb();
  let sql = `
    SELECT q.id
    FROM questions q
    LEFT JOIN (
      SELECT question_id, MAX(answered_at) AS last_seen, COUNT(*) AS seen
      FROM quiz_answers GROUP BY question_id
    ) a ON a.question_id = q.id
    WHERE q.subject_id = ? AND q.status = 'active'`;
  const params: (number | string)[] = [subjectId];
  if (moduleIds && moduleIds.length) {
    sql += ` AND q.module_id IN (${moduleIds.map(() => "?").join(",")})`;
    params.push(...moduleIds);
  }
  // mai viste prima (last_seen NULL), poi viste meno di recente, random a parità
  sql += ` ORDER BY (a.last_seen IS NOT NULL), a.last_seen ASC, RANDOM() LIMIT ?`;
  params.push(n);
  const rows = await db.select<{ id: number }[]>(sql, params);
  // mescola il set estratto così l'ordine in-quiz non è sempre lo stesso
  return shuffle(rows.map((r) => r.id));
}

export type SessionResult = {
  sessionId: number;
};

/** Create a quiz session row, return its id. */
export async function createSession(
  subjectId: number,
  mode: string,
  timerUsed: boolean,
): Promise<number> {
  const db = await getDb();
  const res = await db.execute(
    `INSERT INTO quiz_sessions (subject_id, mode, timer_used) VALUES (?, ?, ?)`,
    [subjectId, mode, timerUsed ? 1 : 0],
  );
  return res.lastInsertId as number;
}

export async function recordAnswer(
  sessionId: number,
  questionId: number,
  chosenOptionId: number | null,
  isCorrect: boolean,
  timeSpentSec: number,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO quiz_answers (session_id, question_id, chosen_option_id, is_correct, time_spent_sec)
     VALUES (?, ?, ?, ?, ?)`,
    [sessionId, questionId, chosenOptionId, isCorrect ? 1 : 0, timeSpentSec],
  );
}

export async function finishSession(
  sessionId: number,
  subject: Subject,
  total: number,
  nCorrect: number,
  nWrong: number,
  durationSec: number,
): Promise<void> {
  const db = await getDb();
  const points =
    nCorrect * subject.exam_points_correct + nWrong * subject.exam_points_wrong;
  const g = grade(nCorrect, total, subject.grade_scale_max);
  await db.execute(
    `UPDATE quiz_sessions
     SET finished_at = datetime('now'), total_questions = ?, n_correct = ?, n_wrong = ?,
         score_points = ?, grade = ?, duration_sec = ?
     WHERE id = ?`,
    [total, nCorrect, nWrong, points, g, durationSec, sessionId],
  );
}
