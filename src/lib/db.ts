import { isTauri } from "./env";
import type { WebDb } from "./webdb";

type Db = WebDb; // sottoinsieme di @tauri-apps/plugin-sql usato dall'app: select() + execute()

let _db: Db | null = null;

export async function getDb(): Promise<Db> {
  if (!_db) {
    if (isTauri()) {
      const { default: Database } = await import("@tauri-apps/plugin-sql");
      _db = (await Database.load("sqlite:diritto-quiz.db")) as unknown as Db;
    } else {
      const { createWebDb } = await import("./webdb");
      _db = await createWebDb();
    }
  }
  return _db;
}

export type Subject = {
  id: number;
  name: string;
  code: string;
  exam_n_questions: number;
  exam_points_correct: number;
  exam_points_wrong: number;
  exam_n_options: number;
  exam_timer_minutes: number;
  grade_scale_max: number;
  source_paths: string;
  is_active: number;
  created_at: string;
};

export type Module = {
  id: number;
  subject_id: number;
  code: string;
  name: string;
  weight: number;
  position: number;
};

export type Question = {
  id: number;
  subject_id: number;
  module_id: number;
  natural_key: string;
  text: string;
  explanation: string;
  difficulty: number;
  origin: string;
  status: string;
  source_ref: string;
  created_at: string;
};

export type Option = {
  id: number;
  question_id: number;
  text: string;
  is_correct: number;
  position: number;
};

export type QuizMode = "exam" | "topic" | "review";

export type RunQuestion = {
  id: number;
  module_id: number;
  moduleCode: string;
  text: string;
  explanation: string;
  options: { id: number; text: string; correct: boolean }[];
};

// --- settings helpers ---
export async function getSetting(key: string, fallback = ""): Promise<string> {
  const db = await getDb();
  const rows = await db.select<{ value: string }[]>(
    "SELECT value FROM app_settings WHERE key = ?",
    [key],
  );
  return rows.length ? rows[0].value : fallback;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value],
  );
}
