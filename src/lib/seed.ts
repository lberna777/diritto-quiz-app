import { getDb } from "./db";
import seedData from "../seed/seed_diritto.json";

type SeedQuestion = {
  m: string; // module code
  q: string; // text
  o: string[]; // options, first is correct
  e: string; // explanation
  d?: number; // difficulty
  src?: string; // source ref
};

type SeedFile = {
  subject: {
    name: string;
    code: string;
    exam_n_questions: number;
    exam_points_correct: number;
    exam_points_wrong: number;
    exam_n_options: number;
    exam_timer_minutes: number;
    grade_scale_max: number;
    source_paths: string[];
  };
  modules: { code: string; name: string; weight?: number }[];
  questions: SeedQuestion[];
};

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

/**
 * Importa/sincronizza il seed in modo idempotente.
 * - crea la materia se manca (per code)
 * - crea i moduli mancanti (per subject+code)
 * - inserisce le domande mancanti (per natural_key), con le opzioni
 * Le domande già presenti non vengono toccate (le modifiche utente restano).
 */
export async function ensureSeed(): Promise<void> {
  const db = await getDb();
  const data = seedData as SeedFile;

  // --- subject ---
  let subjRows = await db.select<{ id: number }[]>(
    "SELECT id FROM subjects WHERE code = ?",
    [data.subject.code],
  );
  let subjectId: number;
  if (subjRows.length) {
    subjectId = subjRows[0].id;
  } else {
    const res = await db.execute(
      `INSERT INTO subjects
        (name, code, exam_n_questions, exam_points_correct, exam_points_wrong,
         exam_n_options, exam_timer_minutes, grade_scale_max, source_paths)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.subject.name,
        data.subject.code,
        data.subject.exam_n_questions,
        data.subject.exam_points_correct,
        data.subject.exam_points_wrong,
        data.subject.exam_n_options,
        data.subject.exam_timer_minutes,
        data.subject.grade_scale_max,
        JSON.stringify(data.subject.source_paths),
      ],
    );
    subjectId = res.lastInsertId as number;
  }

  // --- modules ---
  const moduleId = new Map<string, number>();
  for (let i = 0; i < data.modules.length; i++) {
    const m = data.modules[i];
    const rows = await db.select<{ id: number }[]>(
      "SELECT id FROM modules WHERE subject_id = ? AND code = ?",
      [subjectId, m.code],
    );
    if (rows.length) {
      moduleId.set(m.code, rows[0].id);
    } else {
      const res = await db.execute(
        "INSERT INTO modules (subject_id, code, name, weight, position) VALUES (?, ?, ?, ?, ?)",
        [subjectId, m.code, m.name, m.weight ?? 1, i],
      );
      moduleId.set(m.code, res.lastInsertId as number);
    }
  }

  // --- questions ---
  // chiavi già presenti
  const existing = await db.select<{ natural_key: string }[]>(
    "SELECT natural_key FROM questions WHERE subject_id = ?",
    [subjectId],
  );
  const have = new Set(existing.map((r) => r.natural_key));

  for (const sq of data.questions) {
    const mid = moduleId.get(sq.m);
    if (!mid) continue; // modulo sconosciuto: salta
    const nk = `${data.subject.code}|${sq.m}|${hash(sq.q)}`;
    if (have.has(nk)) continue;
    const res = await db.execute(
      `INSERT INTO questions
        (subject_id, module_id, natural_key, text, explanation, difficulty, origin, status, source_ref)
       VALUES (?, ?, ?, ?, ?, ?, 'curated', 'active', ?)`,
      [subjectId, mid, nk, sq.q, sq.e, sq.d ?? 3, sq.src ?? ""],
    );
    const qid = res.lastInsertId as number;
    // opzioni: la prima è corretta, posizione = ordine di seed
    for (let i = 0; i < sq.o.length; i++) {
      await db.execute(
        "INSERT INTO options (question_id, text, is_correct, position) VALUES (?, ?, ?, ?)",
        [qid, sq.o[i], i === 0 ? 1 : 0, i],
      );
    }
    have.add(nk);
  }
}
