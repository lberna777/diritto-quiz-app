import { getDb } from "./db";
import type { GenQuestion } from "./llm";

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

export type DraftQuestion = {
  id: number;
  module_id: number;
  moduleCode: string;
  text: string;
  explanation: string;
  difficulty: number;
  origin: string;
  source_ref: string;
  options: { id: number; text: string; correct: boolean }[];
};

/** Inserisce una domanda generata come bozza (status='draft'). Ritorna l'id o null se duplicata. */
export async function insertDraft(
  subjectId: number,
  moduleId: number,
  subjectCode: string,
  moduleCode: string,
  qn: GenQuestion,
  origin: string,
  verifyNote: string,
): Promise<number | null> {
  const db = await getDb();
  const nk = `${subjectCode}|${moduleCode}|${hash(qn.q)}`;
  const dup = await db.select<{ id: number }[]>(
    "SELECT id FROM questions WHERE natural_key = ?",
    [nk],
  );
  if (dup.length) return null;
  const res = await db.execute(
    `INSERT INTO questions
      (subject_id, module_id, natural_key, text, explanation, difficulty, origin, status, source_ref)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
    [subjectId, moduleId, nk, qn.q, qn.e, qn.d ?? 4, origin, verifyNote],
  );
  const qid = res.lastInsertId as number;
  for (let i = 0; i < qn.o.length; i++) {
    await db.execute(
      "INSERT INTO options (question_id, text, is_correct, position) VALUES (?, ?, ?, ?)",
      [qid, qn.o[i], i === 0 ? 1 : 0, i],
    );
  }
  return qid;
}

export async function listDrafts(subjectId: number): Promise<DraftQuestion[]> {
  const db = await getDb();
  const qs = await db.select<
    {
      id: number;
      module_id: number;
      moduleCode: string;
      text: string;
      explanation: string;
      difficulty: number;
      origin: string;
      source_ref: string;
    }[]
  >(
    `SELECT q.id, q.module_id, m.code AS moduleCode, q.text, q.explanation,
            q.difficulty, q.origin, q.source_ref
     FROM questions q JOIN modules m ON m.id = q.module_id
     WHERE q.subject_id = ? AND q.status = 'draft'
     ORDER BY q.created_at DESC`,
    [subjectId],
  );
  const out: DraftQuestion[] = [];
  for (const q of qs) {
    const opts = await db.select<{ id: number; text: string; is_correct: number }[]>(
      "SELECT id, text, is_correct FROM options WHERE question_id = ? ORDER BY position",
      [q.id],
    );
    out.push({
      ...q,
      options: opts.map((o) => ({ id: o.id, text: o.text, correct: o.is_correct === 1 })),
    });
  }
  return out;
}

export async function approveDraft(questionId: number): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE questions SET status = 'active' WHERE id = ?", [questionId]);
}

export async function rejectDraft(questionId: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM questions WHERE id = ?", [questionId]);
}

export async function countActive(subjectId: number): Promise<number> {
  const db = await getDb();
  const r = await db.select<{ c: number }[]>(
    "SELECT COUNT(*) AS c FROM questions WHERE subject_id = ? AND status = 'active'",
    [subjectId],
  );
  return r[0]?.c ?? 0;
}
