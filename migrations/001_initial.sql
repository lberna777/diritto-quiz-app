-- Quiz multi-materia — schema iniziale
PRAGMA foreign_keys = ON;

CREATE TABLE subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  exam_n_questions INTEGER NOT NULL DEFAULT 22,
  exam_points_correct REAL NOT NULL DEFAULT 1.5,
  exam_points_wrong REAL NOT NULL DEFAULT 0,
  exam_n_options INTEGER NOT NULL DEFAULT 3,
  exam_timer_minutes INTEGER NOT NULL DEFAULT 45,
  grade_scale_max INTEGER NOT NULL DEFAULT 30,
  source_paths TEXT NOT NULL DEFAULT '[]',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE modules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0,
  UNIQUE(subject_id, code)
);

CREATE TABLE questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  natural_key TEXT NOT NULL UNIQUE,
  text TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  difficulty INTEGER NOT NULL DEFAULT 3,
  origin TEXT NOT NULL DEFAULT 'curated',
  status TEXT NOT NULL DEFAULT 'active',
  source_ref TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE quiz_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT,
  total_questions INTEGER NOT NULL DEFAULT 0,
  n_correct INTEGER NOT NULL DEFAULT 0,
  n_wrong INTEGER NOT NULL DEFAULT 0,
  score_points REAL NOT NULL DEFAULT 0,
  grade INTEGER,
  duration_sec INTEGER NOT NULL DEFAULT 0,
  timer_used INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE quiz_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  chosen_option_id INTEGER REFERENCES options(id),
  is_correct INTEGER NOT NULL DEFAULT 0,
  time_spent_sec INTEGER NOT NULL DEFAULT 0,
  answered_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE srs_state (
  question_id INTEGER PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  box INTEGER NOT NULL DEFAULT 1,
  due_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_reviewed_at TEXT,
  n_seen INTEGER NOT NULL DEFAULT 0,
  n_correct INTEGER NOT NULL DEFAULT 0,
  n_wrong INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX idx_questions_subject ON questions(subject_id, status);
CREATE INDEX idx_questions_module ON questions(module_id);
CREATE INDEX idx_options_q ON options(question_id);
CREATE INDEX idx_answers_session ON quiz_answers(session_id);
CREATE INDEX idx_answers_q ON quiz_answers(question_id);
CREATE INDEX idx_sessions_subject ON quiz_sessions(subject_id);
CREATE INDEX idx_srs_due ON srs_state(due_at);
