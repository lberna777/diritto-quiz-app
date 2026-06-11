import { getDb } from "./db";

export type Overview = {
  totalSessions: number;
  totalAnswers: number;
  totalCorrect: number;
  accuracy: number; // 0..1
  bestGrade: number | null;
  lastGrade: number | null;
  avgGrade: number | null;
};

export async function getOverview(subjectId: number): Promise<Overview> {
  const db = await getDb();
  const s = await db.select<
    { totalSessions: number; bestGrade: number | null; lastGrade: number | null; avgGrade: number | null }[]
  >(
    `SELECT
       COUNT(*) AS totalSessions,
       MAX(grade) AS bestGrade,
       (SELECT grade FROM quiz_sessions WHERE subject_id = ? AND finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1) AS lastGrade,
       AVG(grade) AS avgGrade
     FROM quiz_sessions WHERE subject_id = ? AND finished_at IS NOT NULL`,
    [subjectId, subjectId],
  );
  const a = await db.select<{ total: number; correct: number }[]>(
    `SELECT COUNT(*) AS total, SUM(qa.is_correct) AS correct
     FROM quiz_answers qa JOIN quiz_sessions qs ON qs.id = qa.session_id
     WHERE qs.subject_id = ?`,
    [subjectId],
  );
  const total = a[0]?.total ?? 0;
  const correct = a[0]?.correct ?? 0;
  return {
    totalSessions: s[0]?.totalSessions ?? 0,
    totalAnswers: total,
    totalCorrect: correct,
    accuracy: total ? correct / total : 0,
    bestGrade: s[0]?.bestGrade ?? null,
    lastGrade: s[0]?.lastGrade ?? null,
    avgGrade: s[0]?.avgGrade != null ? Math.round(s[0].avgGrade) : null,
  };
}

export type ModuleStat = {
  module_id: number;
  code: string;
  name: string;
  total: number;
  correct: number;
  accuracy: number; // 0..1, -1 se mai visto
};

export async function getModuleStats(subjectId: number): Promise<ModuleStat[]> {
  const db = await getDb();
  const rows = await db.select<
    { module_id: number; code: string; name: string; total: number; correct: number }[]
  >(
    `SELECT m.id AS module_id, m.code, m.name,
            COUNT(qa.id) AS total,
            COALESCE(SUM(qa.is_correct), 0) AS correct
     FROM modules m
     LEFT JOIN questions q ON q.module_id = m.id
     LEFT JOIN quiz_answers qa ON qa.question_id = q.id
     WHERE m.subject_id = ?
     GROUP BY m.id
     ORDER BY m.position ASC`,
    [subjectId],
  );
  return rows.map((r) => ({
    ...r,
    accuracy: r.total ? r.correct / r.total : -1,
  }));
}

export type GradePoint = { idx: number; date: string; grade: number };

export async function getGradeTrend(subjectId: number, limit = 20): Promise<GradePoint[]> {
  const db = await getDb();
  const rows = await db.select<{ finished_at: string; grade: number }[]>(
    `SELECT finished_at, grade FROM quiz_sessions
     WHERE subject_id = ? AND finished_at IS NOT NULL AND mode = 'exam'
     ORDER BY finished_at DESC LIMIT ?`,
    [subjectId, limit],
  );
  return rows
    .reverse()
    .map((r, i) => ({ idx: i + 1, date: r.finished_at.slice(0, 10), grade: r.grade }));
}

export type TrapRow = {
  question_id: number;
  text: string;
  code: string;
  wrong: number;
  seen: number;
};

/** Domande più sbagliate (trabocchetti ricorrenti). */
export async function getTraps(subjectId: number, limit = 8): Promise<TrapRow[]> {
  const db = await getDb();
  return db.select<TrapRow[]>(
    `SELECT q.id AS question_id, q.text, m.code,
            SUM(CASE WHEN qa.is_correct = 0 THEN 1 ELSE 0 END) AS wrong,
            COUNT(qa.id) AS seen
     FROM quiz_answers qa
     JOIN questions q ON q.id = qa.question_id
     JOIN modules m ON m.id = q.module_id
     WHERE q.subject_id = ?
     GROUP BY q.id
     HAVING wrong > 0
     ORDER BY wrong DESC, seen DESC
     LIMIT ?`,
    [subjectId, limit],
  );
}
